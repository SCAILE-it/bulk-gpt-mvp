-- Migration: Add 'error' column to batch_results table if it doesn't exist
-- This fixes the "Could not find the 'error' column" issue

-- Check if column exists, add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'batch_results'
        AND column_name = 'error'
    ) THEN
        ALTER TABLE public.batch_results
        ADD COLUMN error TEXT;

        RAISE NOTICE 'Added error column to batch_results table';
    ELSE
        RAISE NOTICE 'Error column already exists in batch_results table';
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Migration complete! Schema cache refreshed.' as status;
