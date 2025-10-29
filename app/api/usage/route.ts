/**
 * ABOUTME: API endpoint for fetching user usage statistics
 * ABOUTME: Returns daily/monthly/lifetime usage data
 */

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getUserUsage } from '@/lib/api-keys'
import { logError } from '@/lib/errors'

/**
 * GET /api/usage - Get usage statistics for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usage = await getUserUsage(user.id)

    if (!usage) {
      return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 })
    }

    return NextResponse.json(usage)
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Failed to get usage'), {
      source: 'api/usage/GET'
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get usage' },
      { status: 500 }
    )
  }
}
