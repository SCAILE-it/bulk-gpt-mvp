/**
 * API Route: Resource by ID
 * GET /api/resources/[id] - Get single resource
 * PUT /api/resources/[id] - Update resource
 * DELETE /api/resources/[id] - Delete resource
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resource } from '@/lib/types/resources'
import { logError } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { data: resource, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Resource not found' },
          { status: 404 }
        )
      }
      logError('Error fetching resource', error)
      return NextResponse.json(
        { error: 'Failed to fetch resource' },
        { status: 500 }
      )
    }

    return NextResponse.json({ resource })
  } catch (error) {
    logError('Error in GET /api/resources/[id]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const body = await request.json()
    const { data: updateData, tags } = body

    const updatePayload: Partial<Resource> = {}
    if (updateData !== undefined) {
      updatePayload.data = updateData
    }
    if (tags !== undefined) {
      updatePayload.tags = tags
    }

    const { data: resource, error } = await supabase
      .from('resources')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Resource not found' },
          { status: 404 }
        )
      }
      logError('Error updating resource', error)
      return NextResponse.json(
        { error: 'Failed to update resource' },
        { status: 500 }
      )
    }

    return NextResponse.json({ resource })
  } catch (error) {
    logError('Error in PUT /api/resources/[id]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
      .from('resources')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      logError('Error deleting resource', error)
      return NextResponse.json(
        { error: 'Failed to delete resource' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Error in DELETE /api/resources/[id]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
