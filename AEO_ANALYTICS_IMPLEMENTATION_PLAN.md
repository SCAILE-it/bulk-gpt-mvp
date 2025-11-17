# AEO Analytics Agent - Implementation Plan

**Date:** 2025-01-16  
**Agent ID:** `aeo_analytics` (renamed from `seo_analytics`)  
**Status:** 📋 Planning Phase

---

## Overview

Implement AEO (Answer Engine Optimization) Analytics agent that **analyzes keywords and provides comprehensive AEO insights** using the existing GTM backend SEO tools.

**Key Points:**
- **Analytics ONLY** - This agent analyzes and provides insights/metrics, but does NOT generate content
- **Content generation is separate** - The `seo_content_writer` agent handles content generation
- **Uses SEO tools, labeled as AEO** - We use existing SEO tools but present everything as AEO analytics
- **Why AEO?** AEO is the hot term for 2025 - focusing on optimizing for AI-powered answer engines (ChatGPT, Perplexity, Claude, etc.) in addition to traditional search engines

**What This Agent Does:**
- ✅ Analyzes keywords for AEO potential
- ✅ Provides metrics (volume, difficulty, rankings, SERP features)
- ✅ Generates insights and recommendations
- ❌ Does NOT generate content (that's the content writer agent)

**DRY Principles (Don't Repeat Yourself):**
- ✅ **Reuse** `AgentRunModal` - Only add domain input field
- ✅ **Reuse** `ResourceDetail` - Extend existing switch statement
- ✅ **Reuse** `ResourceCard` - Extend existing formatResourceData
- ✅ **Reuse** `GTMAPIClient` - Same as bulk agent
- ✅ **Reuse** All UI components (`Badge`, `Card`, `Progress`, etc.)
- ✅ **Follow** bulk agent patterns exactly
- ❌ **Don't create** duplicate components
- ❌ **Don't reinvent** existing patterns

---

## Current State

### ✅ What We Have

1. **GTM Backend** (`https://scaile--g-mcp-tools-v2-api.modal.run`)
   - Already working and used by bulk agent
   - Has comprehensive SEO/AEO tools

2. **GTMAPIClient** (`lib/api/gtm-client.ts`)
   - Already implemented
   - Authentication working
   - Used by bulk agent successfully

3. **Agent Definition**
   - Database entry exists (`seo_analytics`)
   - Need to rename to `aeo_analytics`

4. **API Route Structure**
   - `/api/agents/[agentId]/run` exists but is stubbed
   - Pattern already established by bulk agent

### ⚠️ What Needs to Be Done

1. Rename agent from `seo_analytics` to `aeo_analytics`
2. Create AEO analytics service
3. Implement API route
4. Create analytics resources
5. Update UI components

---

## Available GTM Backend Tools

### AEO-Specific Tools

1. **`aeo-health-check`**
   - Endpoint: `/analysis/aeo-health-check`
   - Inputs: `domain`
   - Purpose: Analyze Answer Engine Optimization health

2. **`aeo-mentions`**
   - Endpoint: `/analysis/aeo-mentions`
   - Inputs: `brand`, `timeframe`
   - Purpose: Track brand mentions in answer engines

### SEO Tools (Used for AEO Analytics - Labeled as AEO)

**Note:** These are SEO tools, but we present all results as AEO analytics.

3. **`keyword-intelligence`**
   - Endpoint: `/analysis/keyword-intelligence`
   - Inputs: `keyword`, `domain`
   - Purpose: Analyze keyword metrics and AEO potential (presented as AEO intelligence)

4. **`keyword-ranking`**
   - Endpoint: `/analysis/keyword-ranking`
   - Inputs: `keyword`, `domain`
   - Purpose: Check ranking positions (presented as AEO ranking analysis)

5. **`serp-features`**
   - Endpoint: `/analysis/serp-features`
   - Inputs: `keyword`
   - Purpose: Detect SERP features including answer boxes (key for AEO)

6. **`keyword-volume`**
   - Endpoint: `/analysis/keyword-volume`
   - Inputs: `keyword`
   - Purpose: Estimate search volume (presented as AEO volume metrics)

7. **`keyword-difficulty`**
   - Endpoint: `/analysis/keyword-difficulty`
   - Inputs: `keyword`
   - Purpose: Estimate ranking difficulty (presented as AEO competition)

8. **`keyword-intent`**
   - Endpoint: `/analysis/keyword-intent`
   - Inputs: `keyword`
   - Purpose: Classify search intent (important for AEO optimization)

---

## Implementation Plan

### Phase 1: Database & Types Update

#### 1.1 Update Agent Definition
**File:** `supabase/migrations/20250116000001_rename_seo_to_aeo_analytics.sql`

```sql
-- Rename seo_analytics to aeo_analytics
UPDATE agent_definitions 
SET 
  id = 'aeo_analytics',
  name = 'AEO Analytics',
  description = 'Analyze keywords and AEO metrics for Answer Engine Optimization',
  updated_at = NOW()
WHERE id = 'seo_analytics';

-- Update modal_endpoint
UPDATE agent_definitions
SET modal_endpoint = 'gtm://aeo_analytics'
WHERE id = 'aeo_analytics';
```

**Note:** `modal_endpoint` uses `gtm://` prefix to indicate it uses GTM backend, not a separate Modal deployment.

#### 1.2 Update TypeScript Types
**File:** `lib/types/agents.ts`
- No changes needed (uses string IDs)

**File:** `lib/types/resources.ts`
- Ensure `analytics` type is supported ✅ (already done)

---

### Phase 2: AEO Analytics Service

#### 2.1 Create AEO Analytics Service
**File:** `lib/services/aeo-analytics.ts` (NEW)

**Responsibilities:**
- Accept keyword resources from database
- Orchestrate multiple GTM backend tool calls
- Aggregate results
- Generate insights and recommendations
- Return structured analytics data

**Function Signature:**
```typescript
interface AEOAnalyticsRequest {
  keywords: Array<{
    id: string
    keyword: string
    domain?: string  // Optional: user's domain for ranking checks
  }>
  businessContext?: {
    domain?: string
    brand?: string
  }
}

interface AEOAnalyticsResult {
  keyword: string
  keywordId: string
  
  // Metrics from various tools
  metrics: {
    // From keyword-intelligence
    intelligence?: {
      seo_potential: number
      competition_level: string
      opportunity_score: number
    }
    
    // From keyword-volume
    search_volume?: number
    
    // From keyword-difficulty
    difficulty?: number
    
    // From keyword-intent
    intent?: {
      type: 'informational' | 'navigational' | 'transactional' | 'commercial'
      confidence: number
    }
    
    // From keyword-ranking (if domain provided)
    current_ranking?: {
      position: number | null
      url?: string
      answer_engine_ranking?: number | null
    }
    
    // From serp-features
    serp_features?: {
      featured_snippet: boolean
      people_also_ask: boolean
      related_searches: boolean
      answer_box: boolean
    }
  }
  
  // AEO-specific insights (ANALYTICS ONLY - no content)
  aeo_insights: {
    answer_engine_optimization_score: number
    answer_box_opportunity: boolean
    featured_snippet_opportunity: boolean
    content_strategy_suggestions: string[]  // High-level strategy, not generated content
    optimization_recommendations: string[]  // What to optimize, not actual content
  }
  
  // Overall insights (analytical, not generative)
  insights: string  // Analysis of the keyword's AEO potential
  recommendations: string[]  // Strategic recommendations (not content)
  
  // Metadata
  metadata: {
    tools_used: string[]
    execution_time_ms: number
    timestamp: string
  }
}

async function analyzeAEOKeywords(
  request: AEOAnalyticsRequest,
  authToken: string
): Promise<AEOAnalyticsResult[]>
```

**Implementation Strategy:**
1. For each keyword, call tools in parallel where possible:
   - `keyword-intelligence` (main AEO analysis)
   - `keyword-volume` (AEO volume metrics)
   - `keyword-difficulty` (AEO competition level)
   - `keyword-intent` (intent classification for AEO)
   - `serp-features` (SERP analysis - key for answer boxes)
   - `keyword-ranking` (AEO ranking positions, if domain provided)

2. Aggregate results into unified AEO analytics structure

3. Generate AEO-specific insights (ANALYTICS ONLY - no content generation):
   - Answer engine optimization score
   - Answer box opportunities (identify, don't create)
   - Featured snippet opportunities (identify, don't create)
   - Strategic recommendations (what to do, not actual content)
   - Content strategy suggestions (high-level, not generated content)

4. Return structured analytics results

**Important:** This service provides analysis and recommendations only. Actual content generation is handled by the separate `seo_content_writer` agent.

---

### Phase 3: API Route Implementation

#### 3.1 Update Agent Run Route
**File:** `app/api/agents/[agentId]/run/route.ts`

**Changes:**
1. Check if `agentId === 'aeo_analytics'`
2. Fetch keyword resources from database (using `input_resource_ids`)
3. Get user's business context (domain, brand)
4. Call AEO analytics service
5. Create analytics resources in database
6. Update batch status
7. Track usage

**Flow:**
```typescript
// 1. Authenticate
const user = await getUser()

// 2. Verify agent
const agent = await getAgent('aeo_analytics')

// 3. Get input keywords
const keywords = await getKeywordResources(input_resource_ids)

// 4. Get business context
const businessContext = await getBusinessContext(user.id)

// 5. Call AEO analytics service
const gtmClient = new GTMAPIClient({ authToken: session.access_token })
const results = await analyzeAEOKeywords({
  keywords: keywords.map(k => ({
    id: k.id,
    keyword: k.data.keyword,
    domain: businessContext.domain
  })),
  businessContext: {
    domain: businessContext.domain,
    brand: businessContext.brand
  }
}, session.access_token)

// 6. Create analytics resources
for (const result of results) {
  await createAnalyticsResource({
    type: 'analytics',
    data: result,
    source_type: 'generated',
    source_name: 'AEO Analytics',
    agent_id: 'aeo_analytics',
    batch_id: batchId,
    related_resource_ids: [result.keywordId]
  })
}

// 7. Update batch status
await updateBatchStatus(batchId, 'completed')
```

---

### Phase 4: Resource Creation

#### 4.1 Analytics Resource Schema
**Type:** `analytics` (already supported)

**Data Structure:**
```json
{
  "keyword": "saas marketing tools",
  "keywordId": "resource-id-123",
  
  "metrics": {
    "intelligence": {
      "seo_potential": 75,
      "competition_level": "medium",
      "opportunity_score": 0.8
    },
    "search_volume": 1200,
    "difficulty": 45,
    "intent": {
      "type": "commercial",
      "confidence": 0.9
    },
    "current_ranking": {
      "position": 12,
      "url": "https://example.com/page",
      "answer_engine_ranking": null
    },
    "serp_features": {
      "featured_snippet": true,
      "people_also_ask": true,
      "related_searches": true,
      "answer_box": false
    }
  },
  
  "aeo_insights": {
    "answer_engine_optimization_score": 68,
    "answer_box_opportunity": true,
    "featured_snippet_opportunity": true,
    "content_strategy_suggestions": [
      "Consider creating FAQ-style content",
      "Focus on concise, structured answers",
      "Target featured snippet format"
    ],
    "optimization_recommendations": [
      "Optimize existing content for featured snippet",
      "Add structured data markup",
      "Improve answer box eligibility"
    ]
  },
  
  "insights": "This keyword has medium competition with good AEO potential. Featured snippet is available but not captured yet. Answer box opportunity exists.",
  "recommendations": [
    "Focus on featured snippet optimization strategy",
    "Consider FAQ-style content approach",
    "Target answer box with concise, structured format"
  ],
  
  "metadata": {
    "tools_used": [
      "keyword-intelligence",
      "keyword-volume",
      "keyword-difficulty",
      "keyword-intent",
      "serp-features",
      "keyword-ranking"
    ],
    "execution_time_ms": 2500,
    "timestamp": "2025-01-16T10:30:00Z"
  }
}
```

---

### Phase 5: UI Updates (DRY - Reuse Existing Components)

#### 5.1 Agent Run Modal (REUSE Existing)
**File:** `components/agents/AgentRunModal.tsx`

**Current State:** ✅ Already handles keyword selection, scheduling, config

**For AEO Analytics - MINIMAL CHANGES:**
- ✅ Keyword selection already works (when `input_type === 'keywords'`)
- ✅ Shows checkbox list of available keywords (reused from existing code)
- ✅ Scheduling already works (when `can_schedule === true`)
- ⚠️ **Add optional domain input** (small addition, follows existing pattern):
  ```tsx
  {agent.id === 'aeo_analytics' && (
    <div>
      <Label htmlFor="domain" className="text-sm">
        Your Domain (Optional)
      </Label>
      <Input
        id="domain"
        placeholder="example.com"
        value={(config.domain as string) || ''}
        onChange={(e) => setConfig({ ...config, domain: e.target.value })}
      />
      <p className="text-xs text-muted-foreground mt-1">
        Provide your domain to check current rankings for these keywords
      </p>
    </div>
  )}
  ```

**Pattern:** Follows same pattern as `seo_content_writer` config in existing code

**UI Flow:**
1. User clicks "Run Now" on AEO Analytics agent card
2. Modal opens showing:
   - Agent info (Input: keywords, Output: analytics)
   - Keyword selection (checkboxes from available keywords)
   - Optional domain input field
   - Schedule option (can enable recurring runs)
   - "Run Now" button
3. User selects keywords (required)
4. User optionally enters domain
5. User optionally enables schedule
6. User clicks "Run Now"
7. Toast notification: "Started AEO Analytics (Batch: batch-123)"
8. Modal closes
9. Agent card shows "Running" status
10. When complete, analytics resources are created

#### 5.2 Update Agent Definition Display (REUSE Existing)
**File:** `components/agents/AgentsList.tsx`

**Changes:** MINIMAL
- Update icon mapping: `case 'aeo_analytics': return BarChart3` (follows existing pattern)
- Display name comes from database (already updated via migration)
- Description comes from database
- All other logic REUSED from existing code

#### 5.3 Analytics Resource Display (EXTEND Existing ResourceDetail)
**File:** `components/resources/ResourceDetail.tsx` (EXTEND, don't create new)

**DRY Approach:**
- ✅ REUSE existing `ResourceDetail` component
- ✅ REUSE existing data display patterns
- ⚠️ **Add analytics-specific rendering** in the existing `resource.type === 'content'` pattern

**Implementation (DRY):**
```tsx
// In ResourceDetail.tsx, extend the existing display logic:

{resource.type === 'content' && data.content ? (
  // Existing content rendering
) : resource.type === 'analytics' && resource.agent_id === 'aeo_analytics' ? (
  // NEW: Analytics-specific rendering (reuse same card/badge patterns)
  <AnalyticsDataDisplay data={data} />
) : (
  // Existing generic display (REUSED)
  Object.entries(data).map(...)
)}
```

**Create:** `components/resources/AnalyticsDataDisplay.tsx` (small helper component)
- Reuses existing UI components: `Badge`, `Card`, `Progress` from `@/components/ui`
- Follows same visual patterns as existing resource displays
- Uses same spacing, typography, colors as bulk agent

**Pattern:** Same as how `ContentEditor` is used - small specialized component, reused in `ResourceDetail`

#### 5.4 Resource Card Display (EXTEND Existing)
**File:** `components/resources/ResourceCard.tsx` (EXTEND, don't create new)

**DRY Approach:**
- ✅ REUSE existing `ResourceCard` component
- ✅ REUSE existing `formatResourceData` function
- ⚠️ **Add analytics case** to existing switch statement:

```tsx
// In ResourceCard.tsx, extend formatResourceData:
case 'analytics':
  return {
    title: data.keyword as string || 'AEO Analytics',
    subtitle: `AEO Score: ${data.aeo_insights?.answer_engine_optimization_score || 'N/A'}/100`,
    metadata: data.insights || '',
  }
```

**Pattern:** Same as existing `lead`, `keyword`, `content`, `campaign` cases - just add one more case

#### 5.5 Results View After Completion (REUSE Existing)
**File:** `components/agents/AgentsList.tsx`

**After agent completes:**
- ✅ Show success status (REUSED from existing code)
- ✅ Link to view resources (REUSED from existing patterns)
- ✅ Show count (REUSED from existing batch completion logic)
- ✅ Quick link to `/resources?type=analytics&agent_id=aeo_analytics` (REUSED URL pattern)

**No new components needed** - all handled by existing agent status display and resource linking

---

## Implementation Steps

### Step 1: Database Migration
1. Create migration to rename `seo_analytics` to `aeo_analytics`
2. Update `modal_endpoint` to `gtm://aeo_analytics`
3. Run migration

### Step 2: Create AEO Analytics Service
1. Create `lib/services/aeo-analytics.ts`
2. Implement `analyzeAEOKeywords` function
3. Use `GTMAPIClient` to call tools
4. Aggregate results
5. Generate insights

### Step 3: Update API Route
1. Update `app/api/agents/[agentId]/run/route.ts`
2. Add AEO analytics handling
3. Fetch keyword resources
4. Call AEO analytics service
5. Create analytics resources
6. Update batch status

### Step 4: Test
1. Test with sample keywords
2. Verify analytics resources created
3. Check data structure
4. Verify insights generation

### Step 5: UI Updates
1. Update agent display name
2. Create analytics resource display component
3. Test UI flow

---

## Error Handling

### GTM Backend Errors
- Handle tool failures gracefully
- Continue with available data if some tools fail
- Log errors for debugging
- Return partial results if possible

### Missing Data
- Handle missing keyword resources
- Handle missing business context
- Provide defaults where appropriate

### Rate Limiting
- GTM backend handles rate limiting
- Client has retry logic built-in
- Handle 429 errors appropriately

---

## Performance Considerations

### Parallel Tool Calls
- Call independent tools in parallel
- Use `Promise.all()` for concurrent requests
- Batch similar requests where possible

### Caching
- Consider caching keyword analysis results
- Cache business context
- Use database for persistent caching

### Timeouts
- Set appropriate timeouts per tool
- Handle long-running analyses
- Provide progress updates for large batches

---

## Testing Strategy

### Unit Tests
- Test AEO analytics service
- Test result aggregation
- Test insight generation

### Integration Tests
- Test API route with mock GTM backend
- Test resource creation
- Test error handling

### E2E Tests
- Test full flow: keyword selection → analysis → resource creation
- Test with real GTM backend (staging)
- Verify analytics resources display correctly

---

## Success Criteria

1. ✅ Agent renamed to `aeo_analytics`
2. ✅ AEO analytics service created and working
3. ✅ API route handles AEO analytics requests
4. ✅ Analytics resources created correctly
5. ✅ Insights and recommendations generated
6. ✅ UI displays AEO analytics correctly
7. ✅ Error handling works properly
8. ✅ Performance is acceptable (< 5s per keyword)

---

## Future Enhancements (Phase 2)

1. **Historical Tracking**
   - Track ranking changes over time
   - Show trends in analytics

2. **Competitor Analysis**
   - Compare with competitor rankings
   - Identify opportunities

3. **Integration with Content Writer**
   - Link analytics results to content writer agent
   - Pass recommendations as context for content generation
   - Note: Content generation remains in separate agent

4. **Scheduling**
   - Enable scheduled AEO analysis
   - Track changes over time

5. **Dashboard Integration**
   - Show AEO metrics on dashboard
   - Track overall AEO health

**Important:** Content generation will always remain in the separate `seo_content_writer` agent. This agent focuses purely on analytics and insights.

---

## Files to Create/Modify (DRY Approach)

### New Files (Only 3)
1. `lib/services/aeo-analytics.ts` - AEO analytics service (new business logic)
2. `supabase/migrations/20250116000001_rename_seo_to_aeo_analytics.sql` - Database migration
3. `components/resources/AnalyticsDataDisplay.tsx` - Small helper component (reuses `Badge`, `Card`, `Progress` from UI)

### Files to EXTEND (Minimal Changes - Follow Existing Patterns)
1. `components/agents/AgentRunModal.tsx` - Add domain input (follows `seo_content_writer` pattern)
2. `components/agents/AgentsList.tsx` - Add icon mapping (one line: `case 'aeo_analytics': return BarChart3`)
3. `components/resources/ResourceDetail.tsx` - Add analytics case to existing switch (like `content` case)
4. `components/resources/ResourceCard.tsx` - Add analytics case to existing switch (like `keyword` case)
5. `app/api/agents/[agentId]/run/route.ts` - Add AEO handling (follows bulk agent pattern)

### Files REUSED As-Is (No Changes)
- ✅ `components/resources/ResourcesList.tsx` - Already handles all resource types
- ✅ `components/ui/*` - All UI components reused
- ✅ `lib/api/gtm-client.ts` - Already used by bulk agent
- ✅ `lib/types/resources.ts` - Already supports analytics type
- ✅ `lib/types/agents.ts` - Already supports all needed types
- ✅ All existing patterns, styles, and components

### DRY Summary
- **New Components:** 1 (small helper)
- **Extended Components:** 4 (minimal additions)
- **Reused Components:** All existing UI, patterns, and infrastructure
- **Pattern:** Follow bulk agent exactly - same structure, same components, same patterns

---

## Dependencies

- ✅ `GTMAPIClient` - Already exists
- ✅ `lib/types/gtm-types.ts` - Already exists
- ✅ `lib/types/resources.ts` - Already exists
- ✅ Database schema - Already supports analytics resources

---

## Timeline Estimate

- **Phase 1 (Database & Types):** 30 minutes
- **Phase 2 (AEO Service):** 2-3 hours
- **Phase 3 (API Route):** 1-2 hours
- **Phase 4 (Resource Creation):** 1 hour
- **Phase 5 (UI Updates):** 1-2 hours
- **Testing:** 1-2 hours

**Total:** ~8-11 hours

---

## Notes

- **DRY Principle** - Reuse existing components, don't create duplicates
- **Analytics ONLY** - This agent analyzes and provides insights, does NOT generate content
- **Content generation is separate** - The `seo_content_writer` agent handles all content generation
- **Uses SEO tools, labeled as AEO** - We use existing SEO tools but present everything as AEO analytics
- **Component Reuse:**
  - ✅ `AgentRunModal` - Reuse with small addition (domain input)
  - ✅ `ResourceDetail` - Extend existing component (add analytics case)
  - ✅ `ResourceCard` - Extend existing component (add analytics case)
  - ✅ `ResourcesList` - Already handles all resource types (no changes)
  - ✅ UI components - Reuse `Badge`, `Card`, `Progress` from `@/components/ui`
- GTM backend already has all needed tools
- No new backend deployment needed
- Follow bulk agent patterns exactly
- Focus on answer engine optimization insights and recommendations (not actual content)

