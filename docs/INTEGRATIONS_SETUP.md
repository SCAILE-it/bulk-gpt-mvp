# Integrations Setup Guide

This guide explains how to set up and use integrations (HubSpot, Instantly, Phantombuster) for reading and writing data.

## Overview

Integrations allow you to:
1. **Read** data from external tools (e.g., HubSpot contacts/companies)
2. **Enrich** that data using Bulk Agent
3. **Write** enriched data back to the integration

## Database Setup

Run the Supabase migrations in order:

1. `001_create_integrations.sql` - Creates integrations table
2. `002_create_integration_syncs.sql` - Creates sync tracking table
3. `003_create_integration_data.sql` - Creates data cache table

## Workflow Example: HubSpot Company Enrichment

### Step 1: Connect HubSpot
1. Go to Context → Integrations tab
2. Click "Connect" on HubSpot
3. Enter your HubSpot API key
4. Click "Connect"

### Step 2: Sync Data (Read)
1. Click "Sync" button on HubSpot integration
2. This will:
   - Fetch all companies from HubSpot
   - Store them in `integration_data` table
   - Cache for use in Bulk Agent

### Step 3: Use in Bulk Agent
1. Go to Bulk Agent page
2. Instead of uploading CSV, select "Use Integration Data"
3. Choose HubSpot → Companies
4. Write your prompt to enrich the data
5. Process the batch

### Step 4: Write Back (Future)
1. After processing, click "Write Back to HubSpot"
2. Enriched data will be updated in HubSpot

## API Endpoints

### Integrations Management
- `GET /api/integrations` - List user's integrations
- `POST /api/integrations` - Connect an integration
- `DELETE /api/integrations` - Disconnect an integration

### Data Sync
- `POST /api/integrations/sync` - Sync data from integration
  - `syncType`: `read` | `write` | `full`
  - `dataType`: `contacts` | `companies` | etc.

## Database Schema

### integrations
Stores API keys and connection status:
- `id` - UUID
- `user_id` - UUID (FK to auth.users)
- `provider` - hubspot | instantly | phantombuster
- `api_key_encrypted` - Encrypted API key
- `connected_at` - Timestamp
- `last_synced_at` - Timestamp
- `sync_enabled` - Boolean

### integration_data
Caches synced data:
- `id` - UUID
- `user_id` - UUID
- `integration_id` - UUID (FK to integrations)
- `provider` - hubspot | instantly | phantombuster
- `external_id` - ID from external system
- `data_type` - contact | company | deal | etc.
- `data` - JSONB with full record
- `synced_at` - Timestamp

### integration_syncs
Tracks sync operations:
- `id` - UUID
- `user_id` - UUID
- `integration_id` - UUID
- `sync_type` - read | write | full
- `status` - pending | processing | completed | failed
- `records_synced` - Integer
- `records_total` - Integer

## Security

- API keys are stored encrypted (TODO: implement encryption)
- RLS policies ensure users only see their own data
- All API endpoints require authentication

## Next Steps

1. **Implement API key encryption** - Use Supabase Vault or similar
2. **Add write-back functionality** - Update enriched data back to integrations
3. **Add BigQuery integration** - Store data in BigQuery for analytics
4. **Add Instantly/Phantombuster clients** - Similar to HubSpotClient
5. **Add data selection UI** - Let users choose which integration data to use in Bulk Agent

