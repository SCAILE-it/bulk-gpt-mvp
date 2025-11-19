# Website Analysis Feature - Backend Migration Guide

## Overview

This document outlines how to move the "Analyze Website" feature from the frontend (`/app/api/analyse-website/route.ts`) to the backend repository (`federicodeponte/gtm-power-app-backend`).

## Current Implementation

### Frontend Location
- **API Route**: `/Users/federicodeponte/bulk-gpt-mvp-code/app/api/analyse-website/route.ts`
- **Component**: `/Users/federicodeponte/bulk-gpt-mvp-code/components/context/ContextForm.tsx` (lines 139-196)

### How It Works

1. **User Input**: User enters website URL in the "Analyze Website" section
2. **Frontend Call**: `ContextForm` calls `POST /api/analyse-website` with `{ url: string }`
3. **Backend Processing**:
   - Validates URL
   - Fetches website HTML content
   - Extracts text from HTML (removes scripts, styles, etc.)
   - Uses Gemini AI with Google Search Grounding to analyze content
   - Returns structured JSON with business context data
4. **Frontend Update**: Component receives response and updates context via hooks

### Data Flow

```
User Input (URL) 
  → POST /api/analyse-website 
    → Fetch HTML Content
      → Extract Text
        → Gemini AI Analysis (with Google Search Grounding)
          → Return JSON
            → Update Context Fields
```

## Migration Steps

### Step 1: Create Backend Endpoint

Create a new endpoint in `gtm-power-app-backend`:

**File**: `src/routes/analyse-website.ts` (or similar, depending on your backend structure)

**Key Requirements**:
- Accept POST request with `{ url: string }`
- Authenticate request (Bearer token or API key)
- Fetch website content
- Use Gemini AI to analyze
- Return same JSON structure

### Step 2: Update Frontend to Call Backend

**File**: `/Users/federicodeponte/bulk-gpt-mvp-code/components/context/ContextForm.tsx`

**Change**: Update line 147 from:
```typescript
const response = await fetch('/api/analyse-website', {
```

To:
```typescript
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://your-backend-url.com'
const response = await fetch(`${backendUrl}/api/analyse-website`, {
```

### Step 3: Environment Variables

Add to `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

Backend needs:
```env
GEMINI_API_KEY=your_gemini_api_key
```

## Backend Implementation Template

### Express.js Example

```typescript
// src/routes/analyse-website.ts
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateRequest } from '../middleware/auth';

const router = express.Router();

const SYSTEM_PROMPT = `You are an expert at analyzing company websites and extracting business context.

Given a website's HTML content, extract the following information:

**Context Variables:**
1. **Tone**: The communication style/tone used on the website
2. **Target Countries**: Countries or regions the company targets (comma-separated string)
3. **Product Description**: A brief description of the main product or service (2-3 sentences max)
4. **Competitors**: Any competitors mentioned or implied (comma-separated string)
5. **Target Industries**: Industries or sectors the company targets (comma-separated string)
6. **Compliance Flags**: Any compliance certifications or standards mentioned (comma-separated string)

**Business Context:**
7. **ICP (Ideal Customer Profile)**: Describe the ideal customer based on website content
8. **Countries**: Array of specific countries/regions mentioned
9. **Products**: Array of product names or service offerings mentioned
10. **Target Keywords**: Array of key terms/phrases the company seems to target
11. **Competitor Keywords**: Array of competitor names or brands mentioned

Return ONLY a valid JSON object with these fields. If a field cannot be determined, omit it or set arrays to empty arrays [].`;

async function fetchWebsiteContent(url: string): Promise<string> {
  let validUrl = url.trim();
  if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
    validUrl = `https://${validUrl}`;
  }

  new URL(validUrl); // Validate URL format

  const response = await fetch(validUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BulkGPT/1.0; +https://bulkgpt.app)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000), // 15s timeout
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();

  // Extract text content from HTML
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.substring(0, 10000); // Limit to first 10000 characters
}

router.post('/analyse-website', authenticateRequest, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return res.status(400).json({ error: 'URL is required and must be a non-empty string' });
    }

    // Validate URL format
    try {
      const testUrl = url.startsWith('http') ? url : `https://${url}`;
      new URL(testUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return res.status(500).json({ error: 'API not configured' });
    }

    // Fetch website content
    const websiteContent = await fetchWebsiteContent(url);

    if (!websiteContent || websiteContent.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract content from website' });
    }

    // Initialize Gemini client with Google Search Grounding
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      // @ts-expect-error - tools parameter exists but not in TypeScript types yet
      tools: [{ googleSearchRetrieval: {} }],
    });

    // Build prompt
    const fullPrompt = `${SYSTEM_PROMPT}

---

Website URL: ${url}

Website Content (first 10000 chars):
${websiteContent}

Extract the company context information and return JSON.`;

    // Call Gemini with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    try {
      const result = await model.generateContent(fullPrompt);
      clearTimeout(timeoutId);

      const text = result.response.text();

      // Extract JSON from potential markdown code block
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonText);

      // Validate and clean response
      const response: Record<string, unknown> = {};

      // Context Variables (strings)
      const stringFields = ['tone', 'targetCountries', 'productDescription', 'competitors', 'targetIndustries', 'complianceFlags'];
      for (const field of stringFields) {
        if (parsed[field] && typeof parsed[field] === 'string' && parsed[field].trim().length > 0) {
          response[field] = parsed[field].trim();
        }
      }

      // Business Context - ICP (string)
      if (parsed.icp && typeof parsed.icp === 'string' && parsed.icp.trim().length > 0) {
        response.icp = parsed.icp.trim();
      }

      // Business Context - Arrays
      const arrayFields = ['countries', 'products', 'targetKeywords', 'competitorKeywords'];
      for (const field of arrayFields) {
        if (parsed[field] && Array.isArray(parsed[field])) {
          const cleaned = parsed[field]
            .filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
            .map((item: string) => item.trim());
          if (cleaned.length > 0) {
            response[field] = cleaned;
          }
        }
      }

      return res.json(response);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return res.status(504).json({ error: 'Analysis timeout - website took too long to analyze' });
      }

      console.error('Gemini analysis error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Website analysis error:', error);

    return res.status(500).json({
      error: 'Failed to analyze website',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
```

### FastAPI Example (Python)

```python
# src/routes/analyse_website.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from google import generativeai as genai
import httpx
import re
import os

router = APIRouter()

SYSTEM_PROMPT = """You are an expert at analyzing company websites and extracting business context.

Given a website's HTML content, extract the following information:

**Context Variables:**
1. **Tone**: The communication style/tone used on the website
2. **Target Countries**: Countries or regions the company targets (comma-separated string)
3. **Product Description**: A brief description of the main product or service (2-3 sentences max)
4. **Competitors**: Any competitors mentioned or implied (comma-separated string)
5. **Target Industries**: Industries or sectors the company targets (comma-separated string)
6. **Compliance Flags**: Any compliance certifications or standards mentioned (comma-separated string)

**Business Context:**
7. **ICP (Ideal Customer Profile)**: Describe the ideal customer based on website content
8. **Countries**: Array of specific countries/regions mentioned
9. **Products**: Array of product names or service offerings mentioned
10. **Target Keywords**: Array of key terms/phrases the company seems to target
11. **Competitor Keywords**: Array of competitor names or brands mentioned

Return ONLY a valid JSON object with these fields. If a field cannot be determined, omit it or set arrays to empty arrays []."""

class AnalyseWebsiteRequest(BaseModel):
    url: str

async def fetch_website_content(url: str) -> str:
    valid_url = url.strip()
    if not valid_url.startswith(('http://', 'https://')):
        valid_url = f'https://{valid_url}'
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            valid_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (compatible; BulkGPT/1.0; +https://bulkgpt.app)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        )
        response.raise_for_status()
        html = response.text
    
    # Extract text content from HTML
    text = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', html, flags=re.IGNORECASE)
    text = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<!--[\s\S]*?-->', '', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text[:10000]  # Limit to first 10000 characters

@router.post('/analyse-website')
async def analyse_website(request: AnalyseWebsiteRequest, user_id: str = Depends(authenticate_request)):
    if not request.url or not request.url.strip():
        raise HTTPException(status_code=400, detail='URL is required and must be a non-empty string')
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail='API not configured')
    
    try:
        website_content = await fetch_website_content(request.url)
        
        if not website_content or not website_content.strip():
            raise HTTPException(status_code=400, detail='Could not extract content from website')
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        full_prompt = f"""{SYSTEM_PROMPT}

---

Website URL: {request.url}

Website Content (first 10000 chars):
{website_content}

Extract the company context information and return JSON."""
        
        result = model.generate_content(full_prompt)
        text = result.text.strip()
        
        # Extract JSON from potential markdown code block
        if text.startswith('```json'):
            text = text.replace('```json', '').replace('```', '').strip()
        elif text.startswith('```'):
            text = text.replace('```', '').strip()
        
        import json
        parsed = json.loads(text)
        
        # Validate and clean response
        response = {}
        
        # Context Variables (strings)
        string_fields = ['tone', 'targetCountries', 'productDescription', 'competitors', 'targetIndustries', 'complianceFlags']
        for field in string_fields:
            if field in parsed and isinstance(parsed[field], str) and parsed[field].strip():
                response[field] = parsed[field].strip()
        
        # Business Context - ICP (string)
        if 'icp' in parsed and isinstance(parsed['icp'], str) and parsed['icp'].strip():
            response['icp'] = parsed['icp'].strip()
        
        # Business Context - Arrays
        array_fields = ['countries', 'products', 'targetKeywords', 'competitorKeywords']
        for field in array_fields:
            if field in parsed and isinstance(parsed[field], list):
                cleaned = [item.strip() for item in parsed[field] if isinstance(item, str) and item.strip()]
                if cleaned:
                    response[field] = cleaned
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to analyze website: {str(e)}')
```

## Response Format

The endpoint should return the same JSON structure:

```json
{
  "tone": "Professional",
  "targetCountries": "US, UK, Canada",
  "productDescription": "Cloud-based CRM platform for sales teams",
  "competitors": "Salesforce, HubSpot",
  "targetIndustries": "SaaS, Technology, Sales",
  "complianceFlags": "SOC2, GDPR",
  "icp": "B2B SaaS companies with 50-500 employees looking for sales automation and CRM solutions",
  "countries": ["United States", "United Kingdom", "Canada"],
  "products": ["CRM", "Sales Automation", "Lead Management"],
  "targetKeywords": ["crm software", "sales automation", "lead management"],
  "competitorKeywords": ["Salesforce", "HubSpot"]
}
```

## Testing

After migration, test:
1. Frontend can call backend endpoint
2. Authentication works
3. Website analysis returns correct data structure
4. Frontend updates context fields correctly

## Next Steps

1. ✅ Create backend endpoint in `gtm-power-app-backend`
2. ✅ Update frontend to call backend URL
3. ✅ Add environment variable for backend URL
4. ✅ Test end-to-end flow
5. ✅ Remove old `/app/api/analyse-website/route.ts` file

