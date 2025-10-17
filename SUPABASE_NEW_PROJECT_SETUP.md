# 🚀 BULK-GPT Supabase Project Setup

## ✅ Project Created Successfully!

```
Project Name:    bulk-gpt-mvp
Reference ID:    ayjpnfzbxhcwwxvobssn
Organization:    SCAILE (xneblejhaftkyzgtarwu)
Region:          Central EU (Frankfurt) / eu-central-1
Status:          ✅ Ready for configuration
Created:         2025-10-16 19:21:55 UTC
```

**Dashboard:** https://supabase.com/dashboard/project/ayjpnfzbxhcwwxvobssn

---

## 📋 Quick Setup Steps

### Step 1: Get Your API Keys

Visit: https://supabase.com/dashboard/project/ayjpnfzbxhcwwxvobssn

Go to **Settings → API**

Copy:
- **NEXT_PUBLIC_SUPABASE_URL:** `https://ayjpnfzbxhcwwxvobssn.supabase.co`
- **NEXT_PUBLIC_SUPABASE_ANON_KEY:** (visible on dashboard)
- **SUPABASE_SERVICE_ROLE_KEY:** (visible on dashboard)

### Step 2: Create Database Tables

Go to **SQL Editor** in the Supabase dashboard

Copy the SQL schema below and execute it

### Step 3: Set Environment Variables

Update `.env.local` in your Next.js app:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ayjpnfzbxhcwwxvobssn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-dashboard
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-dashboard

# Modal API
MODAL_API_URL=https://bulk-gpt-processor-mvp--process-batch.modal.run

# Gemini
GEMINI_API_KEY=your-gemini-api-key
```

---

## 📄 SQL Schema (Run in Supabase SQL Editor)

Copy and run this entire SQL block in your Supabase project's SQL Editor:

```sql
-- Create tables for BULK-GPT MVP

-- 1. Batches table
CREATE TABLE IF NOT EXISTS public.batches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled')) DEFAULT 'pending',
  csv_filename TEXT NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  processed_rows INT DEFAULT 0,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Batch results table (individual row processing results)
CREATE TABLE IF NOT EXISTS public.batch_results (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  output TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'success', 'error')) DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CSV uploads table (track uploaded files)
CREATE TABLE IF NOT EXISTS public.csv_uploads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  batch_id TEXT NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size INT NOT NULL,
  row_count INT NOT NULL,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Exports table (track exported results)
CREATE TABLE IF NOT EXISTS public.exports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  batch_id TEXT NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  format TEXT NOT NULL CHECK (format IN ('csv', 'json', 'email')) DEFAULT 'csv',
  filename TEXT NOT NULL,
  file_size INT,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Error logs table (track and debug errors)
CREATE TABLE IF NOT EXISTS public.error_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  batch_id TEXT REFERENCES public.batches(id) ON DELETE SET NULL,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  user_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on all tables
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for batches table
CREATE POLICY "Users can see own batches"
  ON public.batches FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can create batches"
  ON public.batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batches"
  ON public.batches FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Create RLS policies for batch_results table
CREATE POLICY "Users can see batch results"
  ON public.batch_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.batches WHERE batches.id = batch_results.batch_id AND batches.user_id = auth.uid()));

CREATE POLICY "Anyone can insert batch results"
  ON public.batch_results FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR TRUE);

CREATE POLICY "Service role can update batch results"
  ON public.batch_results FOR UPDATE
  USING (auth.role() = 'service_role');

-- Create RLS policies for csv_uploads table
CREATE POLICY "Users can see own uploads"
  ON public.csv_uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create uploads"
  ON public.csv_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for exports table
CREATE POLICY "Users can see own exports"
  ON public.exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create exports"
  ON public.exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for error_logs table
CREATE POLICY "Users can see own error logs"
  ON public.error_logs FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Anyone can insert error logs"
  ON public.error_logs FOR INSERT
  WITH CHECK (TRUE);

-- Create indexes for performance
CREATE INDEX idx_batches_user_id ON public.batches(user_id);
CREATE INDEX idx_batches_status ON public.batches(status);
CREATE INDEX idx_batches_created_at ON public.batches(created_at DESC);
CREATE INDEX idx_batch_results_batch_id ON public.batch_results(batch_id);
CREATE INDEX idx_batch_results_status ON public.batch_results(status);
CREATE INDEX idx_csv_uploads_batch_id ON public.csv_uploads(batch_id);
CREATE INDEX idx_exports_batch_id ON public.exports(batch_id);
CREATE INDEX idx_error_logs_batch_id ON public.error_logs(batch_id);

-- Enable Realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_results;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_batch_results_updated_at BEFORE UPDATE ON public.batch_results
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Success message
SELECT 'BULK-GPT database schema created successfully!' as status;
```

---

## ✅ Verification Steps

After running the SQL:

1. Go to **SQL Editor** and run:
   ```sql
   SELECT * FROM information_schema.tables WHERE table_schema = 'public';
   ```
   
   Should show: `batches`, `batch_results`, `csv_uploads`, `exports`, `error_logs`

2. Go to **Table Editor** and verify all tables appear

3. Check RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE schemaname = 'public' AND tablename LIKE 'batch%';
   ```

4. Check indexes are created:
   ```sql
   SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
   ```

---

## 🔐 Next: Enable Auth (Optional but Recommended)

1. Go to **Authentication → Providers**
2. Enable: Email (for testing)
3. Go to **URL Configuration** and set:
   - Site URL: `http://localhost:5001`
   - Redirect URLs: `http://localhost:5001/auth/callback`

---

## 🎯 Project Credentials

```
Project Ref:   ayjpnfzbxhcwwxvobssn
Region:        eu-central-1 (Frankfurt, Germany)
Database:      PostgreSQL (managed by Supabase)
Realtime:      Enabled for batches & batch_results
RLS:           Enabled on all tables
Auth:          Ready for configuration
```

---

## 📚 Next Steps

1. ✅ Get API keys from dashboard
2. ✅ Run SQL schema (copy/paste above)
3. ✅ Update `.env.local` with credentials
4. ✅ Deploy Modal processor
5. ✅ Create Next.js API route
6. ✅ Test end-to-end

---

## 🚀 Ready to Deploy!

Your Supabase project is now ready for BULK-GPT MVP!

```bash
# Next: Deploy Modal processor
cd /Users/federicodeponte/Downloads/local-coder/bulk-gpt-app/modal-processor
modal deploy main.py --env-file .env.local
```

