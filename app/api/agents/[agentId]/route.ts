/**
 * API Route: Agent by ID
 * GET /api/agents/[agentId] - Get single agent definition
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: agent, error } = await supabase
      .from('agent_definitions')
      .select('*')
      .eq('id', params.agentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        )
      }
      logError('Error fetching agent', error)
      return NextResponse.json(
        { error: 'Failed to fetch agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({ agent })
  } catch (error) {
    logError('Error in GET /api/agents/[agentId]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

