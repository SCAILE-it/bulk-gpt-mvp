/**
 * Resource Service
 * Handles resource creation and management with deduplication
 * Supports lead, keyword, content, and campaign resources
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type ResourceType = 'lead' | 'keyword' | 'content' | 'campaign' | 'analytics'
export type SourceType = 'customer' | 'tool' | 'generated'

export interface ResourceInput {
  type: ResourceType
  data: Record<string, unknown>
  sourceType: SourceType
  sourceName: string // 'csv_upload', 'hubspot', 'lead_crawler', 'manual', etc.
  sourceId?: string // External ID if applicable
  batchId?: string // Which batch created this
  agentId?: string // Which agent created this
  tags?: string[]
}

export interface ResourceOutput {
  id: string
  userId: string
  type: ResourceType
  data: Record<string, unknown>
  sourceType: SourceType
  sourceName: string
  sourceId?: string
  batchId?: string
  agentId?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
  isDuplicate?: boolean // True if this resource already existed
}

/**
 * Create a resource with automatic deduplication
 * If a duplicate is detected, returns the existing resource instead of creating a new one
 */
export async function createResourceWithDedup(
  input: ResourceInput
): Promise<{ resource: ResourceOutput; isDuplicate: boolean }> {
  const supabase = createClient()

  try {
    // Check for duplicates based on source and type
    if (input.sourceId && input.sourceName) {
      const { data: existing, error: checkError } = await supabase
        .from('resources')
        .select('*')
        .eq('type', input.type)
        .eq('source_name', input.sourceName)
        .eq('source_id', input.sourceId)
        .single()

      if (existing && !checkError) {
        // Duplicate found - return existing resource
        return {
          resource: mapDatabaseToResource(existing),
          isDuplicate: true,
        }
      }
    }

    // Check for batch-generated duplicates
    if (input.batchId && input.agentId) {
      const { data: existing, error: checkError } = await supabase
        .from('resources')
        .select('*')
        .eq('batch_id', input.batchId)
        .eq('agent_id', input.agentId)
        .eq('type', input.type)
        .single()

      if (existing && !checkError) {
        // Duplicate found - return existing resource
        return {
          resource: mapDatabaseToResource(existing),
          isDuplicate: true,
        }
      }
    }

    // No duplicate found - create new resource
    const { data: created, error: insertError } = await supabase
      .from('resources')
      .insert({
        type: input.type,
        data: input.data,
        source_type: input.sourceType,
        source_name: input.sourceName,
        source_id: input.sourceId || null,
        batch_id: input.batchId || null,
        agent_id: input.agentId || null,
        tags: input.tags || [],
      })
      .select()
      .single()

    if (insertError) {
      // If constraint violation, try to fetch the existing resource
      if (insertError.code === '23505') {
        // Unique constraint violation
        return await fetchExistingResource(input)
      }
      throw insertError
    }

    return {
      resource: mapDatabaseToResource(created),
      isDuplicate: false,
    }
  } catch (error) {
    console.error('Error creating resource:', error)
    throw error
  }
}

/**
 * Bulk create resources with deduplication
 * Returns both created and deduplicated resources
 */
export async function bulkCreateResources(
  inputs: ResourceInput[]
): Promise<{
  created: ResourceOutput[]
  deduplicated: ResourceOutput[]
  errors: Array<{ input: ResourceInput; error: string }>
}> {
  const results = {
    created: [] as ResourceOutput[],
    deduplicated: [] as ResourceOutput[],
    errors: [] as Array<{ input: ResourceInput; error: string }>,
  }

  for (const input of inputs) {
    try {
      const { resource, isDuplicate } = await createResourceWithDedup(input)
      if (isDuplicate) {
        results.deduplicated.push(resource)
      } else {
        results.created.push(resource)
      }
    } catch (error) {
      results.errors.push({
        input,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

/**
 * Find duplicate resources for a user
 */
export async function findDuplicateResources(userId: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('find_duplicate_resources', {
      p_user_id: userId,
    })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error finding duplicate resources:', error)
    throw error
  }
}

/**
 * Find batch-generated duplicate resources
 */
export async function findBatchDuplicates(userId: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('find_batch_duplicates', {
      p_user_id: userId,
    })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error finding batch duplicates:', error)
    throw error
  }
}

/**
 * Clean up duplicate resources, keeping the earliest one
 */
export async function cleanupDuplicateResources(userId: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('cleanup_duplicate_resources', {
      p_user_id: userId,
    })

    if (error) throw error
    return data?.[0] || { deleted_count: 0, cleanup_summary: 'No duplicates found' }
  } catch (error) {
    console.error('Error cleaning up duplicate resources:', error)
    throw error
  }
}

/**
 * Helper: Fetch existing resource after constraint violation
 */
async function fetchExistingResource(input: ResourceInput): Promise<{
  resource: ResourceOutput
  isDuplicate: boolean
}> {
  const supabase = createClient()

  let query = supabase.from('resources').select('*').eq('type', input.type)

  if (input.sourceId && input.sourceName) {
    query = query.eq('source_name', input.sourceName).eq('source_id', input.sourceId)
  } else if (input.batchId && input.agentId) {
    query = query.eq('batch_id', input.batchId).eq('agent_id', input.agentId)
  }

  const { data, error } = await query.single()

  if (error) {
    throw new Error(`Could not find existing resource after constraint violation: ${error.message}`)
  }

  return {
    resource: mapDatabaseToResource(data),
    isDuplicate: true,
  }
}

/**
 * Helper: Map database resource to output type
 */
function mapDatabaseToResource(data: any): ResourceOutput {
  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    data: data.data,
    sourceType: data.source_type,
    sourceName: data.source_name,
    sourceId: data.source_id,
    batchId: data.batch_id,
    agentId: data.agent_id,
    tags: data.tags,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}
