# Add Custom Prompt Executor Tool to g-mcp-tools-v2

## Problem
bulk-gpt-app needs to execute arbitrary Gemini prompts on CSV rows, but V2's `/bulk` endpoint only supports predefined enrichment tools.

## Current State
- V2 has 14 predefined tools (enrichment/generation/analysis)
- `/bulk` endpoint requires `tools: ["tool-name"]` field
- No tool exists for executing custom prompts with template variables

## Requirement
bulk-gpt-app sends requests like:
```json
{
  "rows": [
    {"name": "John", "company": "Acme"},
    {"name": "Jane", "company": "BigCorp"}
  ],
  "prompt": "Write a bio for {{name}} at {{company}}",
  "output_schema": [{"name": "bio"}],
  "context": "Professional LinkedIn bios"
}
```

## Solution: Add "prompt-executor" Tool

### 1. Create New Tool
**File**: `v2/infrastructure/tools/generation/prompt_executor.py`

```python
from typing import Any, Dict, List, Optional
from v2.integrations.gemini.grounding_client import GeminiGroundingClient
from v2.utils.templates import render_template
from v2.infrastructure.tools.base import enrichment_tool

@enrichment_tool("prompt-executor")
async def execute_custom_prompt(
    prompt_template: str,
    output_schema: Optional[List[Dict[str, str]]] = None,
    context: Optional[str] = None,
    temperature: float = 0.7,
    **row_data
) -> Dict[str, Any]:
    """
    Execute custom Gemini prompt with template variables.

    Args:
        prompt_template: Template string with {{variable}} placeholders
        output_schema: Optional JSON schema for structured output
        context: Optional context to prepend to prompt
        temperature: Gemini temperature (0.0-1.0), default 0.7
        **row_data: Dynamic row data for template substitution

    Returns:
        Dict with prompt, output, and schema_used
    """
    gemini = await GeminiGroundingClient.get_instance()

    # Render template with row data
    rendered_prompt = render_template(prompt_template, **row_data)

    # Add schema hint if provided
    if output_schema:
        schema_hint = "\n\nReturn JSON with fields: " + \
                     ", ".join([f'"{s["name"]}"' for s in output_schema])
        rendered_prompt += schema_hint

    # Prepend context if provided
    if context:
        rendered_prompt = f"{context}\n\n{rendered_prompt}"

    # Generate with Gemini (unlimited tokens)
    response = await gemini.generate_simple(
        prompt=rendered_prompt,
        temperature=temperature
        # No max_tokens limit - let Gemini use what it needs
    )

    return {
        "prompt": prompt_template,
        "rendered_prompt": rendered_prompt,
        "output": response,
        "schema_used": output_schema
    }
```

### 2. Register Tool
**File**: `v2/infrastructure/tools/registry.py`

Add to `TOOLS` dict:
```python
"prompt-executor": {
    "fn": execute_custom_prompt,
    "type": "generation",
    "params": [
        ("prompt_template", str, True),
        ("output_schema", List[Dict[str, str]], False, None),
        ("context", str, False, None),
        ("temperature", float, False, 0.7)
    ],
    "tag": "AI Generation",
    "doc": "Execute custom Gemini prompts with template variable substitution and optional structured output."
}
```

Don't forget to import at top of file:
```python
from v2.infrastructure.tools.generation.prompt_executor import execute_custom_prompt
```

### 3. Extend Request Model (Optional)
**File**: `v2/api/models/requests.py`

Only if you want to support these fields directly in request body:
```python
class BulkProcessRequest(BaseBulkModel):
    """Request for /bulk endpoint."""

    tools: List[str] = Field(..., description="Tool names", min_length=1)

    # Optional: convenience fields for prompt-executor tool
    prompt_template: Optional[str] = Field(None, description="Template for prompt-executor tool")
    output_schema: Optional[List[Dict[str, str]]] = Field(None, description="JSON schema for prompt-executor")
    context: Optional[str] = Field(None, description="Context for prompt-executor")
```

### 4. Update Batch Processor (Optional)
**File**: `v2/core/batch/processor.py`

Only if you added fields to request model - inject them into row data when `tools=["prompt-executor"]`:

```python
# In _build_tool_specs method, around line 190
if "prompt-executor" in tool_names:
    # Inject template params into each row
    for row in rows:
        if prompt_template:
            row["prompt_template"] = prompt_template
        if output_schema:
            row["output_schema"] = output_schema
        if context:
            row["context"] = context
```

## Usage

### Option A: Direct Tool Parameters (Recommended)
```bash
curl -X POST "https://scaile--g-mcp-tools-v2-api.modal.run/bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "tools": ["prompt-executor"],
    "rows": [
      {
        "name": "John",
        "company": "Acme",
        "prompt_template": "Write a bio for {{name}} at {{company}}",
        "output_schema": [{"name": "bio"}],
        "context": "Professional LinkedIn bios"
      },
      {
        "name": "Jane",
        "company": "BigCorp",
        "prompt_template": "Write a bio for {{name}} at {{company}}",
        "output_schema": [{"name": "bio"}],
        "context": "Professional LinkedIn bios"
      }
    ]
  }'
```

### Option B: Request-Level Parameters (If Steps 3 & 4 Implemented)
```bash
curl -X POST "https://scaile--g-mcp-tools-v2-api.modal.run/bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "tools": ["prompt-executor"],
    "prompt_template": "Write a bio for {{name}} at {{company}}",
    "output_schema": [{"name": "bio"}],
    "context": "Professional LinkedIn bios",
    "rows": [
      {"name": "John", "company": "Acme"},
      {"name": "Jane", "company": "BigCorp"}
    ]
  }'
```

## Expected Response
```json
{
  "success": true,
  "total_rows": 2,
  "results": [
    {
      "status": "success",
      "data": {
        "prompt": "Write a bio for {{name}} at {{company}}",
        "rendered_prompt": "Professional LinkedIn bios\n\nWrite a bio for John at Acme\n\nReturn JSON with fields: \"bio\"",
        "output": "{\"bio\": \"John is a seasoned professional at Acme with expertise in...\"}",
        "schema_used": [{"name": "bio"}]
      }
    },
    {
      "status": "success",
      "data": {
        "prompt": "Write a bio for {{name}} at {{company}}",
        "rendered_prompt": "Professional LinkedIn bios\n\nWrite a bio for Jane at BigCorp\n\nReturn JSON with fields: \"bio\"",
        "output": "{\"bio\": \"Jane is a dynamic leader at BigCorp specializing in...\"}",
        "schema_used": [{"name": "bio"}]
      }
    }
  ]
}
```

## Implementation Checklist
- [ ] Create `v2/infrastructure/tools/generation/prompt_executor.py` (Step 1)
- [ ] Register tool in `v2/infrastructure/tools/registry.py` (Step 2)
- [ ] (Optional) Extend request model in `v2/api/models/requests.py` (Step 3)
- [ ] (Optional) Update batch processor in `v2/core/batch/processor.py` (Step 4)
- [ ] Deploy to Modal: `modal deploy v2/modal_app.py`
- [ ] Test with curl commands above

## Notes
- **No token limit**: Removed `max_tokens` parameter to allow unlimited Gemini output
- **Leverages existing V2 infrastructure**: Template rendering (`render_template()`), Gemini client (`GeminiGroundingClient`), batch processing
- **Backward compatible**: Doesn't modify existing tools or endpoints
- **Estimated effort**: 1-2 hours (Steps 1-2 only) or 3-4 hours (all steps)

## Questions?
Contact bulk-gpt-app team for clarification on expected request/response formats.
