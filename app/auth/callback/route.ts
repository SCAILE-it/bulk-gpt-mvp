import { createServerSupabaseClient, supabaseAdmin } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? searchParams.get("returnUrl") ?? "/"

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

  // Successful authentication, redirect to app
  const redirectUrl = `${origin}${next}`
  return NextResponse.redirect(redirectUrl)
}

