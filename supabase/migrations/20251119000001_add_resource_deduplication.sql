-- Add Resource Deduplication Constraints
-- Prevents duplicate resources from being created when the same batch runs multiple times
-- or when syncing from external sources

-- Partial UNIQUE constraint: External resources (with source_id) cannot be duplicated
-- This prevents duplicate imports from HubSpot, Instantly, Phantombuster, etc.
CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_external_dedup
ON resources(user_id, source_name, source_id)
WHERE source_id IS NOT NULL;

-- Composite UNIQUE constraint for batch-generated resources
-- Prevents duplicate resources from the same batch/agent combination
-- This prevents re-running the same batch from creating duplicate resources
CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_batch_dedup
ON resources(user_id, batch_id, type, agent_id)
WHERE batch_id IS NOT NULL AND agent_id IS NOT NULL;

-- Additional index for efficient duplicate checking queries
CREATE INDEX IF NOT EXISTS idx_resources_dedup_check
ON resources(user_id, source_type, source_name)
WHERE source_id IS NOT NULL;

-- Document the deduplication strategy
COMMENT ON TABLE resources IS 'Unified storage for all GTM resources: leads, keywords, content, and campaigns.
Deduplication: External resources (source_id NOT NULL) are unique per (user, source_name, source_id).
Batch-generated resources are unique per (user, batch_id, type, agent_id).';

-- Optional: Function to find duplicate resources for cleanup/reporting
CREATE OR REPLACE FUNCTION find_duplicate_resources(p_user_id UUID)
RETURNS TABLE (
  resource_type TEXT,
  source_name TEXT,
  source_id TEXT,
  duplicate_count BIGINT,
  example_ids UUID[]
) AS $$
BEGIN
  -- Find external resource duplicates
  RETURN QUERY
  SELECT
    r.type,
    r.source_name,
    r.source_id,
    COUNT(*)::BIGINT as duplicate_count,
    ARRAY_AGG(r.id) as example_ids
  FROM resources r
  WHERE r.user_id = p_user_id
    AND r.source_id IS NOT NULL
  GROUP BY r.type, r.source_name, r.source_id
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to find batch-generated duplicate resources
CREATE OR REPLACE FUNCTION find_batch_duplicates(p_user_id UUID)
RETURNS TABLE (
  batch_id TEXT,
  agent_id TEXT,
  resource_type TEXT,
  duplicate_count BIGINT,
  example_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.batch_id,
    r.agent_id,
    r.type,
    COUNT(*)::BIGINT as duplicate_count,
    ARRAY_AGG(r.id) as example_ids
  FROM resources r
  WHERE r.user_id = p_user_id
    AND r.batch_id IS NOT NULL
    AND r.agent_id IS NOT NULL
  GROUP BY r.batch_id, r.agent_id, r.type
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to safely delete duplicate resources, keeping the earliest one
CREATE OR REPLACE FUNCTION cleanup_duplicate_resources(p_user_id UUID)
RETURNS TABLE (
  deleted_count BIGINT,
  cleanup_summary TEXT
) AS $$
DECLARE
  v_deleted_count BIGINT;
  v_external_dupes BIGINT;
  v_batch_dupes BIGINT;
BEGIN
  -- Delete external resource duplicates (keep earliest)
  WITH duplicates AS (
    SELECT DISTINCT ON (user_id, source_name, source_id)
      id
    FROM resources
    WHERE user_id = p_user_id
      AND source_id IS NOT NULL
    ORDER BY user_id, source_name, source_id, created_at ASC
  ),
  to_delete AS (
    SELECT r.id
    FROM resources r
    WHERE r.user_id = p_user_id
      AND r.source_id IS NOT NULL
      AND r.id NOT IN (SELECT id FROM duplicates)
  )
  DELETE FROM resources WHERE id IN (SELECT id FROM to_delete);
  GET DIAGNOSTICS v_external_dupes = ROW_COUNT;

  -- Delete batch-generated duplicates (keep earliest)
  WITH duplicates AS (
    SELECT DISTINCT ON (user_id, batch_id, type, agent_id)
      id
    FROM resources
    WHERE user_id = p_user_id
      AND batch_id IS NOT NULL
      AND agent_id IS NOT NULL
    ORDER BY user_id, batch_id, type, agent_id, created_at ASC
  ),
  to_delete AS (
    SELECT r.id
    FROM resources r
    WHERE r.user_id = p_user_id
      AND r.batch_id IS NOT NULL
      AND r.agent_id IS NOT NULL
      AND r.id NOT IN (SELECT id FROM duplicates)
  )
  DELETE FROM resources WHERE id IN (SELECT id FROM to_delete);
  GET DIAGNOSTICS v_batch_dupes = ROW_COUNT;

  v_deleted_count := COALESCE(v_external_dupes, 0) + COALESCE(v_batch_dupes, 0);

  RETURN QUERY SELECT
    v_deleted_count,
    FORMAT('Deleted %L external duplicates and %L batch duplicates for user %s',
      COALESCE(v_external_dupes, 0),
      COALESCE(v_batch_dupes, 0),
      p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to prevent duplicates on INSERT/UPDATE (application-level fallback)
CREATE OR REPLACE FUNCTION prevent_duplicate_resources()
RETURNS TRIGGER AS $$
BEGIN
  -- For external resources: check if already exists
  IF NEW.source_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM resources
      WHERE user_id = NEW.user_id
        AND source_name = NEW.source_name
        AND source_id = NEW.source_id
        AND type = NEW.type
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Duplicate resource: user % already has a resource from source % with id %',
        NEW.user_id, NEW.source_name, NEW.source_id;
    END IF;
  END IF;

  -- For batch-generated resources: check if already exists
  IF NEW.batch_id IS NOT NULL AND NEW.agent_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM resources
      WHERE user_id = NEW.user_id
        AND batch_id = NEW.batch_id
        AND agent_id = NEW.agent_id
        AND type = NEW.type
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Duplicate resource: batch % agent % type % already exists for user %',
        NEW.batch_id, NEW.agent_id, NEW.type, NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent duplicate resources
DROP TRIGGER IF EXISTS prevent_duplicate_resources_trigger ON resources;
CREATE TRIGGER prevent_duplicate_resources_trigger
  BEFORE INSERT OR UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_resources();
