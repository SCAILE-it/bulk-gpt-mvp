/**
 * Resource types and interfaces
 * Unified data model for leads, keywords, content, and campaigns
 */

export type ResourceType = 'lead' | 'keyword' | 'content' | 'campaign' | 'analytics'
export type SourceType = 'customer' | 'tool' | 'generated'

export interface Resource {
  id: string
  user_id: string
  type: ResourceType
  data: Record<string, any>
  source_type: SourceType
  source_name: string
  source_id?: string
  batch_id?: string
  agent_id?: string
  tags?: string[]
  related_resource_ids?: string[] // Array of related resource IDs
  created_at: string
  updated_at: string
}

export interface ResourceFilters {
  type?: ResourceType
  source_type?: SourceType
  source_name?: string
  agent_id?: string
  batch_id?: string
  search?: string
  page?: number
  limit?: number
}

export interface ResourceCreate {
  type: ResourceType
  data: Record<string, any>
  source_type: SourceType
  source_name: string
  source_id?: string
  batch_id?: string
  agent_id?: string
  tags?: string[]
}

export interface ResourceListResponse {
  resources: Resource[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
