/**
 * API Route: Bulk Resource Operations
 * POST /api/resources/bulk - Bulk delete or tag resources
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'

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

    const body = await request.json()
    const { resource_ids, action, tags } = body

    if (!Array.isArray(resource_ids) || resource_ids.length === 0) {
      return NextResponse.json(
        { error: 'resource_ids must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!action || !['delete', 'tag'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "delete" or "tag"' },
        { status: 400 }
      )
    }

    if (action === 'tag' && (!tags || !Array.isArray(tags) || tags.length === 0)) {
      return NextResponse.json(
        { error: 'tags must be a non-empty array when action is "tag"' },
        { status: 400 }
      )
    }

    // Verify all resources belong to the user
    const { data: existingResources, error: fetchError } = await supabase
      .from('resources')
      .select('id, tags')
      .in('id', resource_ids)
      .eq('user_id', user.id)

    if (fetchError) {
      logError('Error fetching resources for bulk operation', fetchError)
      return NextResponse.json(
        { error: 'Failed to verify resources' },
        { status: 500 }
      )
    }

    if (existingResources.length !== resource_ids.length) {
      return NextResponse.json(
        { error: 'Some resources not found or not accessible' },
        { status: 403 }
      )
    }

    if (action === 'delete') {
      const { error: deleteError } = await supabase
        .from('resources')
        .delete()
        .in('id', resource_ids)
        .eq('user_id', user.id)

      if (deleteError) {
        logError('Error deleting resources', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete resources' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        deleted_count: resource_ids.length 
      })
    }

    if (action === 'tag') {
      // For each resource, merge new tags with existing tags
      const updates = existingResources.map(resource => {
        const existingTags = (resource.tags || []) as string[]
        const newTags = tags as string[]
        // Merge and deduplicate
        const mergedTags = Array.from(new Set([...existingTags, ...newTags]))
        
        return supabase
          .from('resources')
          .update({ tags: mergedTags })
          .eq('id', resource.id)
          .eq('user_id', user.id)
      })

      const results = await Promise.all(updates)
      const errors = results.filter(r => r.error)

      if (errors.length > 0) {
        logError('Error tagging resources', errors)
        return NextResponse.json(
          { error: 'Failed to tag some resources' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        tagged_count: resource_ids.length,
        tags_added: tags
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    logError('Error in POST /api/resources/bulk', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

