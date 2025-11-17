# Next Steps - Prioritized Action Plan

**Current Status:** ✅ Phase 1 Complete  
**Date:** January 2025

---

## 🎯 Immediate Next Steps (This Week)

### 1. Testing & Validation (HIGH PRIORITY)

**Goal:** Verify everything works end-to-end

**Tasks:**
- [ ] **Test Resources Page**
  - Navigate to `/resources`
  - Verify all 4 tabs load without errors
  - Test pagination (if you have >20 resources)
  - Test search functionality
  - Test filters (source type, source name)
  - Verify empty states display correctly

- [ ] **Test Agents Page**
  - Navigate to `/agents`
  - Verify 9 agents load from database (not 6!)
  - Check stats display (should show real data or zeros)
  - Verify PackageRunsSection doesn't break for self-service users
  - Test "Run Now" button (creates batch)

- [ ] **Test Business Context**
  - Navigate to `/context` → "Business Context" tab
  - Fill out form and save
  - Refresh page - verify data persists
  - Test all fields (ICP, countries, products, keywords)

- [ ] **Test Batch → Resources Flow**
  - Run bulk agent with CSV
  - Wait for batch to complete
  - Check `/resources` → Content tab
  - Verify resources were created automatically
  - Check resource has correct `batch_id` and `agent_id`

### 2. Fix Agent Count Mismatch (MEDIUM PRIORITY)

**Issue:** Database has 9 agents, but code expects 6

**Check:**
```sql
SELECT id, name FROM agent_definitions WHERE enabled = true;
```

**Fix:**
- Update `AgentsList` to handle all 9 agents
- Update agent icon mapping if needed
- Verify all agent IDs match between:
  - Database (`agent_definitions.id`)
  - `batch-to-resources.ts` mapping
  - Mock data (if still referenced)

### 3. Handle Legacy Batches (LOW PRIORITY)

**Issue:** Existing batches without `agent_id` won't create resources

**Options:**
- **Option A:** Leave as-is (by design - legacy batches)
- **Option B:** Create migration script to backfill resources from old batches
- **Option C:** Add UI to manually trigger resource creation for old batches

**Recommendation:** Option A (leave as-is) - focus on new batches going forward

---

## 🔮 Phase 2: Enhancements (Next 2 Weeks)

### 1. Manual Resource Creation UI (MEDIUM PRIORITY)

**Goal:** Allow users to manually create resources

**Tasks:**
- [ ] Create `CreateResourceModal.tsx` component
- [ ] Add resource type selector
- [ ] Create type-specific forms:
  - Lead form (email, name, company, etc.)
  - Keyword form (keyword, search_volume, etc.)
  - Content form (title, content, type)
  - Campaign form (name, type, target leads, etc.)
- [ ] Connect to POST `/api/resources`
- [ ] Add validation
- [ ] Show success/error toasts

**Files to Create:**
- `components/resources/CreateResourceModal.tsx`
- Or separate: `CreateLeadModal.tsx`, `CreateKeywordModal.tsx`, etc.

### 2. Resource Linking & Relationships (MEDIUM PRIORITY)

**Goal:** Link resources to each other (e.g., campaigns → leads)

**Tasks:**
- [ ] Add `related_resource_ids` field to resources table (or use tags)
- [ ] Update resource detail modal to show relationships
- [ ] Add UI to link resources
- [ ] Update campaign resources to link to lead/content resources

### 3. Resource Export (LOW PRIORITY)

**Goal:** Export resources to CSV/JSON

**Tasks:**
- [ ] Add export button to Resources page
- [ ] Create export API endpoint
- [ ] Support CSV and JSON formats
- [ ] Include filters in export

### 4. Resource Bulk Actions (LOW PRIORITY)

**Goal:** Bulk operations on resources

**Tasks:**
- [ ] Add checkbox selection to resource cards
- [ ] Add bulk actions toolbar (delete, tag, export)
- [ ] Create bulk operations API endpoints

---

## 🚀 Phase 3: Agent Execution UI (Future)

### 1. Agent Run Modal (HIGH PRIORITY)

**Goal:** UI for running agents with configuration

**Tasks:**
- [ ] Create `AgentRunModal.tsx` component
- [ ] Show agent-specific input forms
- [ ] Handle input resource selection (for agents that need leads/keywords)
- [ ] Add configuration options
- [ ] Add schedule option (for schedulable agents)
- [ ] Connect to POST `/api/agents/[agentId]/run`
- [ ] Show batch status/progress

### 2. Real-time Batch Updates (MEDIUM PRIORITY)

**Goal:** Show batch progress in real-time

**Tasks:**
- [ ] Add WebSocket or polling for batch status
- [ ] Update agent cards with running status
- [ ] Show progress indicators
- [ ] Update resources list as they're created

### 3. Agent Scheduling UI (MEDIUM PRIORITY)

**Goal:** Schedule recurring agent runs

**Tasks:**
- [ ] Add schedule configuration to AgentRunModal
- [ ] Show scheduled runs in AgentsList
- [ ] Add schedule management UI
- [ ] Connect to scheduled_runs table

---

## 🐛 Bug Fixes & Improvements

### 1. Resource Deduplication (MEDIUM PRIORITY)

**Issue:** Same batch can create duplicate resources if run twice

**Solution:**
- Add unique constraint or check before creating
- Use `batch_id + row_index` as unique key
- Or add deduplication logic based on resource data

### 2. Error Handling Improvements (LOW PRIORITY)

**Tasks:**
- [ ] Better error messages in resource creation
- [ ] Retry logic for failed resource creation
- [ ] User-facing error notifications
- [ ] Error recovery UI

### 3. Performance Optimizations (LOW PRIORITY)

**Tasks:**
- [ ] Add caching for agent definitions
- [ ] Optimize resource queries with better indexes
- [ ] Batch resource creation more efficiently
- [ ] Add pagination to agent stats calculation

---

## 📊 Analytics & Reporting (Future)

### 1. Resource Analytics Dashboard

**Tasks:**
- [ ] Show resource growth over time
- [ ] Show resource sources breakdown
- [ ] Show resource types distribution
- [ ] Show top agents by resource creation

### 2. Agent Performance Dashboard

**Tasks:**
- [ ] Show agent success rates over time
- [ ] Show average execution times
- [ ] Show resource creation rates per agent
- [ ] Show cost per resource

---

## 🎯 Recommended Order

### Week 1: Testing & Fixes
1. ✅ Test all current functionality
2. ✅ Fix agent count mismatch
3. ✅ Fix any bugs found during testing
4. ✅ Verify batch → resources flow works

### Week 2: Manual Resource Creation
1. ✅ Create resource creation modals
2. ✅ Add validation
3. ✅ Test manual creation flow

### Week 3: Agent Run Modal
1. ✅ Create AgentRunModal component
2. ✅ Add agent-specific forms
3. ✅ Connect to API
4. ✅ Test agent execution flow

### Week 4: Polish & Enhancements
1. ✅ Resource linking
2. ✅ Export functionality
3. ✅ Real-time updates
4. ✅ Performance optimizations

---

## 🚨 Critical Issues to Address First

1. **Agent ID Mismatch** - Database has 9 agents, code might expect different IDs
2. **Testing** - Need to verify everything works before adding more features
3. **Error Handling** - Resource creation failures should be visible to users

---

## 📝 Notes

- **Focus on testing first** - Make sure Phase 1 works before Phase 2
- **Manual resource creation** is nice-to-have, not critical
- **Agent Run Modal** is important for user experience
- **Real-time updates** can wait until core functionality is solid

---

**Next Immediate Action:** Test the current implementation end-to-end

