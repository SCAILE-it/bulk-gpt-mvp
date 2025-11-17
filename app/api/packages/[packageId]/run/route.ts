/**
 * API Route: Run Package
 * POST /api/packages/[packageId]/run - Execute pre-configured package run
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: { packageId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get package assignment for this client
    const { data: assignment, error: assignmentError } = await supabase
      .from('client_package_assignments')
      .select(`
        *,
        agency_packages (
          id,
          name,
          agent_configs,
          monthly_cost
        )
      `)
      .eq('client_user_id', user.id)
      .eq('package_id', params.packageId)
      .eq('status', 'active')
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Package not found or not active' },
        { status: 404 }
      )
    }

    const packageData = assignment.agency_packages as any
    const agentConfigs = packageData.agent_configs as Array<{
      agent_id: string
      config: Record<string, any>
      schedule?: string
    }>

    // Create package runs for each agent config
    const packageRuns = []
    for (const agentConfig of agentConfigs) {
      // STUBBED: Create batch record (actual execution will be handled by Modal backend later)
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert({
          id: batchId,
          user_id: user.id,
          status: 'pending',
          csv_filename: `package_${params.packageId}_${agentConfig.agent_id}_${Date.now()}.csv`,
          total_rows: 0,
          processed_rows: 0,
          prompt: `Package: ${packageData.name} - Agent: ${agentConfig.agent_id}`,
          agent_id: agentConfig.agent_id,
          agent_config: agentConfig.config,
        })
        .select()
        .single()

      if (batchError) {
        logError('Error creating batch for package run', batchError)
        continue
      }

      // Create package run record
      const { data: packageRun, error: runError } = await supabase
        .from('package_runs')
        .insert({
          client_user_id: user.id,
          package_id: params.packageId,
          agent_id: agentConfig.agent_id,
          batch_id: batchId,
          config: agentConfig.config,
          status: 'running',
        })
        .select()
        .single()

      if (runError) {
        logError('Error creating package run', runError)
        continue
      }

      packageRuns.push(packageRun)

      // Track usage (package runs are covered by subscription)
      await supabase
        .from('usage_tracking')
        .insert({
          user_id: user.id,
          batch_id: batchId,
          agent_id: agentConfig.agent_id,
          usage_type: 'package',
          package_id: params.packageId,
          model: 'gpt-4', // TODO: Get from actual execution
          input_tokens: 0, // TODO: Track actual usage
          output_tokens: 0,
          total_tokens: 0,
          api_cost: 0,
          billing_amount: 0, // Covered by package subscription
          covered_by_credits: false,
        })
    }

    return NextResponse.json({
      package_runs: packageRuns,
      message: 'Package execution queued (stubbed - Modal backend integration pending)',
    })
  } catch (error) {
    logError('Error in POST /api/packages/[packageId]/run', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

