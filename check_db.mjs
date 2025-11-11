import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ayjpnfzbxhcwwxvobssn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5anBuZnpieGhjd3d4dm9ic3NuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY0MjUxNSwiZXhwIjoyMDc2MjE4NTE1fQ.1BFcQeilNU0r0PVbuoOkl8TOy7XVeb6K-T5X5_fpA-s'
)

const { data: batches } = await supabase
  .from('batches')
  .select('id, output_schema, status')
  .order('created_at', { ascending: false })
  .limit(1)

if (batches?.[0]) {
  console.log('Batch:', JSON.stringify(batches[0], null, 2))
  const { data: results } = await supabase
    .from('batch_results')
    .select('*')
    .eq('batch_id', batches[0].id)
    .limit(2)
  console.log('\nResults:', JSON.stringify(results, null, 2))
}
