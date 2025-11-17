/**
 * API Route: Link/Unlink Resources
 * POST /api/resources/[id]/link - Link resources together
 * DELETE /api/resources/[id]/link - Unlink resources
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'

export async function POST(
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
    const { related_resource_id } = body

    if (!related_resource_id || typeof related_resource_id !== 'string') {
      return NextResponse.json(
        { error: 'related_resource_id is required and must be a string' },
        { status: 400 }
      )
    }

    // Verify source resource exists and belongs to user
    const { data: sourceResource, error: sourceError } = await supabase
      .from('resources')
      .select('id, related_resource_ids')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (sourceError || !sourceResource) {
      return NextResponse.json(
        { error: 'Source resource not found' },
        { status: 404 }
      )
    }

    // Verify target resource exists and belongs to user
    const { data: targetResource, error: targetError } = await supabase
      .from('resources')
      .select('id')
      .eq('id', related_resource_id)
      .eq('user_id', user.id)
      .single()

    if (targetError || !targetResource) {
      return NextResponse.json(
        { error: 'Target resource not found' },
        { status: 404 }
      )
    }

    // Prevent self-linking
    if (params.id === related_resource_id) {
      return NextResponse.json(
        { error: 'Cannot link resource to itself' },
        { status: 400 }
      )
    }

    // Get current related IDs
    const currentRelatedIds = (sourceResource.related_resource_ids || []) as string[]
    
    // Add new ID if not already present
    if (!currentRelatedIds.includes(related_resource_id)) {
      const updatedRelatedIds = [...currentRelatedIds, related_resource_id]
      
      const { data: updatedResource, error: updateError } = await supabase
        .from('resources')
        .update({ related_resource_ids: updatedRelatedIds })
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        logError('Error linking resources', updateError)
        return NextResponse.json(
          { error: 'Failed to link resources' },
          { status: 500 }
        )
      }

      return NextResponse.json({ resource: updatedResource })
    }

    // Already linked
    return NextResponse.json({ resource: sourceResource })
  } catch (error) {
    logError('Error in POST /api/resources/[id]/link', error)
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

    const { searchParams } = new URL(request.url)
    const related_resource_id = searchParams.get('related_resource_id')

    if (!related_resource_id) {
      return NextResponse.json(
        { error: 'related_resource_id query parameter is required' },
        { status: 400 }
      )
    }

    // Verify resource exists and belongs to user
    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('id, related_resource_ids')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }

    // Remove the related ID
    const currentRelatedIds = (resource.related_resource_ids || []) as string[]
    const updatedRelatedIds = currentRelatedIds.filter(id => id !== related_resource_id)
    
    const { data: updatedResource, error: updateError } = await supabase
      .from('resources')
      .update({ related_resource_ids: updatedRelatedIds })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      logError('Error unlinking resources', updateError)
      return NextResponse.json(
        { error: 'Failed to unlink resources' },
        { status: 500 }
      )
    }

    return NextResponse.json({ resource: updatedResource })
  } catch (error) {
    logError('Error in DELETE /api/resources/[id]/link', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

