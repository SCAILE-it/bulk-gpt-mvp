/**
 * API Route: Dashboard Stats
 * GET /api/dashboard/stats - Get aggregated dashboard statistics
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch all batches for comprehensive stats (from all agents)
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('id, csv_filename, status, total_rows, processed_rows, created_at, updated_at, agent_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (batchesError) {
      logError('Error fetching batches', batchesError)
      return NextResponse.json(
        { error: 'Failed to fetch batches' },
        { status: 500 }
      )
    }

    const allBatches = batches || []
    const totalBatches = allBatches.length
    const completedBatches = allBatches.filter(b => 
      b.status === 'completed' || b.status === 'completed_with_errors'
    ).length
    const totalRowsProcessed = allBatches.reduce((sum, b) => sum + (b.processed_rows || 0), 0)
    const successRate = totalBatches > 0 ? Math.round((completedBatches / totalBatches) * 100) : 0

    // Calculate processing metrics
    const completedBatchesWithTime = allBatches.filter(b => 
      (b.status === 'completed' || b.status === 'completed_with_errors') && 
      b.created_at && b.updated_at
    )
    
    let totalProcessingTime = 0
    let totalRowsForSpeed = 0
    
    completedBatchesWithTime.forEach(batch => {
      const startTime = new Date(batch.created_at).getTime()
      const endTime = new Date(batch.updated_at).getTime()
      const duration = (endTime - startTime) / 1000 // seconds
      if (duration > 0 && batch.processed_rows) {
        totalProcessingTime += duration
        totalRowsForSpeed += batch.processed_rows
      }
    })

    const averageProcessingTime = completedBatchesWithTime.length > 0 
      ? totalProcessingTime / completedBatchesWithTime.length 
      : 0
    
    const rowsPerSecond = totalProcessingTime > 0 
      ? totalRowsForSpeed / totalProcessingTime 
      : 0

    // Parallelize token and resource queries for better performance
    const [tokenResult, leadsResult, keywordsResult, contentResult, campaignsResult] = await Promise.all([
      // Fetch token usage (only if batches exist)
      allBatches.length > 0
        ? supabase
            .from('batch_results')
            .select('input_tokens, output_tokens')
            .in('batch_id', allBatches.slice(0, 100).map(b => b.id))
            .then(({ data }) => ({
              totalTokens: (data || []).reduce((sum, r) => 
                sum + (r.input_tokens || 0) + (r.output_tokens || 0), 0
              )
            }))
        : Promise.resolve({ totalTokens: 0 }),
      
      // Fetch resource counts in parallel
      supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'lead')
        .then(({ count }) => count || 0),
      
      supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'keyword')
        .then(({ count }) => count || 0),
      
      supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'content')
        .then(({ count }) => count || 0),
      
      supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'campaign')
        .then(({ count }) => count || 0),
    ])

    const totalTokens = tokenResult.totalTokens
    const resourceCounts = {
      leads: leadsResult,
      keywords: keywordsResult,
      content: contentResult,
      campaigns: campaignsResult,
    }

    // Fetch agent definitions to get names/icons
    const agentIds = [...new Set(allBatches.map(b => b.agent_id).filter(Boolean))]
    const { data: agentDefinitions } = agentIds.length > 0
      ? await supabase
          .from('agent_definitions')
          .select('id, name, icon')
          .in('id', agentIds)
      : { data: [] }
    
    const agentMap = new Map((agentDefinitions || []).map(a => [a.id, { name: a.name, icon: a.icon }]))

    // Include recent batches to avoid duplicate fetch in hook
    const recentBatches = allBatches.slice(0, 5).map(b => {
      const agentInfo = b.agent_id ? agentMap.get(b.agent_id) : null
      return {
        id: b.id,
        csv_filename: b.csv_filename || `${agentInfo?.name || 'Agent'} Run`,
        status: b.status,
        created_at: b.created_at,
        total_rows: b.total_rows || 0,
        processed_rows: b.processed_rows || 0,
        agent_id: b.agent_id || null,
        agent_name: agentInfo?.name || null,
        agent_icon: agentInfo?.icon || null,
      }
    })

    return NextResponse.json({
      totalBatches,
      completedBatches,
      totalRowsProcessed,
      successRate,
      averageProcessingTime,
      totalTokens,
      rowsPerSecond,
      resourceCounts,
      recentBatches,
    })
  } catch (error) {
    logError('Error in GET /api/dashboard/stats', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

