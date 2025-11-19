# Business Context Data Flow - How Data Populates

## Overview

This document explains how business context data populates in the Context → Business Context page, specifically focusing on the "Analyze Website" feature.

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                            │
│  Context → Variables → "Analyze Website" Section            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Input: "yourcompany.com"                            │    │
│  │ Button: [Analyze]                                   │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ POST /api/analyse-website
                        │ { url: "yourcompany.com" }
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend API Route                              │
│  /app/api/analyse-website/route.ts                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. Authenticate Request                              │    │
│  │ 2. Validate URL                                      │    │
│  │ 3. Fetch Website HTML                                │    │
│  │ 4. Extract Text Content                              │    │
│  │ 5. Call Gemini AI (with Google Search Grounding)    │    │
│  │ 6. Parse JSON Response                               │    │
│  │ 7. Return Structured Data                            │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ JSON Response
                        ▼
┌─────────────────────────────────────────────────────────────┐
│           Frontend Component                                │
│  components/context/ContextForm.tsx                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ handleAnalyzeWebsite()                              │    │
│  │  - Receives response                                │    │
│  │  - Updates context via updateContext()              │    │
│  │  - Updates business context via                    │    │
│  │    updateBusinessContext()                         │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ updateContext() / updateBusinessContext()
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Context Storage Hook                           │
│  hooks/useContextStorage.ts                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ updateContext()                                      │    │
│  │  - Updates local state                               │    │
│  │  - Syncs to Supabase                                 │    │
│  │  - Caches in localStorage                            │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ PUT /api/business-context/business-context-data
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Database                               │
│  business_contexts table                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Columns:                                             │    │
│  │  - tone                                              │    │
│  │  - target_countries                                  │    │
│  │  - product_description                               │    │
│  │  - competitors                                       │    │
│  │  - target_industries                                 │    │
│  │  - compliance_flags                                  │    │
│  │  - icp                                               │    │
│  │  - countries (array)                                  │    │
│  │  - products (array)                                   │    │
│  │  - target_keywords (array)                            │    │
│  │  - competitor_keywords (array)                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step Process

### 1. User Input (Frontend Component)

**File**: `components/context/ContextForm.tsx` (lines 217-259)

```typescript
// User enters URL in input field
<Input
  id="website-url"
  placeholder="yourcompany.com or https://yourcompany.com"
  value={websiteUrl}
  onChange={(e) => setWebsiteUrl(e.target.value)}
/>

// User clicks "Analyze" button
<Button onClick={handleAnalyzeWebsite}>
  Analyze
</Button>
```

### 2. API Call (Frontend)

**File**: `components/context/ContextForm.tsx` (lines 139-196)

```typescript
const handleAnalyzeWebsite = async () => {
  // Call API endpoint
  const response = await fetch('/api/analyse-website', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: websiteUrl.trim() }),
  });
  
  const data = await response.json();
  // ... process response
};
```

### 3. Website Analysis (Backend API)

**File**: `app/api/analyse-website/route.ts`

**Process**:
1. **Authentication**: Validates user is authenticated
2. **URL Validation**: Ensures URL format is valid
3. **Fetch HTML**: Downloads website content (15s timeout)
4. **Extract Text**: Removes scripts, styles, HTML tags
5. **AI Analysis**: Uses Gemini 2.5 Flash with Google Search Grounding
6. **Parse Response**: Extracts JSON from AI response
7. **Validate & Clean**: Ensures data structure is correct

**Key Functions**:
- `fetchWebsiteContent(url)`: Fetches and extracts text from HTML
- `POST handler`: Orchestrates the analysis process

### 4. Data Structure Returned

The API returns a JSON object with:

**Context Variables** (strings):
- `tone`: "Professional, Technical, Results-oriented"
- `targetCountries`: "US, UK, Canada"
- `productDescription`: "Brief description..."
- `competitors`: "Salesforce, HubSpot"
- `targetIndustries`: "SaaS, Technology, Sales"
- `complianceFlags`: "SOC2, GDPR"

**Business Context**:
- `icp`: "Ideal customer description..." (string)
- `countries`: ["United States", "United Kingdom"] (array)
- `products`: ["CRM", "Marketing Automation"] (array)
- `targetKeywords`: ["crm software", "sales automation"] (array)
- `competitorKeywords`: ["Salesforce", "HubSpot"] (array)

### 5. Update Context (Frontend)

**File**: `components/context/ContextForm.tsx` (lines 163-187)

```typescript
// Update context variables
const contextUpdates = {};
if (data.tone) contextUpdates.tone = data.tone;
if (data.targetCountries) contextUpdates.targetCountries = data.targetCountries;
// ... etc

// Update business context
const businessUpdates = {};
if (data.icp) businessUpdates.icp = data.icp;
if (data.countries) businessUpdates.countries = data.countries;
// ... etc

// Apply updates
updateContext(contextUpdates);
updateBusinessContext(businessUpdates);
```

### 6. Persist to Database (Hook)

**File**: `hooks/useContextStorage.ts` (lines 144-197)

```typescript
const updateContext = async (updates) => {
  // Update local state
  setContext({ ...context, ...updates });
  
  // Sync to Supabase
  await fetch('/api/business-context/business-context-data', {
    method: 'PUT',
    body: JSON.stringify(updated)
  });
  
  // Cache in localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};
```

### 7. Database Storage

**Table**: `business_contexts` in Supabase

Data is stored with snake_case column names:
- `tone` → `tone`
- `targetCountries` → `target_countries`
- `productDescription` → `product_description`
- `countries` → `countries` (JSONB array)
- `products` → `products` (JSONB array)
- etc.

## Manual Entry Flow

Users can also manually enter data:

1. User types in input fields (Tone, ICP, Products, etc.)
2. `handleManualUpdate()` is called on change
3. `updateContext()` or `updateBusinessContext()` is called
4. Data syncs to Supabase and localStorage
5. "All changes saved automatically" indicator shows

## Loading Flow

On page load:

1. `useContextStorage` hook loads data
2. Tries Supabase first: `GET /api/business-context/business-context-data`
3. Falls back to localStorage if Supabase unavailable
4. Migrates localStorage data to Supabase in background
5. Populates form fields with loaded data

## Key Files

| File | Purpose |
|------|---------|
| `components/context/ContextForm.tsx` | UI component with "Analyze Website" feature |
| `app/api/analyse-website/route.ts` | Backend API route for website analysis |
| `hooks/useContextStorage.ts` | Hook for managing context state and sync |
| `app/api/business-context/business-context-data/route.ts` | API route for CRUD operations on context |

## Moving to Backend

To move the website analysis to `gtm-power-app-backend`:

1. **Create backend endpoint**: `/api/analyse-website` in backend repo
2. **Update frontend**: Change API URL to backend URL
3. **Add env variable**: `NEXT_PUBLIC_BACKEND_URL`
4. **Test**: Verify end-to-end flow works
5. **Remove**: Delete `/app/api/analyse-website/route.ts` from frontend

See `WEBSITE_ANALYSIS_BACKEND_MIGRATION.md` for detailed migration guide.

