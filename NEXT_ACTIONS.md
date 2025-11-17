# Next Actions - GTM Engine Implementation

**Status:** ✅ Phase 1 (UI + Supabase) Complete  
**Date:** January 2025

---

## 🚨 CRITICAL: Run Database Migrations First

**Before anything else works, you MUST run these migrations:**

```bash
cd /Users/federicodeponte/bulk-gpt-mvp-code
supabase migration up
```

**Or via Supabase Dashboard:**
1. Go to SQL Editor in Supabase Dashboard
2. Run each migration file in order:
   - `20250115000000_create_resources.sql`
   - `20250115000001_create_business_contexts.sql`
   - `20250115000002_create_agent_definitions.sql`
   - `20250115000003_add_agent_id_to_batches.sql`

**Verify migrations:**
```sql
-- Check resources table exists
SELECT * FROM resources LIMIT 1;

-- Check agent_definitions seeded
SELECT COUNT(*) FROM agent_definitions; -- Should be 6

-- Check business_contexts table exists
SELECT * FROM business_contexts LIMIT 1;
```

---

## ✅ Phase 1 Complete (What We Just Built)

- [x] Database migrations created
- [x] Resources API (GET, POST, PATCH, DELETE)
- [x] Resources page with tabs (Leads, Keywords, Content, Campaigns)
- [x] ResourceCard, ResourceDetail, ResourceFilters components
- [x] Pagination and search functionality
- [x] Business Context API and form
- [x] Agent Definitions API
- [x] Updated Agents page to fetch from database
- [x] Navigation updated with Resources link

---

## 🎯 Phase 2: Immediate Next Steps

### 1. Test Current Implementation (Priority: HIGH)

**After running migrations:**

1. **Test Resources Page**
   - Navigate to `/resources`
   - Verify all 4 tabs load (Leads, Keywords, Content, Campaigns)
   - Test pagination controls
   - Test search functionality
   - Test filters (source type, source name)
   - Try creating a resource manually via API/UI

2. **Test Agents Page**
   - Navigate to `/agents`
   - Verify agents load from database (should see 6 agents)
   - Check that agent definitions display correctly

3. **Test Business Context**
   - Navigate to `/context` → "Business Context" tab
   - Fill out ICP, countries, products
   - Save and verify it persists

### 2. Enhance Agent Stats (Priority: MEDIUM)

**Update `AgentsList` to show real stats from batches:**

**File:** `components/agents/AgentsList.tsx`

**Add API endpoint:** `app/api/agents/stats/route.ts`
```typescript
// Calculate real stats:
// - runsCount: COUNT(*) FROM batches WHERE agent_id = ?
// - successRate: COUNT(status='completed') / COUNT(*) * 100
// - lastRunAt: MAX(created_at) FROM batches WHERE agent_id = ?
// - averageExecutionTime: AVG(completed_at - created_at)
```

**Update AgentsList to fetch and display real stats**

### 3. Integrate Batch Processing with Resources (Priority: HIGH)

**When batches complete, create resources:**

**File:** `lib/batch-processing.ts` or wherever batch results are processed

**Add logic:**
```typescript
// After batch completes successfully:
// 1. Determine resource type based on agent_id
// 2. Transform batch results into resources
// 3. Create resources via POST /api/resources
// 4. Link resources to batch via batch_id
```

**Resource type mapping:**
- `bulk-agent` → `content` resources
- `lead-crawling-agent` → `lead` resources
- `aeo-domination-agent` → `content` resources
- `outbound-campaign-agent` → `campaign` resources
- etc.

### 4. Add Resource Creation UI (Priority: MEDIUM)

**Create modals/forms for manual resource creation:**

**Files to create:**
- `components/resources/CreateLeadModal.tsx`
- `components/resources/CreateKeywordModal.tsx`
- `components/resources/CreateContentModal.tsx`
- `components/resources/CreateCampaignModal.tsx`

**Or create unified:** `components/resources/CreateResourceModal.tsx` with type selector

---

## 🔮 Phase 3: Agent Execution Integration (Future)

### Agent Run Flow

1. **Create Agent Run Modal**
   - `components/agents/AgentRunModal.tsx`
   - Input selection (for agents that need leads/keywords)
   - Configuration form
   - Schedule option

2. **Agent Execution API**
   - `POST /api/agents/[agentId]/run`
   - Creates batch with `agent_id`
   - Calls Modal backend (or stubs for now)
   - Processes results → creates resources

3. **Real-time Updates**
   - WebSocket or polling for batch status
   - Update agent cards with running status
   - Show progress indicators

---

## 📋 Testing Checklist

### Resources Page
- [ ] All tabs load correctly
- [ ] Pagination works (Previous/Next buttons)
- [ ] Search filters resources correctly
- [ ] Source type filter works
- [ ] Source name filter populates correctly
- [ ] Resource cards display correctly
- [ ] Resource detail modal opens/closes
- [ ] Edit resource saves correctly
- [ ] Delete resource works
- [ ] Empty states show correctly

### Agents Page
- [ ] Agents load from database
- [ ] All 6 agents display
- [ ] Agent cards show correct info
- [ ] Stats display (even if 0 for now)

### Business Context
- [ ] Form loads existing data
- [ ] Save persists data
- [ ] All fields work (ICP, countries, products, keywords)

### API Endpoints
- [ ] `GET /api/resources` returns paginated results
- [ ] `POST /api/resources` creates resource
- [ ] `GET /api/resources/[id]` returns resource
- [ ] `PATCH /api/resources/[id]` updates resource
- [ ] `DELETE /api/resources/[id]` deletes resource
- [ ] `GET /api/agent-definitions` returns agents
- [ ] `GET /api/business-context` returns context
- [ ] `PUT /api/business-context` saves context

---

## 🐛 Known Issues / TODOs

1. **Agent stats are stubbed** - Need to calculate from batches table
2. **Resource creation UI missing** - Only API endpoint exists
3. **Batch → Resources integration** - Need to create resources when batches complete
4. **Search query syntax** - The `.or()` query might need adjustment for Supabase
5. **Error handling** - Add better error messages and retry logic

---

## 📚 Documentation Updates Needed

- [ ] Update README with new Resources page
- [ ] Document API endpoints
- [ ] Add examples for creating resources
- [ ] Document agent definitions structure

---

## 🎯 Success Criteria

Phase 1 is complete when:
- ✅ All migrations run successfully
- ✅ Resources page loads and displays data
- ✅ CRUD operations work on resources
- ✅ Agents page shows database-driven agents
- ✅ Business context saves/loads correctly

**You're ready to move to Phase 2 when:**
- All Phase 1 tests pass
- Resources are being created from batch processing
- Agent stats show real data

---

**Next Command to Run:**
```bash
# 1. Run migrations
supabase migration up

# 2. Start dev server and test
npm run dev

# 3. Navigate to http://localhost:3000/resources
```

