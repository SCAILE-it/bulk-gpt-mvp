/**
 * API Route: Agent Stats
 * GET /api/agents/stats - Get statistics for all agents
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get batch counts per agent
    const { data: batchStats, error: batchError } = await supabase
      .from('batches')
      .select('agent_id, status')
      .not('agent_id', 'is', null)

    if (batchError) {
      logError('Error fetching batch stats', batchError)
      // Don't fail - return empty stats
    }

    // Aggregate stats by agent_id
    const stats: Record<string, {
      total: number
      completed: number
      failed: number
      running: number
    }> = {}

    if (batchStats) {
      for (const batch of batchStats) {
        const agentId = batch.agent_id || 'unknown'
        if (!stats[agentId]) {
          stats[agentId] = { total: 0, completed: 0, failed: 0, running: 0 }
        }
        stats[agentId].total++
        if (batch.status === 'completed') stats[agentId].completed++
        else if (batch.status === 'failed') stats[agentId].failed++
        else if (batch.status === 'running' || batch.status === 'processing') stats[agentId].running++
      }
    }

    return NextResponse.json({ stats })
  } catch (error) {
    logError('Error in GET /api/agents/stats', error)
    return NextResponse.json(
      { error: 'Internal server error', stats: {} },
      { status: 500 }
    )
  }
}
