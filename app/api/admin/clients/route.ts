/**
 * API Route: Admin Clients
 * GET /api/admin/clients - List clients (admin only)
 * POST /api/admin/clients - Create client assignment (via onboarding link)
 */

import { NextRequest, NextResponse } from 'next/server'
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

    // Get all clients assigned to this agency
    const { data: clients, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        client_package_assignments (
          id,
          package_id,
          status,
          included_self_service_credits,
          used_self_service_credits,
          billing_period_start,
          agency_packages (
            id,
            name,
            monthly_cost
          )
        )
      `)
      .eq('agency_id', user.id)
      .eq('user_type', 'client')

    if (error) {
      logError('Error fetching agency clients', error)
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    return NextResponse.json({ clients: clients || [] })
  } catch (error) {
    logError('Error in GET /api/admin/clients', error)
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

    const body = await request.json()
    const { client_user_id, package_id, onboarding_link } = body

    if (!client_user_id || !package_id) {
      return NextResponse.json(
        { error: 'client_user_id and package_id are required' },
        { status: 400 }
      )
    }

    // Get package to calculate credits
    const { data: packageData, error: packageError } = await supabase
      .from('agency_packages')
      .select('monthly_cost')
      .eq('id', package_id)
      .eq('agency_user_id', user.id)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    // Update client profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        agency_id: user.id,
        user_type: 'client',
        onboarding_link: onboarding_link || null,
      })
      .eq('user_id', client_user_id)

    if (profileError) {
      logError('Error updating client profile', profileError)
      return NextResponse.json(
        { error: 'Failed to update client profile' },
        { status: 500 }
      )
    }

    // Create package assignment
    const includedCredits = Number((packageData.monthly_cost * 0.1).toFixed(2))
    
    const { data: assignment, error: assignmentError } = await supabase
      .from('client_package_assignments')
      .insert({
        client_user_id,
        package_id,
        included_self_service_credits: includedCredits,
        status: 'active',
      })
      .select()
      .single()

    if (assignmentError) {
      logError('Error creating package assignment', assignmentError)
      return NextResponse.json(
        { error: 'Failed to assign package' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    logError('Error in POST /api/admin/clients', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

