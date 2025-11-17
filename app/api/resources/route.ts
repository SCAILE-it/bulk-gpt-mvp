/**
 * API Route: Resources
 * GET /api/resources - List resources with filters
 * POST /api/resources - Create a new resource
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ResourceFilters, ResourceListResponse, ResourceCreate, Resource } from '@/lib/types/resources'
import { logError } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    
    // Support fetching by IDs (for linked resources)
    const idsParam = searchParams.get('ids')
    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean)
      if (ids.length > 0) {
        const { data: resources, error } = await supabase
          .from('resources')
          .select('*')
          .eq('user_id', user.id)
          .in('id', ids)
        
        if (error) {
          logError('Error fetching resources by IDs', error)
          return NextResponse.json(
            { error: 'Failed to fetch resources' },
            { status: 500 }
          )
        }
        
        return NextResponse.json({ resources: resources || [] })
      }
    }
    
    const filters: ResourceFilters = {
      type: searchParams.get('type') as any,
      source_type: searchParams.get('source_type') as any,
      source_name: searchParams.get('source_name') || undefined,
      agent_id: searchParams.get('agent_id') || undefined,
      batch_id: searchParams.get('batch_id') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    }

    // Build query
    let query = supabase
      .from('resources')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)

    // Apply filters
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.source_type) {
      query = query.eq('source_type', filters.source_type)
    }
    if (filters.source_name) {
      query = query.eq('source_name', filters.source_name)
    }
    if (filters.agent_id) {
      query = query.eq('agent_id', filters.agent_id)
    }
    if (filters.batch_id) {
      query = query.eq('batch_id', filters.batch_id)
    }
    if (filters.search) {
      // Search in JSONB data field (email, keyword, company, etc.)
      query = query.or(`data->>email.ilike.%${filters.search}%,data->>keyword.ilike.%${filters.search}%,data->>company.ilike.%${filters.search}%,data->>name.ilike.%${filters.search}%`)
    }

    // Pagination
    const page = filters.page || 1
    const limit = filters.limit || 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.order('created_at', { ascending: false })
      .range(from, to)

    const { data: resources, error, count } = await query

    if (error) {
      logError('Error fetching resources', error)
      return NextResponse.json(
        { error: 'Failed to fetch resources' },
        { status: 500 }
      )
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    const response: ResourceListResponse = {
      resources: resources || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    logError('Error in GET /api/resources', error)
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

    const body: ResourceCreate = await request.json()

    // Validate required fields
    if (!body.type || !body.data || !body.source_type || !body.source_name) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data, source_type, source_name' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('resources')
      .insert({
        user_id: user.id,
        type: body.type,
        data: body.data,
        source_type: body.source_type,
        source_name: body.source_name,
        source_id: body.source_id || null,
        batch_id: body.batch_id || null,
        agent_id: body.agent_id || null,
        tags: body.tags || [],
      })
      .select()
      .single()

    if (error) {
      logError('Error creating resource', error)
      return NextResponse.json(
        { error: 'Failed to create resource' },
        { status: 500 }
      )
    }

    return NextResponse.json({ resource: data as Resource }, { status: 201 })
  } catch (error) {
    logError('Error in POST /api/resources', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
