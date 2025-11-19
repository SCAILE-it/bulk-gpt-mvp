# Website Analyzer - Global Function with Modes

## Overview

The website analyzer has been transformed into a **global function** with configurable modes and parameters, making it flexible and reusable for different analysis scenarios.

## Features

### ✅ Multiple Analysis Modes

1. **`business_context`** (default)
   - Extracts business context variables for GTM and content generation
   - Fields: tone, targetCountries, productDescription, competitors, targetIndustries, complianceFlags, icp, countries, products, targetKeywords, competitorKeywords

2. **`seo`**
   - Focuses on SEO-related information
   - Fields: metaTitle, metaDescription, primaryKeywords, secondaryKeywords, contentStructure, headings, internalLinks, externalLinks

3. **`competitor`**
   - Focuses on competitor information and positioning
   - Fields: competitors, competitorKeywords, marketPosition, differentiators, pricingModel, targetAudience, valueProposition

4. **`full`**
   - Comprehensive analysis including all available fields
   - Returns everything the AI can extract

5. **`custom`**
   - Extract only specified custom fields
   - Requires `custom_fields` parameter

### ✅ Configurable Parameters

- **`mode`**: Analysis mode (default: "business_context")
- **`custom_fields`**: List of custom field names (required for "custom" mode)
- **`use_google_search`**: Enable/disable Google Search Grounding (default: True)
- **`max_content_length`**: Maximum characters to analyze (default: 10000)
- **`user_id`**: Optional user ID for tracking

## Usage Examples

### Basic Usage (Business Context - Default)

```python
# Default mode - business context
result = analyse_website("scaile.tech")
```

### SEO Analysis

```python
result = analyse_website(
    url="scaile.tech",
    mode="seo"
)
```

### Competitor Analysis

```python
result = analyse_website(
    url="scaile.tech",
    mode="competitor"
)
```

### Full Analysis

```python
result = analyse_website(
    url="scaile.tech",
    mode="full"
)
```

### Custom Fields

```python
result = analyse_website(
    url="scaile.tech",
    mode="custom",
    custom_fields=["companyName", "industry", "pricing", "foundedYear"]
)
```

### Advanced Configuration

```python
result = analyse_website(
    url="scaile.tech",
    mode="seo",
    use_google_search=False,  # Disable Google Search Grounding
    max_content_length=20000,  # Analyze more content
    user_id="user_123"
)
```

## API Endpoint Usage

### HTTP POST Request

```bash
curl -X POST https://your-endpoint-url.modal.run \
  -H "Content-Type: application/json" \
  -d '{
    "url": "scaile.tech",
    "mode": "seo",
    "use_google_search": true,
    "max_content_length": 10000
  }'
```

### Frontend API Route

The frontend API route (`/app/api/analyse-website/route.ts`) can be updated to support modes:

```typescript
// Current usage (defaults to business_context)
const response = await fetch('/api/analyse-website', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: websiteUrl }),
})

// With mode parameter
const response = await fetch('/api/analyse-website', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    url: websiteUrl,
    mode: 'seo'  // or 'competitor', 'full', 'custom'
  }),
})
```

## Response Format

### Business Context Mode

```json
{
  "tone": "Professional",
  "targetCountries": "US, UK, Canada",
  "productDescription": "Cloud-based CRM platform...",
  "competitors": "Salesforce, HubSpot",
  "targetIndustries": "SaaS, Technology",
  "complianceFlags": "SOC2, GDPR",
  "icp": "B2B SaaS companies...",
  "countries": ["United States", "United Kingdom"],
  "products": ["CRM", "Sales Automation"],
  "targetKeywords": ["crm software", "sales automation"],
  "competitorKeywords": ["Salesforce", "HubSpot"],
  "_metadata": {
    "mode": "business_context",
    "url": "scaile.tech",
    "analyzed_at": null
  }
}
```

### SEO Mode

```json
{
  "metaTitle": "Company Name - Product Description",
  "metaDescription": "Meta description text...",
  "primaryKeywords": ["keyword1", "keyword2"],
  "secondaryKeywords": ["keyword3", "keyword4"],
  "contentStructure": "Overview of structure...",
  "headings": ["H1: Main Title", "H2: Section 1"],
  "internalLinks": ["/about", "/products"],
  "externalLinks": ["https://example.com"],
  "_metadata": {
    "mode": "seo",
    "url": "scaile.tech",
    "analyzed_at": null
  }
}
```

### Full Mode

Returns all available fields from all modes combined.

### Custom Mode

Returns only the specified custom fields.

## Backward Compatibility

✅ **Fully backward compatible** - Default mode is `business_context`, so existing calls work without changes:

```python
# Old way (still works)
analyse_website("scaile.tech")

# New way (explicit)
analyse_website("scaile.tech", mode="business_context")
```

## Implementation Details

### Mode Definitions

Modes are defined in `ANALYSIS_MODES` dictionary with:
- Name and description
- List of fields to extract
- Special handling for "full" and "custom" modes

### Prompt Selection

Each mode has a specialized system prompt:
- `BUSINESS_CONTEXT_PROMPT` - For business context extraction
- `SEO_PROMPT` - For SEO analysis
- `COMPETITOR_PROMPT` - For competitor analysis
- `FULL_PROMPT` - For comprehensive analysis
- Dynamic prompt generation for custom mode

### Field Filtering

- **Specific modes**: Only return fields defined for that mode
- **Full mode**: Return all fields found by AI
- **Custom mode**: Return only specified custom fields

## Benefits

1. **Flexibility**: One function for multiple use cases
2. **Reusability**: Can be called from anywhere with different configurations
3. **Extensibility**: Easy to add new modes or fields
4. **Performance**: Can disable Google Search Grounding for faster analysis
5. **Customization**: Custom mode allows extracting any fields needed
6. **Backward Compatible**: Existing code continues to work

## Next Steps

1. **Deploy** the updated Modal function:
   ```bash
   modal deploy modal/website_analyzer.py
   ```

2. **Update frontend** (optional) to support mode selection in UI

3. **Add new modes** as needed (e.g., "technical", "marketing", "legal")

4. **Extend custom fields** support for more specific use cases

