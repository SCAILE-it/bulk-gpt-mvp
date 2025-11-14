import { createServerSupabaseClient, supabaseAdmin } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSiteUrl } from "@/lib/utils/get-site-url"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Try multiple sources for returnUrl: query param, Supabase state, or default
  // Note: LinkedIn OAuth doesn't support query params in redirect_uri, so we use cookies or default
  const cookieStore = await cookies()
  const storedReturnUrl = cookieStore.get('oauth_return_url')?.value
  const next = searchParams.get("next") ?? searchParams.get("returnUrl") ?? storedReturnUrl ?? "/"

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=Missing authentication code`)
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("Auth error:", error)
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`)
  }

  const user = data?.user
  if (user?.id) {
    // Ensure user exists in public.users table (upsert to handle existing users)
    // LinkedIn OAuth may not provide email immediately, so use user metadata
    const userEmail = user.email || user.user_metadata?.email || user.user_metadata?.preferred_username
    
    try {
      await supabaseAdmin
        .from('users')
        .upsert({
          id: user.id,
          email: userEmail || null,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })
    } catch (err) {
      console.error('Error creating user record:', err)
      // Don't fail the auth flow, just log the error
    }
  }

  // Use the getSiteUrl utility to ensure correct URL regardless of environment
  // This matches zola-aisdkv5 pattern and ensures consistency with OAuth redirect
  const siteUrl = getSiteUrl({ requestOrigin: origin })
  const safeNext = next && next.startsWith("/") ? next : `/${next?.replace(/^\/+/, "") ?? ""}`
  const redirectUrl = `${siteUrl}${safeNext}`

  // Clean up the oauth_return_url cookie after use
  const response = NextResponse.redirect(redirectUrl)
  response.cookies.delete('oauth_return_url')
  return response
}

