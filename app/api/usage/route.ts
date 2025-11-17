/**
 * ABOUTME: API endpoint for fetching user usage statistics
 * ABOUTME: Returns daily/monthly/lifetime usage data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserUsage } from '@/lib/api-keys'
import { authenticateRequest } from '@/lib/auth-middleware'
import { logError } from '@/lib/errors'
import { logPerformance } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/usage - Get usage statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  try {
    const authStart = Date.now()
    const userId = await authenticateRequest(request)
    const authTime = Date.now() - authStart

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usageStart = Date.now()
    const usage = await getUserUsage(userId)
    const usageTime = Date.now() - usageStart

    if (!usage) {
      return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 })
    }

    const totalTime = Date.now() - startTime
    logPerformance('Usage stats fetch', {
      total: `${totalTime}ms`,
      auth: `${authTime}ms`,
      usage: `${usageTime}ms`,
    })

    return NextResponse.json(
      usage,
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
        },
      }
    )
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
