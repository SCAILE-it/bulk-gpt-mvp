# SEO Analytics Agent - Investigation Report

**Date:** 2025-01-16  
**Agent ID:** `seo_analytics`  
**Status:** 🔍 Investigation Phase

---

## Current State

### Frontend (bulk-gpt-mvp-code)
✅ **Agent Definition Exists:**
- Database: `agent_definitions` table has `seo_analytics` entry
- Input type: `keywords`
- Output type: `analytics`
- Can schedule: `true`
- Modal endpoint: `modal://seo_analytics`

✅ **API Route Exists:**
- `/api/agents/seo_analytics/run` - Currently STUBBED
- Creates batch record
- Tracks usage (mock values)
- No actual Modal backend call yet

❌ **Missing:**
- Modal backend implementation
- Actual SEO analytics logic
- Integration with SEO APIs (Google Search Console, SEMrush, Ahrefs, etc.)

---

## Expected Behavior

### Input
- **Type:** Keywords (from `resources` table where `type='keyword'`)
- **Format:** Array of keyword resource IDs
- **Data Structure:**
  ```json
  {
    "keyword": "saas marketing tools",
    "category": "marketing",
    "search_volume": 1200,
    "difficulty": 45,
    "cpc": 2.50
  }
  ```

### Output
- **Type:** Analytics (stored in `resources` table where `type='analytics'`)
- **Expected Metrics:**
  - Keyword rankings
  - Search volume trends
  - Competition analysis
  - SERP features
  - Content gap analysis
  - Ranking opportunities
  - Backlink opportunities

### Process Flow
1. User selects keywords from `/resources` page
2. Clicks "Run SEO Analytics" on agent card
3. Frontend calls `/api/agents/seo_analytics/run` with `input_resource_ids`
4. Backend fetches keyword resources from database
5. Backend calls Modal endpoint `modal://seo_analytics`
6. Modal backend:
   - Fetches SEO data for each keyword (rankings, volume, competition)
   - Analyzes trends and opportunities
   - Generates insights and recommendations
7. Modal returns analytics results
8. Backend creates analytics resources
9. Frontend displays results

---

## Backend Requirements

### Modal Backend Function Needed

**File:** `modal/seo_analytics.py` (to be created)

**Function Signature:**
```python
@app.function(...)
def analyze_seo_keywords(
    user_id: str,
    keyword_resources: List[Dict[str, Any]],
    business_context: Dict[str, Any] = None,
    config: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Analyze SEO keywords and generate analytics.
    
    Args:
        user_id: User ID for tracking
        keyword_resources: List of keyword resources from database
        business_context: Business context (ICP, products, countries)
        config: Agent-specific config (e.g., which APIs to use)
    
    Returns:
        {
            "success": bool,
            "batch_id": str,
            "results": {
                "analytics": [
                    {
                        "keyword": str,
                        "metrics": {
                            "current_ranking": int | null,
                            "search_volume": int,
                            "difficulty": int,
                            "cpc": float,
                            "trend": "up" | "down" | "stable",
                            "serp_features": List[str],
                            "competitors": List[Dict],
                            "opportunities": List[str]
                        },
                        "insights": str,
                        "recommendations": List[str]
                    }
                ]
            },
            "usage": {
                "input_tokens": int,
                "output_tokens": int,
                "api_calls": int,
                "cost": float
            }
        }
    """
```

### Required APIs/Services

**Option 1: Use Existing SEO APIs**
- **Google Search Console API** - For ranking data
- **SEMrush API** - For keyword metrics, competition
- **Ahrefs API** - For backlinks, domain authority
- **SerpAPI** - For SERP analysis
- **DataForSEO** - Comprehensive SEO data

**Option 2: Use SERP Service (if exists)**
- Check `/Users/federicodeponte/serp-service` for existing implementation

**Option 3: Build Custom**
- Web scraping (limited, rate-limited)
- AI-powered analysis of public data

---

## Investigation Checklist

### ✅ What We Have
- [x] Agent definition in database
- [x] Frontend API route (stubbed)
- [x] Resource types support analytics
- [x] Batch tracking system
- [x] Usage tracking system

### ❌ What's Missing
- [ ] Modal backend implementation (`modal/seo_analytics.py`)
- [ ] SEO API integrations
- [ ] Analytics data schema definition
- [ ] Resource creation logic for analytics
- [ ] Error handling for API failures
- [ ] Rate limiting for SEO APIs
- [ ] Cost tracking for SEO API calls

---

## Next Steps

1. **Check serp-service directory** - See if there's existing SEO code
2. **Identify SEO API provider** - Choose which APIs to use
3. **Create Modal backend** - Implement `seo_analytics.py`
4. **Update API route** - Connect to Modal backend
5. **Test end-to-end** - Verify full flow works

---

## ✅ FINDINGS: GTM Backend Already Has SEO Tools!

**GTM Backend URL:** `https://scaile--g-mcp-tools-v2-api.modal.run`

**Already Used By:** Bulk Agent (via `GTMAPIClient`)

### Available SEO Tools in GTM Backend

The GTM backend already provides these SEO analytics tools:

1. **`keyword-intelligence`** - Analyze keyword metrics and SEO potential
   - Endpoint: `/analysis/keyword-intelligence`
   - Inputs: `keyword`, `domain`

2. **`keyword-difficulty`** - Estimate keyword ranking difficulty
   - Endpoint: `/analysis/keyword-difficulty`
   - Inputs: `keyword`

3. **`keyword-intent`** - Classify search intent for keywords
   - Endpoint: `/analysis/keyword-intent`
   - Inputs: `keyword`

4. **`keyword-ranking`** - Check ranking positions for keywords
   - Endpoint: `/analysis/keyword-ranking`
   - Inputs: `keyword`, `domain`

5. **`serp-features`** - Detect SERP features for keywords
   - Endpoint: `/analysis/serp-features`
   - Inputs: `keyword`

6. **`keyword-volume`** - Estimate search volume for keywords
   - Endpoint: `/analysis/keyword-volume`
   - Inputs: `keyword`

7. **`aeo-health-check`** - Analyze Answer Engine Optimization health
   - Endpoint: `/analysis/aeo-health-check`
   - Inputs: `domain`

8. **`aeo-mentions`** - Track brand mentions in answer engines
   - Endpoint: `/analysis/aeo-mentions`
   - Inputs: `brand`, `timeframe`

### How Bulk Agent Uses It

The bulk agent already uses this backend:
- **Client:** `GTMAPIClient` (`lib/api/gtm-client.ts`)
- **Base URL:** `https://scaile--g-mcp-tools-v2-api.modal.run`
- **Authentication:** Bearer token (Supabase JWT)
- **Usage:** `app/api/process/route.ts` calls `gtmClient.enrichBatch()`

---

## ✅ FINDINGS: SERP Service Also Exists (Optional)

**Location:** `/Users/federicodeponte/serp-service`

### What It Does
- ✅ **Multi-source SERP aggregation** (Google CSE, Brave Search, Serper.dev, custom scraper)
- ✅ **Smart caching** to reduce costs
- ✅ **Cost tracking** per query
- ✅ **Fallback logic** (tries free APIs first, then paid)
- ✅ **CAPTCHA solving** integrated (2Captcha)
- ✅ **Supabase Edge Function** orchestrator
- ✅ **Database schema** for tracking queries, results, rankings history

### Available Providers
1. **Google Custom Search** - FREE, 3K queries/month
2. **Brave Search** - FREE, 2K queries/month  
3. **Serper.dev** - $1.35/1000 queries (paid fallback)
4. **Custom Scraper** - With Evomi proxies + CAPTCHA solving

### Cost Analysis
- **Free tier:** 5,000 queries/month for $0
- **With Serper:** 10,000 queries/month for ~$50
- **With scraper:** 10,000 queries/month for $25-70 (with CAPTCHA solving)

### Current Status
- ✅ Infrastructure complete
- ✅ CAPTCHA solving integrated
- ✅ Multiple providers working
- ✅ Caching implemented
- ✅ Cost tracking working

### What It Provides
- SERP results (organic, featured snippets, knowledge graph)
- People Also Ask
- Related searches
- Ranking positions
- Historical tracking (via `serp_rankings_history` table)

---

## Questions Answered

1. **Which SEO APIs do we have access to?**
   - ✅ Google Custom Search API (FREE, 3K/month)
   - ✅ Brave Search API (FREE, 2K/month)
   - ✅ Serper.dev API (paid, $1.35/1K queries)
   - ✅ Custom scraper with proxies

2. **What's in serp-service?**
   - ✅ Fully working SERP service
   - ✅ Multiple API providers
   - ✅ Can be reused for SEO analytics

3. **Budget constraints?**
   - ✅ Free tier: 5K queries/month = $0
   - ✅ Paid tier: 10K queries/month = $50-70
   - ✅ Most cost-effective: Use free APIs first, then Serper

4. **Data requirements?**
   - ✅ SERP data available
   - ✅ Rankings tracking available
   - ⚠️ Need to add: Keyword metrics (volume, difficulty, CPC) - may need additional API

---

## Recommended Implementation Plan

### Phase 1: Use Existing GTM Backend ✅ (Already Available!)
1. ✅ GTM backend exists and is working
2. ✅ SEO tools already available (`keyword-intelligence`, `keyword-ranking`, etc.)
3. ✅ `GTMAPIClient` already implemented and used by bulk agent
4. ⚠️ Need to: Create SEO analytics agent that orchestrates multiple SEO tools

### Phase 2: SEO Analytics Agent Implementation
1. ✅ Use `GTMAPIClient` (already exists)
2. ✅ Call multiple SEO tools for each keyword:
   - `keyword-intelligence` (main analysis)
   - `keyword-ranking` (if domain provided)
   - `serp-features` (SERP analysis)
   - `keyword-volume` (search volume)
   - `keyword-difficulty` (competition)
   - `keyword-intent` (intent classification)
3. ⚠️ Need to: Aggregate results from multiple tools
4. ⚠️ Need to: Generate insights and recommendations
5. ⚠️ Need to: Return structured analytics data

### Phase 3: Integration
1. ⚠️ Need to: Update `/api/agents/seo_analytics/run` to use GTM backend
2. ✅ Use existing `GTMAPIClient` (no new backend needed!)
3. ⚠️ Need to: Process GTM backend responses
4. ⚠️ Need to: Create analytics resources
5. ⚠️ Need to: Update batch status

### Phase 4: Testing
1. Test with sample keywords
2. Verify analytics resources created
3. Check usage tracking
4. Verify cost calculation

---

## Integration Options

### Option A: Modal Backend Calls SERP Service (Recommended)
**Architecture:**
```
Frontend → Next.js API → Modal Backend → SERP Service (HTTP) → Providers
```

**Pros:**
- SERP service stays independent
- Can reuse SERP service for other agents
- Easier to maintain

**Cons:**
- Additional HTTP call overhead
- Need to expose SERP service endpoint

### Option B: Direct Integration in Modal
**Architecture:**
```
Frontend → Next.js API → Modal Backend (includes SERP logic) → Providers
```

**Pros:**
- Faster (no HTTP overhead)
- Single deployment

**Cons:**
- Duplicate code
- Harder to maintain

**Recommendation:** Option A - Keep SERP service separate, call it from Modal backend.

---

## Files to Create/Modify

### New Files
1. `lib/services/seo-analytics.ts` - SEO analytics service
   - Uses `GTMAPIClient` to call multiple SEO tools
   - Orchestrates: `keyword-intelligence`, `keyword-ranking`, `serp-features`, etc.
   - Aggregates results and generates insights
   - Returns structured analytics data
2. `lib/utils/seo-analytics.ts` - Frontend utilities (if needed)

### Modify Files
1. `app/api/agents/[agentId]/run/route.ts` - Add SEO analytics implementation
   - Currently stubbed
   - Should use `GTMAPIClient` (like bulk agent does)
   - Call SEO analytics service
   - Process results and create analytics resources
2. `lib/types/resources.ts` - Ensure analytics type is supported ✅ (already supported)
3. `lib/types/agents.ts` - Add SEO analytics specific types (if needed)

### No New Backend Needed!
- ✅ GTM backend already exists and has all SEO tools
- ✅ `GTMAPIClient` already implemented
- ✅ Authentication already working
- ✅ Just need to orchestrate the tools and aggregate results

### SERP Service Integration
**SERP Service Endpoint:** 
- Local: `http://localhost:3002/api/serp` (hybrid-server.ts)
- Supabase Edge Function: `/functions/v1/serp-orchestrator`

**Request Format:**
```json
{
  "query": "keyword to search",
  "location": "us",
  "language": "en",
  "device": "desktop",
  "num_results": 10
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "search_metadata": {...},
    "organic_results": [...],
    "featured_snippet": {...},
    "knowledge_graph": {...},
    "people_also_ask": [...],
    "related_searches": [...]
  },
  "cached": false,
  "source": "google_custom_search",
  "response_time_ms": 250,
  "cost": 0
}
```

---

## Issues & Recommendations

### ✅ What's Ready
1. ✅ SERP service fully functional
2. ✅ Multiple providers configured
3. ✅ Caching implemented
4. ✅ Cost tracking working
5. ✅ Frontend agent definition exists
6. ✅ API route structure exists (stubbed)

### ⚠️ What Needs Work

#### 1. Keyword Metrics (Volume, Difficulty, CPC)
**Issue:** SERP service provides rankings but not keyword metrics.

**Options:**
- **Option A:** Add SEMrush API integration (if API key available)
- **Option B:** Add Ahrefs API integration (if API key available)
- **Option C:** Use SerpAPI keyword metrics endpoint
- **Option D:** Estimate from SERP data (less accurate)
- **Option E:** Leave blank, focus on rankings only

**Recommendation:** Start with Option E (rankings only), add metrics API later if needed.

#### 2. SERP Service Deployment
**Issue:** SERP service needs to be deployed/accessible for Modal backend to call.

**Options:**
- Deploy as Supabase Edge Function (recommended)
- Deploy as standalone service (Vercel, Railway, etc.)
- Run locally (dev only)

**Recommendation:** Deploy as Supabase Edge Function for easy access.

#### 3. SEO Analytics Service Implementation
**Issue:** Need to create service that orchestrates GTM backend SEO tools.

**What it needs to do:**
1. Accept keyword resources from frontend
2. For each keyword, call multiple GTM backend tools:
   - `keyword-intelligence` (main analysis)
   - `keyword-ranking` (if domain provided)
   - `serp-features` (SERP analysis)
   - `keyword-volume` (search volume)
   - `keyword-difficulty` (competition)
   - `keyword-intent` (intent classification)
3. Aggregate results from all tools
4. Generate insights and recommendations
5. Return structured analytics data
6. Track usage and costs (GTM backend handles this)

#### 4. Analytics Resource Schema
**Issue:** Need to define what analytics data looks like.

**Suggested Schema:**
```json
{
  "keyword": "saas marketing tools",
  "metrics": {
    "current_ranking": null,
    "search_volume": null,
    "difficulty": null,
    "cpc": null,
    "serp_features": ["featured_snippet", "people_also_ask"],
    "competitors": [
      {
        "domain": "example.com",
        "position": 1,
        "title": "..."
      }
    ]
  },
  "insights": "This keyword has high competition...",
  "recommendations": [
    "Focus on featured snippet optimization",
    "Target long-tail variations"
  ],
  "trend": "up",
  "opportunities": [
    "Low competition for 'saas marketing tools for startups'"
  ]
}
```

---

## Next Steps (Priority Order)

1. **Create SEO Analytics Service** (`lib/services/seo-analytics.ts`)
   - Use existing `GTMAPIClient`
   - Orchestrate multiple SEO tools for each keyword
   - Aggregate results and generate insights
   - Return structured analytics data

2. **Update API Route** (`app/api/agents/[agentId]/run/route.ts`)
   - Add SEO analytics implementation (similar to bulk agent)
   - Use `GTMAPIClient` to call SEO tools
   - Process responses and create analytics resources
   - Update batch status

3. **Test End-to-End**
   - Test with sample keywords
   - Verify analytics resources created
   - Check usage tracking (handled by GTM backend)
   - Verify cost calculation

4. **Optional: Enhance with SERP Service** (Phase 2)
   - If needed, integrate SERP service for additional data
   - Deploy as Supabase Edge Function
   - Add to SEO analytics service

---

## Cost Considerations

**SEO API Costs (estimated per 1000 keywords):**
- SerpAPI: ~$50-100
- DataForSEO: ~$30-80
- SEMrush: ~$100-200 (if API access included)
- Ahrefs: ~$200-500 (if API access included)

**Recommendation:** Start with SerpAPI or DataForSEO for cost-effectiveness.

