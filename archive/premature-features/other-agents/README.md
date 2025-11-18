# Other Agents - Archived (Premature)

## Status: ARCHIVED - Not Ready

All agents except Bulk Agent have been archived as premature. Only the Bulk Agent is production-ready.

## What Was Archived

### Components Moved:
- `AgentsList.tsx` - List view of all agents
- `AgentRunModal.tsx` - Modal for running agents
- `PackageRunsSection.tsx` - Pre-configured packages for clients
- `AEOProcessor.tsx` - AEO Analytics agent processor
- `shared/AgentPageLayout.tsx` - Shared layout for agent pages
- `shared/ResourceSelector.tsx` - Resource selection component

### Route Changes:
- `/agents` now redirects directly to `/agents/bulk`
- `/agents/[agentId]` redirects non-bulk agents to `/agents/bulk`

## What Was Kept

✅ **Bulk Agent** (`/agents/bulk`) - Fully functional batch processor

## Planned Agents (Not Ready):
- AEO Analytics
- Lead Crawler
- Keyword Research
- Content Generator
- Campaign Manager

## Why Archived

These agents were planned but not fully implemented. The Bulk Agent is the only agent that has been fully tested and is ready for production use.

## Future Implementation

These agents can be restored when:
1. Backend processing is implemented
2. Agent-specific UIs are completed
3. Testing is done
4. User demand is verified
