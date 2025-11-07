"""
BULK-GPT Modal Processor
========================

Handles batch processing of CSV rows through Google Gemini API.
Designed for Supabase integration with 24-hour timeout support.

Deployment: modal deploy main.py
"""

import modal
import json
import os
from typing import List, Dict, Any
import time
from fastapi import FastAPI, Request
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception,
    before_sleep_log,
)
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Modal app
app = modal.App("bulk-gpt-processor-mvp")

# Define image with dependencies
image = modal.Image.debian_slim().pip_install(
    "google-generativeai>=0.8.5",
    "supabase>=2.0.0",
    "python-dotenv>=1.0.0",
    "fastapi[standard]>=0.115.0",
    "tenacity>=8.2.0",  # For retry logic with exponential backoff
    "requests>=2.31.0",  # For webhook HTTP calls
)

# Create FastAPI app for HTTP endpoints
web_app = FastAPI()

# Gemini system prompt for consistent, high-quality output
SYSTEM_PROMPT = """You are a specialized AI assistant for bulk data processing.

Your role:
- Process each row of data according to the user's instructions
- Use web search when you need current information or verification
- Return structured, consistent outputs
- Be precise and follow the exact output schema provided

Guidelines:
- If you need to verify information, use web search
- Keep responses concise and focused on the task
- Always return valid JSON matching the output schema
- If uncertain, indicate this in your response rather than guessing

Remember: You're processing data in bulk, so consistency and accuracy are critical.
"""


def is_retryable_error(exception: Exception) -> bool:
    """
    Determine if an exception is retryable (rate limits, timeouts, transient errors).
    
    Args:
        exception: The exception to check
    
    Returns:
        True if the exception should trigger a retry, False otherwise
    """
    error_str = str(exception).lower()
    
    # Retry on rate limit errors (429)
    if '429' in error_str or 'rate limit' in error_str or 'quota' in error_str:
        return True
    
    # Retry on timeout errors
    if 'timeout' in error_str or 'timed out' in error_str:
        return True
    
    # Retry on temporary network errors
    if 'connection' in error_str or 'network' in error_str:
        return True
    
    # Retry on 500-level server errors
    if '500' in error_str or '502' in error_str or '503' in error_str or '504' in error_str:
        return True
    
    return False


@retry(
    retry=retry_if_exception(is_retryable_error),
    stop=stop_after_attempt(3),  # Max 3 attempts
    wait=wait_exponential(multiplier=2, min=4, max=60),  # 4s, 8s, 16s, ...
    before_sleep=before_sleep_log(logger, logging.INFO),
    reraise=True,
)
def call_gemini_with_retry(model, prompt: str) -> Dict[str, Any]:
    """
    Call Gemini API with automatic retry on transient failures.

    Implements exponential backoff:
    - Attempt 1: Immediate
    - Attempt 2: Wait 4s
    - Attempt 3: Wait 8s

    Args:
        model: Gemini GenerativeModel instance
        prompt: The prompt to send to Gemini

    Returns:
        Dict with:
        - text: The generated text response
        - input_tokens: Number of prompt tokens consumed
        - output_tokens: Number of output tokens generated
        - model: Model name used

    Raises:
        Exception: If all retry attempts fail
    """
    response = model.generate_content(prompt)

    # Check if response is valid and not blocked by safety filters
    if not response:
        raise ValueError("No response generated from Gemini API")

    # Check if response has valid candidates (not blocked by safety filters)
    if not response.candidates or len(response.candidates) == 0:
        raise ValueError("Response blocked by Gemini safety filters (no candidates)")

    # Check if response has valid parts with text
    if not hasattr(response.candidates[0], 'content') or not response.candidates[0].content.parts:
        finish_reason = getattr(response.candidates[0], 'finish_reason', 'unknown')
        raise ValueError(f"Response has no valid text parts (finish_reason: {finish_reason})")

    # Extract token usage from response metadata
    input_tokens = 0
    output_tokens = 0
    if hasattr(response, 'usage_metadata') and response.usage_metadata:
        input_tokens = getattr(response.usage_metadata, 'prompt_token_count', 0)
        output_tokens = getattr(response.usage_metadata, 'candidates_token_count', 0)

    return {
        "text": response.text,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "model": model.model_name,
    }


def fire_webhook(webhook_url: str, payload: Dict[str, Any]) -> bool:
    """
    Fire webhook with batch completion data.

    Args:
        webhook_url: URL to POST results to (n8n, Zapier, etc.)
        payload: Batch summary data

    Returns:
        True if webhook fired successfully, False otherwise
    """
    import requests

    try:
        response = requests.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10,  # 10 second timeout
        )
        response.raise_for_status()
        print(f"[{payload.get('batch_id')}] Webhook fired successfully: {webhook_url}")
        return True
    except Exception as e:
        print(f"[{payload.get('batch_id')}] Webhook failed: {e}")
        return False


def _process_single_row(
    batch_id: str,
    row: Dict[str, str],
    row_index: int,
    prompt: str,
    context: str,
    output_schema: List[str],
    gemini_api_key: str,
    supabase_url: str,
    supabase_key: str,
) -> Dict[str, Any]:
    """
    Process a single CSV row through Gemini API.
    
    This is a pure function that processes one row independently.
    It's designed to be called in parallel via Modal's .starmap().
    
    Args:
        batch_id: Unique identifier for the batch
        row: CSV row as dictionary
        row_index: Index of this row in the batch
        prompt: Template prompt with {{column}} placeholders
        context: Additional context for the task
        output_schema: Expected output columns/format
        gemini_api_key: Gemini API key
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
    
    Returns:
        Dict with row_id, output, status, and optional error
    """
    import google.generativeai as genai
    from supabase import create_client
    
    # Generate unique row ID (always use batch_id prefix to avoid collisions)
    row_id = f"{batch_id}-row-{row_index}"
    
    # Initialize clients (Modal handles connection pooling)
    genai.configure(api_key=gemini_api_key)
    supabase = create_client(supabase_url, supabase_key)
    
    try:
        # Replace template variables in prompt
        final_prompt = prompt
        for key, value in row.items():
            if key != "id" and value:
                placeholder = f"{{{{{key}}}}}"
                final_prompt = final_prompt.replace(placeholder, str(value))
        
        # Add context if provided
        if context:
            final_prompt = f"Context: {context}\n\n{final_prompt}"
        
        # Build strict JSON schema if output_schema is provided
        generation_config = {}
        if output_schema:
            # Extract column names from output_schema (list of dicts with 'name' key)
            schema_names = [col.get('name', str(col)) if isinstance(col, dict) else str(col) for col in output_schema]

            # Build JSON schema with response_schema for Gemini 2.5
            # This enforces exact field names in the AI response
            schema_properties = {
                name: {"type": "string", "description": f"Generated content for {name}"}
                for name in schema_names
            }

            response_schema = {
                "type": "object",
                "properties": schema_properties,
                "required": schema_names
            }

            # Configure Gemini to output JSON with strict schema
            generation_config = {
                "response_mime_type": "application/json",
                "response_schema": response_schema
            }

        # Call Gemini API with automatic retry
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT,
            generation_config=generation_config if generation_config else None,
        )

        # Use retry wrapper for resilient API calls
        gemini_result = call_gemini_with_retry(model, final_prompt)
        output = gemini_result["text"]
        input_tokens = gemini_result["input_tokens"]
        output_tokens = gemini_result["output_tokens"]
        model_name = gemini_result["model"]
        status = "success"
        error_msg = None

    except Exception as api_error:
        output = ""
        input_tokens = 0
        output_tokens = 0
        model_name = "gemini-2.5-flash"
        status = "error"
        error_msg = str(api_error)
        print(f"[{batch_id}] Error on row {row_index + 1}: {error_msg}")

    # Insert result into database with token tracking
    try:
        supabase.table("batch_results").insert(
            {
                "id": row_id,
                "batch_id": batch_id,
                "input_data": json.dumps(row),
                "output_data": output,
                "row_index": row_index,
                "status": status,
                "error_message": error_msg,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "model": model_name,
            }
        ).execute()
    except Exception as db_error:
        print(f"[{batch_id}] Warning: Could not insert result {row_id}: {db_error}")

    return {
        "id": row_id,
        "output": output,
        "status": status,
        "error": error_msg,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "model": model_name,
    }


@app.function(
    image=image,
    timeout=3600,  # 1 hour per row (generous for API calls)
    memory=1024,  # 1GB per worker
    secrets=[modal.Secret.from_name("bulk-gpt-env")],
)
def process_row(
    batch_id: str,
    row: Dict[str, str],
    row_index: int,
    prompt: str,
    context: str,
    output_schema: List[str],
) -> Dict[str, Any]:
    """
    Modal function to process a single row in parallel.
    
    This function is called via .starmap() to enable parallel processing.
    Each invocation runs in its own container.
    
    Args:
        batch_id: Unique identifier for the batch
        row: CSV row as dictionary
        row_index: Index of this row in the batch
        prompt: Template prompt with {{column}} placeholders
        context: Additional context for the task
        output_schema: Expected output columns/format
    
    Returns:
        Dict with row_id, output, status, and optional error
    """
    # Get environment variables from Modal secret
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not all([gemini_api_key, supabase_url, supabase_key]):
        return {
            "id": f"{batch_id}-row-{row_index}",
            "output": "",
            "status": "error",
            "error": "Missing required environment variables",
        }
    
    # Call the pure processing function
    return _process_single_row(
        batch_id=batch_id,
        row=row,
        row_index=row_index,
        prompt=prompt,
        context=context,
        output_schema=output_schema,
        gemini_api_key=gemini_api_key,
        supabase_url=supabase_url,
        supabase_key=supabase_key,
    )


def _process_batch_internal(
    batch_id: str,
    rows: List[Dict[str, str]],
    prompt: str,
    context: str = "",
    output_schema: List[str] = None,
    webhook_url: str = None,
) -> Dict[str, Any]:
    """
    Internal function to orchestrate parallel batch processing.

    Args:
        batch_id: Unique identifier for this batch
        rows: List of CSV rows as dictionaries
        prompt: Template prompt with {{column}} placeholders
        context: Additional context for the task
        output_schema: Expected output columns/format
        webhook_url: Optional webhook URL to POST results to when complete

    Returns:
        Dict with processing results and statistics
    """
    from supabase import create_client
    
    # Get Supabase credentials for batch status updates
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not all([supabase_url, supabase_key]):
        raise ValueError("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
    
    # Create Supabase client for orchestrator
    try:
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Supabase client: {str(e)}")
    
    # Initialize tracking
    start_time = time.time()
    
    print(f"[{batch_id}] Starting parallel batch processing with {len(rows)} rows")
    
    # Mark batch as processing (batch must be pre-created by Next.js API)
    try:
        supabase.table("batches").update(
            {"status": "processing", "updated_at": "now()"}
        ).eq("id", batch_id).execute()
    except Exception as e:
        print(f"[{batch_id}] Warning: Could not update batch status: {e}")
    
    # Process all rows in parallel using Modal's .starmap()
    try:
        results = list(process_row.starmap([
            (batch_id, row, idx, prompt, context or "", output_schema or [])
            for idx, row in enumerate(rows)
        ]))
    except Exception as parallel_error:
        print(f"[{batch_id}] Error during parallel processing: {parallel_error}")
        results = []
    
    # Calculate statistics
    successful_count = sum(1 for r in results if r.get("status") == "success")
    error_count = sum(1 for r in results if r.get("status") == "error")
    total_time = time.time() - start_time
    avg_time_per_row = total_time / len(rows) if rows else 0
    
    # Update batch as completed
    completion_status = "completed" if error_count == 0 else "completed_with_errors"
    try:
        supabase.table("batches").update(
            {
                "status": completion_status,
                "processed_rows": successful_count,
                "updated_at": "now()",
            }
        ).eq("id", batch_id).execute()
    except Exception as e:
        print(f"[{batch_id}] Warning: Could not finalize batch: {e}")
    
    # Summary
    summary = {
        "batch_id": batch_id,
        "total_rows": len(rows),
        "successful": successful_count,
        "failed": error_count,
        "processing_time_seconds": round(total_time, 2),
        "avg_time_per_row": round(avg_time_per_row, 3),
        "status": completion_status,
        "results": results,
    }
    
    print(
        f"[{batch_id}] Batch complete: {successful_count} success, "
        f"{error_count} errors in {total_time:.1f}s (parallel processing)"
    )

    # Fire webhook if configured
    if webhook_url:
        fire_webhook(webhook_url, summary)

    return summary


# FastAPI endpoint for HTTP POST requests
@web_app.post("/")
async def process_batch_endpoint(request: Request):
    """
    HTTP endpoint for batch processing requests.

    Uses fire-and-forget pattern: spawns batch processing in background
    and returns immediately. The batch continues processing asynchronously.
    """
    body = await request.json()

    batch_id = body.get("batch_id")
    rows = body.get("rows", [])

    if not batch_id:
        return {"error": "batch_id is required", "status": "error"}

    if not rows or len(rows) == 0:
        return {"error": "rows array cannot be empty", "status": "error"}

    # Spawn Modal function in background (fire-and-forget)
    # DO NOT await - let it run asynchronously while we return immediately
    process_batch_modal.spawn(
        batch_id=batch_id,
        rows=rows,
        prompt=body.get("prompt", ""),
        context=body.get("context", ""),
        output_schema=body.get("output_schema"),
        webhook_url=body.get("webhook_url"),
    )

    # Return immediately (batch continues processing in background)
    return {
        "status": "accepted",
        "batch_id": batch_id,
        "total_rows": len(rows),
        "message": "Batch processing started in background",
    }


# Modal function that wraps the processing
@app.function(
    image=image,
    timeout=86400,  # 24 hours
    memory=2048,  # 2GB RAM
    secrets=[modal.Secret.from_name("bulk-gpt-env")],
)
def process_batch_modal(
    batch_id: str,
    rows: List[Dict[str, str]],
    prompt: str,
    context: str = "",
    output_schema: List[str] = None,
    webhook_url: str = None,
) -> Dict[str, Any]:
    """Modal function that processes batches."""
    return _process_batch_internal(batch_id, rows, prompt, context, output_schema, webhook_url)


# Expose FastAPI app as ASGI
@app.function(image=image, secrets=[modal.Secret.from_name("bulk-gpt-env")])
@modal.asgi_app()
def fastapi_app():
    """Expose FastAPI app."""
    return web_app


@app.function(image=image, timeout=60)
def health_check() -> Dict[str, str]:
    """Health check endpoint for Modal."""
    return {"status": "healthy", "service": "bulk-gpt-processor", "version": "1.0.0"}


@app.function(
    image=image,
    timeout=60,  # 60 seconds per poll (lightweight operation)
    memory=1024,
    secrets=[modal.Secret.from_name("bulk-gpt-env")],
    schedule=modal.Period(seconds=10),  # Check every 10 seconds
)
def poll_pending_batches():
    """
    Poll database for pending batches and process them.

    This function runs continuously as a scheduled job, checking the database
    every 10 seconds for batches with status='pending'. When found, it processes
    them using the existing batch processing logic.

    This works around Vercel → Modal network blocking by having Modal pull from
    the database instead of waiting for HTTP POST from Vercel.
    """
    from supabase import create_client
    import json

    # Get Supabase credentials
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not all([supabase_url, supabase_key]):
        print("[POLLER] Missing Supabase credentials")
        return

    try:
        supabase = create_client(supabase_url, supabase_key)

        # Query for pending batches (oldest first)
        response = supabase.table("batches").select(
            "id, user_id, data, prompt, context, output_schema"
        ).eq("status", "pending").order("created_at", desc=False).limit(1).execute()

        if not response.data or len(response.data) == 0:
            # No pending batches
            return

        batch = response.data[0]
        batch_id = batch["id"]

        print(f"[POLLER] Found pending batch: {batch_id}")

        # Mark as processing immediately to prevent duplicate processing
        supabase.table("batches").update({
            "status": "processing",
            "updated_at": "now()"
        }).eq("id", batch_id).execute()

        # Parse batch data
        rows = json.loads(batch["data"]) if isinstance(batch["data"], str) else batch["data"]
        prompt = batch.get("prompt", "")
        context = batch.get("context", "")
        output_schema_raw = batch.get("output_schema")

        # Parse output_schema if it's a string
        if isinstance(output_schema_raw, str):
            try:
                output_schema = json.loads(output_schema_raw)
            except:
                output_schema = []
        else:
            output_schema = output_schema_raw or []

        # Process the batch using existing logic
        print(f"[POLLER] Processing batch {batch_id} with {len(rows)} rows")

        # Call the internal processing function directly
        result = _process_batch_internal(
            batch_id=batch_id,
            rows=rows,
            prompt=prompt,
            context=context,
            output_schema=output_schema,
            webhook_url=None,  # No webhook needed for polling pattern
        )

        print(f"[POLLER] Batch {batch_id} completed: {result['status']}")

    except Exception as e:
        print(f"[POLLER] Error polling batches: {str(e)}")
        import traceback
        traceback.print_exc()


@app.function(
    image=image,
    timeout=60,
    memory=512,
    secrets=[modal.Secret.from_name("bulk-gpt-env")],
)
def generate_output_columns(prompt: str) -> Dict[str, Any]:
    """
    Analyze a user's prompt and suggest appropriate output columns.

    Uses Gemini to intelligently determine what columns the AI should generate
    based on the task described in the prompt.

    Args:
        prompt: The user's prompt template (e.g., "Analyze {{company}} and rate innovation")

    Returns:
        Dict with:
        - columns: List of {name, description} objects
        - status: 'success' or 'error'
        - error: Error message if status is 'error'
    """
    import google.generativeai as genai

    # Get Gemini API key
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        return {
            "columns": [],
            "status": "error",
            "error": "Missing GEMINI_API_KEY environment variable",
        }

    # Configure Gemini
    genai.configure(api_key=gemini_api_key)

    try:
        # Create model with system instruction
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction="""You are an AI that generates output column definitions for bulk data processing.

Analyze the user's prompt and determine what output columns should be generated.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "columns": [
    {
      "name": "column_name_snake_case",
      "description": "What this column contains"
    }
  ]
}

Rules:
1. Return 1-3 columns that make sense for the task
2. Column names MUST be snake_case (no spaces, lowercase, underscores only)
3. Descriptions should be clear and specific
4. Return ONLY the JSON object (no code blocks, no explanations)""",
        )

        # Generate columns
        analysis_prompt = f'Analyze this prompt and generate appropriate output columns:\n\n"{prompt}"'
        response = model.generate_content(analysis_prompt)

        if not response or not response.text:
            return {
                "columns": [],
                "status": "error",
                "error": "Empty response from Gemini",
            }

        # Parse JSON response
        response_text = response.text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith('```json'):
            response_text = response_text.replace('```json\n', '').replace('```', '')
        elif response_text.startswith('```'):
            response_text = response_text.replace('```\n', '').replace('```', '')

        # Parse JSON
        parsed = json.loads(response_text)

        if not parsed.get("columns") or not isinstance(parsed["columns"], list):
            return {
                "columns": [],
                "status": "error",
                "error": "Invalid response format - missing 'columns' array",
            }

        # Validate column structure
        columns = []
        for col in parsed["columns"]:
            if isinstance(col, dict) and "name" in col and "description" in col:
                # Validate snake_case
                name = col["name"].lower().replace(" ", "_").replace("-", "_")
                columns.append({
                    "name": name,
                    "description": col["description"]
                })

        if not columns:
            return {
                "columns": [],
                "status": "error",
                "error": "No valid columns generated",
            }

        return {
            "columns": columns[:3],  # Max 3 columns
            "status": "success",
            "error": None,
        }

    except json.JSONDecodeError as e:
        return {
            "columns": [],
            "status": "error",
            "error": f"Failed to parse JSON response: {str(e)}",
        }
    except Exception as e:
        return {
            "columns": [],
            "status": "error",
            "error": f"Gemini API error: {str(e)}",
        }


# Add HTTP endpoint for auto-column generation
@web_app.post("/generate-columns")
async def generate_columns_endpoint(request: Request):
    """
    HTTP endpoint for auto-column generation.

    POST /generate-columns
    Request: {"prompt": "Your prompt with {{variables}}"}
    Response: {
        "columns": [
            {"name": "column_name", "description": "What this column contains"}
        ],
        "status": "success" | "error",
        "error": null | "Error message"
    }

    Example:
        curl -X POST https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run/generate-columns \
          -H "Content-Type: application/json" \
          -d '{"prompt": "Rate {{company}} on innovation (1-10)"}'

    Used by wizard UI to intelligently suggest output columns based on user's prompt.
    """
    body = await request.json()
    prompt = body.get("prompt", "")

    if not prompt:
        return {"columns": [], "status": "error", "error": "Missing 'prompt' parameter"}

    # Call Modal function
    result = await generate_output_columns.remote.aio(prompt)
    return result

