/**
 * API Route: Package Assignments
 * GET /api/packages/assignments - Get assigned packages for current user
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

    // Check if user is a client
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single()

    // Only return assignments for clients
    if (!profile || profile.user_type !== 'client') {
      return NextResponse.json({ assignments: [] })
    }

    // Fetch assigned packages with package details
    const { data: assignments, error } = await supabase
      .from('client_package_assignments')
      .select(`
        id,
        package_id,
        status,
        included_self_service_credits,
        used_self_service_credits,
        billing_period_start,
        agency_packages (
          name,
          description,
          agent_configs,
          monthly_cost
        )
      `)
      .eq('client_user_id', user.id)
      .eq('status', 'active')

    if (error) {
      logError('Error fetching package assignments', error)
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      )
    }

    // Transform response to include package details
    const formattedAssignments = (assignments || []).map((assignment: { id: string; agency_packages?: unknown; [key: string]: unknown }) => ({
      id: assignment.id,
      package_id: assignment.package_id,
      package_name: assignment.agency_packages?.name || 'Unknown Package',
      package_description: assignment.agency_packages?.description || null,
      status: assignment.status,
      agent_configs: assignment.agency_packages?.agent_configs || [],
      monthly_cost: parseFloat(assignment.agency_packages?.monthly_cost || '0'),
      included_self_service_credits: parseFloat(assignment.included_self_service_credits || '0'),
      used_self_service_credits: parseFloat(assignment.used_self_service_credits || '0'),
      billing_period_start: assignment.billing_period_start,
    }))

    return NextResponse.json({ assignments: formattedAssignments })
  } catch (error) {
    logError('Error in GET /api/packages/assignments', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

