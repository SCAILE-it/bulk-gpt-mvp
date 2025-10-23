import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // In Next.js App Router client components, env variables must be accessed at build time
  // They are replaced with their values during compilation
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('[Supabase Client] Env check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlValue: supabaseUrl?.slice(0, 30) + '...',
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase Client] Missing environment variables:', {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'exists' : 'missing'
    })
    return null
  }

  console.log('[Supabase Client] Creating client successfully')
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

