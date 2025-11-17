/**
 * API Route: Admin Packages
 * GET /api/admin/packages - List packages created by admin
 * POST /api/admin/packages - Create new package
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'
import { AdminPackageCreate } from '@/lib/types/packages'

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

    // Check if user is an agency
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { data: packages, error } = await supabase
      .from('agency_packages')
      .select('*')
      .eq('agency_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      logError('Error fetching agency packages', error)
      return NextResponse.json(
        { error: 'Failed to fetch packages' },
        { status: 500 }
      )
    }

    return NextResponse.json({ packages: packages || [] })
  } catch (error) {
    logError('Error in GET /api/admin/packages', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is an agency
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body: AdminPackageCreate = await request.json()
    const { name, description, agent_configs, monthly_cost } = body

    if (!name || !agent_configs || !monthly_cost) {
      return NextResponse.json(
        { error: 'name, agent_configs, and monthly_cost are required' },
        { status: 400 }
      )
    }

    const { data: packageData, error } = await supabase
      .from('agency_packages')
      .insert({
        agency_user_id: user.id,
        name,
        description: description || null,
        agent_configs,
        monthly_cost,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      logError('Error creating agency package', error)
      return NextResponse.json(
        { error: 'Failed to create package' },
        { status: 500 }
      )
    }

    return NextResponse.json({ package: packageData }, { status: 201 })
  } catch (error) {
    logError('Error in POST /api/admin/packages', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

