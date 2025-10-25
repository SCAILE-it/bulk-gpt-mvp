-- Add token tracking columns to batch_results table
-- Provides transparency for AI token consumption and model usage

ALTER TABLE public.batch_results
ADD COLUMN IF NOT EXISTS input_tokens INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS output_tokens INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gemini-2.5-flash';

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_batch_results_model ON public.batch_results(model);
CREATE INDEX IF NOT EXISTS idx_batch_results_tokens ON public.batch_results(input_tokens, output_tokens);

-- Success message
SELECT 'Token tracking columns added to batch_results!' as status;
