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

# Create Modal app
app = modal.App("bulk-gpt-processor-mvp")

# Define image with dependencies
image = modal.Image.debian_slim().pip_install(
    "google-generativeai>=0.8.5",
    "supabase>=2.0.0",
    "python-dotenv>=1.0.0",
    "fastapi[standard]>=0.115.0",
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
    
    # Generate row ID
    row_id = row.get("id", f"{batch_id}-row-{row_index}")
    
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
        
        # Add output schema hint if provided
        if output_schema:
            schema_hint = f"\n\nExpected output format: {', '.join(output_schema)}"
            final_prompt = final_prompt + schema_hint
        
        # Call Gemini API
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            system_instruction=SYSTEM_PROMPT,
        )
        
        response = model.generate_content(final_prompt)
        output = response.text if response and response.text else "No response generated"
        status = "success"
        error_msg = None
        
    except Exception as api_error:
        output = ""
        status = "error"
        error_msg = str(api_error)
        print(f"[{batch_id}] Error on row {row_index + 1}: {error_msg}")
    
    # Insert result into database
    try:
        supabase.table("batch_results").insert(
            {
                "id": row_id,
                "batch_id": batch_id,
                "row_index": row_index,
                "input_data": json.dumps(row),
                "output_data": output,
                "status": status,
                "error_message": error_msg,
            }
        ).execute()
    except Exception as db_error:
        print(f"[{batch_id}] Warning: Could not insert result {row_id}: {db_error}")
    
    return {
        "id": row_id,
        "output": output,
        "status": status,
        "error": error_msg,
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
) -> Dict[str, Any]:
    """
    Internal function to orchestrate parallel batch processing.
    
    Args:
        batch_id: Unique identifier for this batch
        rows: List of CSV rows as dictionaries
        prompt: Template prompt with {{column}} placeholders
        context: Additional context for the task
        output_schema: Expected output columns/format
    
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
    
    return summary


# FastAPI endpoint for HTTP POST requests
@web_app.post("/")
async def process_batch_endpoint(request: Request):
    """HTTP endpoint for batch processing requests."""
    body = await request.json()
    
    # Spawn Modal function to process batch
    result = await process_batch_modal.remote.aio(
        batch_id=body.get("batch_id"),
        rows=body.get("rows", []),
        prompt=body.get("prompt", ""),
        context=body.get("context", ""),
        output_schema=body.get("output_schema"),
    )
    
    return result


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
) -> Dict[str, Any]:
    """Modal function that processes batches."""
    return _process_batch_internal(batch_id, rows, prompt, context, output_schema)


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

