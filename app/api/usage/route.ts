/**
 * ABOUTME: API endpoint for fetching user usage statistics
 * ABOUTME: Returns daily/monthly/lifetime usage data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserUsage } from '@/lib/api-keys'
import { authenticateRequest } from '@/lib/auth-middleware'
import { logError } from '@/lib/errors'

/**
 * GET /api/usage - Get usage statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usage = await getUserUsage(userId)

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
