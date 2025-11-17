# GTM Engine - Phase 1 Implementation

## 🎯 Overview

This implementation adds the foundational infrastructure for the GTM Engine transformation:
- **Resources System** - Unified storage for leads, keywords, content, and campaigns
- **Agent Definitions** - Database-driven agent system
- **Business Context** - User business profile management
- **Package System** - Agency/client package management
- **Automatic Resource Creation** - Resources created from batch results

---

## 🚀 Quick Start

### 1. Database Migrations

Migrations are handled by another agent. Ensure these are applied:
- `20250115000000_create_resources.sql`
- `20250115000001_create_business_contexts.sql`
- `20250115000002_create_agent_definitions.sql`
- `20250115000003_add_agent_id_to_batches.sql`

### 2. Verify Setup

```bash
# Check agents are seeded
# Should return 6 agents
SELECT COUNT(*) FROM agent_definitions;

# Check resources table exists
SELECT * FROM resources LIMIT 1;
```

### 3. Test the System

1. **Resources Page:** Navigate to `/resources`
   - Should see 4 tabs: Leads, Keywords, Content, Campaigns
   - Empty states should display

2. **Agents Page:** Navigate to `/agents`
   - Should see 6 agents from database
   - Stats should show real data (or zeros if no batches yet)

3. **Business Context:** Navigate to `/context` → "Business Context" tab
   - Form should load and save

---

## 📋 Key Components

### Resources System

**Page:** `/resources`

**Features:**
- 4 tabs: Leads, Keywords, Content, Campaigns
- Pagination (20 per page)
- Search across resource data
- Filter by source type (customer/tool/generated)
- Filter by source name
- View/edit/delete resources
- Resource detail modal

**API:** `/api/resources`

### Agents System

**Page:** `/agents`

**Features:**
- Database-driven agent list
- Real statistics from batches
- Package runs section (for clients)
- Agent status (idle/running/completed)

**API:** 
- `/api/agent-definitions` - List agents
- `/api/agents/stats` - Get stats
- `/api/agents/[agentId]/run` - Run agent

### Business Context

**Page:** `/context` → "Business Context" tab

**Features:**
- ICP (Ideal Customer Profile)
- Target countries
- Products
- Target keywords
- Competitor keywords

**API:** `/api/business-context`

### Batch → Resources Integration

**Automatic:** When batches complete, resources are created automatically

**Mapping:**
- `bulk-agent` → `content` resources
- `lead-crawling-agent` → `lead` resources
- `aeo-domination-agent` → `content` resources
- `outbound-campaign-agent` → `campaign` resources
- `market-analytics-agent` → `keyword` resources

**Files:**
- `lib/utils/batch-to-resources.ts` - Transformation logic
- Integrated into webhook callback and process route

---

## 🔧 Configuration

### Agent IDs

Agent IDs must match exactly between:
- `agent_definitions.id` (database)
- `batch-to-resources.ts` mapping
- Agent run API calls

Current agent IDs:
- `bulk-agent`
- `lead-crawling-agent`
- `aeo-domination-agent`
- `outbound-campaign-agent`
- `gtm-analytics-agent`
- `market-analytics-agent`

---

## 🐛 Troubleshooting

### Resources Not Created

1. **Check batch has agent_id:**
   ```sql
   SELECT id, agent_id FROM batches WHERE id = 'your_batch_id';
   ```

2. **Check batch_results exist:**
   ```sql
   SELECT COUNT(*) FROM batch_results WHERE batch_id = 'your_batch_id' AND status = 'success';
   ```

3. **Check logs:**
   - Look for `[RESOURCES]` logs in development mode
   - Check error logs for resource creation failures

### Agent Stats Show Zeros

1. **Check batches exist:**
   ```sql
   SELECT COUNT(*) FROM batches WHERE agent_id = 'bulk-agent';
   ```

2. **Verify stats API:**
   ```bash
   curl http://localhost:3000/api/agents/stats
   ```

### PackageRunsSection Not Showing

- **Expected:** Only shows for client users with assigned packages
- **Self-service users:** Won't see this section (by design)
- **Check user type:**
  ```sql
  SELECT user_type FROM user_profiles WHERE user_id = 'your_user_id';
  ```

---

## 📚 API Reference

### Resources API

**List Resources:**
```bash
GET /api/resources?type=lead&page=1&limit=20&search=email
```

**Create Resource:**
```bash
POST /api/resources
{
  "type": "lead",
  "data": { "email": "test@example.com", "name": "Test" },
  "source_type": "customer",
  "source_name": "manual"
}
```

**Get Resource:**
```bash
GET /api/resources/[id]
```

**Update Resource:**
```bash
PATCH /api/resources/[id]
{
  "data": { "email": "updated@example.com" }
}
```

**Delete Resource:**
```bash
DELETE /api/resources/[id]
```

### Agent Stats API

**Get Stats:**
```bash
GET /api/agents/stats
```

Returns:
```json
{
  "stats": {
    "bulk-agent": {
      "runsCount": 10,
      "successRate": 95,
      "lastRunAt": "2025-01-15T10:00:00Z",
      "averageExecutionTime": 45.2,
      "currentJobId": null
    }
  }
}
```

---

## 🎯 Next Steps

1. **Test end-to-end:**
   - Run an agent
   - Verify batch completes
   - Check resources are created
   - View resources in `/resources` page

2. **Add manual resource creation UI:**
   - Create modals for each resource type
   - Add forms with validation

3. **Enhance resource display:**
   - Add resource linking
   - Add bulk actions
   - Add export functionality

4. **Add resource analytics:**
   - Show resource usage stats
   - Track resource sources
   - Show resource growth over time

---

## 📝 Notes

- **Legacy Batches:** Batches without `agent_id` won't create resources (by design)
- **Resource Deduplication:** Not implemented - same batch can create duplicates
- **Error Handling:** Resource creation failures are logged but don't fail webhooks
- **Performance:** Resource creation runs in background (non-blocking)

---

**Status:** ✅ Phase 1 Complete - Ready for Testing

