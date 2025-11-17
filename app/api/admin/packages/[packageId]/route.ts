/**
 * API Route: Admin Package by ID
 * GET /api/admin/packages/[packageId] - Get package details
 * PUT /api/admin/packages/[packageId] - Update package
 * DELETE /api/admin/packages/[packageId] - Delete package
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'
import { AdminPackageUpdate } from '@/lib/types/packages'

export async function GET(
  _request: NextRequest,
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

    const { data: packageData, error } = await supabase
      .from('agency_packages')
      .select('*')
      .eq('id', params.packageId)
      .eq('agency_user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Package not found' },
          { status: 404 }
        )
      }
      logError('Error fetching package', error)
      return NextResponse.json(
        { error: 'Failed to fetch package' },
        { status: 500 }
      )
    }

    return NextResponse.json({ package: packageData })
  } catch (error) {
    logError('Error in GET /api/admin/packages/[packageId]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const body: AdminPackageUpdate = await request.json()

    const { data: packageData, error } = await supabase
      .from('agency_packages')
      .update(body)
      .eq('id', params.packageId)
      .eq('agency_user_id', user.id)
      .select()
      .single()

    if (error) {
      logError('Error updating package', error)
      return NextResponse.json(
        { error: 'Failed to update package' },
        { status: 500 }
      )
    }

    return NextResponse.json({ package: packageData })
  } catch (error) {
    logError('Error in PUT /api/admin/packages/[packageId]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
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

    const { error } = await supabase
      .from('agency_packages')
      .delete()
      .eq('id', params.packageId)
      .eq('agency_user_id', user.id)

    if (error) {
      logError('Error deleting package', error)
      return NextResponse.json(
        { error: 'Failed to delete package' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Error in DELETE /api/admin/packages/[packageId]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

