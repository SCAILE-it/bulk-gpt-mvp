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


def _process_batch_internal(
    batch_id: str,
    rows: List[Dict[str, str]],
    prompt: str,
    context: str = "",
    output_schema: List[str] = None,
) -> Dict[str, Any]:
    """
    Internal function to process a batch of CSV rows through Gemini API.
    
    Args:
        batch_id: Unique identifier for this batch
        rows: List of CSV rows as dictionaries
        prompt: Template prompt with {{column}} placeholders
        context: Additional context for the task
        output_schema: Expected output columns/format
    
    Returns:
        Dict with processing results and statistics
    """
    import google.generativeai as genai
    from supabase import create_client
    
    # Initialize clients
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not all([gemini_api_key, supabase_url, supabase_key]):
        raise ValueError("Missing required environment variables: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
    
    # Create clients
    try:
        genai.configure(api_key=gemini_api_key)
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize clients: {str(e)}")
    
    # Initialize tracking
    results = []
    successful_count = 0
    error_count = 0
    start_time = time.time()
    
    print(f"[{batch_id}] Starting batch processing with {len(rows)} rows")
    
    # Mark batch as processing
    try:
        supabase.table("batches").update(
            {"status": "processing", "updated_at": "now()"}
        ).eq("id", batch_id).execute()
    except Exception as e:
        print(f"[{batch_id}] Warning: Could not update batch status: {e}")
    
    # Process each row
    for idx, row in enumerate(rows):
        try:
            # Replace template variables in prompt
            final_prompt = prompt
            row_id = row.get("id", f"{batch_id}-row-{idx}")
            
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
            
            # Call Gemini API (without web search for now - requires specific API access)
            try:
                model = genai.GenerativeModel(
                    model_name="gemini-2.0-flash-exp",
                    system_instruction=SYSTEM_PROMPT,
                )
                
                response = model.generate_content(final_prompt)
                output = response.text if response and response.text else "No response generated"
                status = "success"
                error_msg = None
                successful_count += 1
            except Exception as api_error:
                output = ""
                status = "error"
                error_msg = str(api_error)
                error_count += 1
                print(f"[{batch_id}] Error on row {idx + 1}: {error_msg}")
            
            # Insert result into database
            try:
                supabase.table("batch_results").insert(
                    {
                        "id": row_id,
                        "batch_id": batch_id,
                        "row_index": idx,
                        "input": json.dumps(row),  # Convert dict to JSON string
                        "output": output,
                        "status": status,
                        "error_message": error_msg,  # Use error_message instead of error
                    }
                ).execute()
            except Exception as db_error:
                print(f"[{batch_id}] Warning: Could not insert result {row_id}: {db_error}")
            
            # Track result
            results.append(
                {
                    "id": row_id,
                    "output": output,
                    "status": status,
                    "error": error_msg,
                }
            )
            
            # Progress logging every 100 rows
            if (idx + 1) % 100 == 0:
                elapsed = time.time() - start_time
                rate = (idx + 1) / elapsed
                remaining = (len(rows) - idx - 1) / rate if rate > 0 else 0
                print(
                    f"[{batch_id}] Processed {idx + 1}/{len(rows)} rows "
                    f"({rate:.1f} rows/sec, ~{remaining:.0f}s remaining)"
                )
            
            # Rate limit: Sleep briefly between API calls to respect Gemini rate limits
            time.sleep(0.1)  # 100ms between calls
        
        except Exception as row_error:
            error_count += 1
            print(f"[{batch_id}] Unexpected error on row {idx}: {row_error}")
            results.append(
                {
                    "id": f"{batch_id}-row-{idx}",
                    "output": "",
                    "status": "error",
                    "error": str(row_error),
                }
            )
    
    # Calculate statistics
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
        f"{error_count} errors in {total_time:.1f}s"
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

