-- Migration: Add Performance Indexes
-- Date: 2025-11-19
-- Description: Adds critical indexes to improve query performance across frequently accessed tables

-- Batch processing performance indexes
CREATE INDEX IF NOT EXISTS idx_batches_user_id_status
ON batches(user_id, status);

CREATE INDEX IF NOT EXISTS idx_batches_created_at
ON batches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_batches_updated_at
ON batches(updated_at DESC);

-- Batch items performance
CREATE INDEX IF NOT EXISTS idx_batch_items_batch_id_status
ON batch_items(batch_id, status);

CREATE INDEX IF NOT EXISTS idx_batch_items_status
ON batch_items(status);

-- Agent definitions performance
CREATE INDEX IF NOT EXISTS idx_agent_definitions_is_active
ON agent_definitions(is_active) WHERE is_active = true;

-- Schedules performance
CREATE INDEX IF NOT EXISTS idx_schedules_user_id_is_active
ON schedules(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_schedules_next_run
ON schedules(next_run) WHERE is_active = true;

-- Schedule runs performance
CREATE INDEX IF NOT EXISTS idx_schedule_runs_schedule_id_status
ON schedule_runs(schedule_id, status);

CREATE INDEX IF NOT EXISTS idx_schedule_runs_created_at
ON schedule_runs(created_at DESC);

-- Business contexts updated_at index (for caching)
CREATE INDEX IF NOT EXISTS idx_business_contexts_updated_at
ON business_contexts(updated_at DESC);

-- User packages performance
CREATE INDEX IF NOT EXISTS idx_user_packages_user_id_is_active
ON user_packages(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_packages_package_id
ON user_packages(package_id);

-- API keys performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id_is_active
ON api_keys(user_id, is_active) WHERE is_active = true;

-- Comments for documentation
COMMENT ON INDEX idx_batches_user_id_status IS 'Compound index for user batch queries with status filtering';
COMMENT ON INDEX idx_batches_created_at IS 'Index for sorting batches by creation time';
COMMENT ON INDEX idx_batch_items_batch_id_status IS 'Compound index for batch item status queries';
COMMENT ON INDEX idx_schedules_next_run IS 'Partial index for active schedules ordered by next run time';
COMMENT ON INDEX idx_business_contexts_updated_at IS 'Index for cache invalidation queries';
