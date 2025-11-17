/**
 * ResourcesList component - Displays and manages resources by type
 */

'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Database, FileText, Megaphone, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import type { Resource, ResourceType, ResourceFilters } from '@/lib/types/resources'
import { ResourceCard } from './ResourceCard'
import { ResourceDetail } from './ResourceDetail'
import { ResourceFilters as ResourceFiltersComponent } from './ResourceFilters'
import { CreateResourceModal } from './CreateResourceModal'
import { BulkActionsBar } from './BulkActionsBar'
import { exportResourcesAsCSV, exportResourcesAsJSON } from '@/lib/utils/resource-export'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ResourcesListProps {
  type: ResourceType
}

export function ResourcesList({ type }: ResourcesListProps) {
  const [resources, setResources] = useState<Resource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<ResourceFilters>({
    type,
    page: 1,
    limit: 20,
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [lastResourceTimestamp, setLastResourceTimestamp] = useState<string | null>(null)

  useEffect(() => {
    fetchResources()
    // Clear selection when type changes (switching tabs)
    setSelectedResourceIds(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, filters])

  // Auto-refresh when new resources are created (e.g., from batch completion)
  useEffect(() => {
    if (resources.length > 0) {
      const latestTimestamp = resources[0]?.created_at
      if (latestTimestamp && latestTimestamp !== lastResourceTimestamp) {
        setLastResourceTimestamp(latestTimestamp)
      }
    }
  }, [resources, lastResourceTimestamp])

  // Poll for new resources - adaptive interval based on activity
  // Faster polling when resources are being created, slower when idle
  useEffect(() => {
    if (filters.page !== 1) return // Only poll on first page
    
    // Check if we're expecting new resources (recent batch completion)
    const hasRecentActivity = lastResourceTimestamp && 
      Date.now() - new Date(lastResourceTimestamp).getTime() < 60000 // Within last minute
    const pollInterval = hasRecentActivity ? 5000 : 15000 // 5s when active, 15s when idle

    const interval = setInterval(() => {
      // Silently refresh to check for new resources
      fetchResources()
    }, pollInterval)

    return () => clearInterval(interval)
  }, [filters.page, lastResourceTimestamp]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchResources = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      params.set('type', type)
      if (filters.source_type) params.set('source_type', filters.source_type)
      if (filters.source_name) params.set('source_name', filters.source_name)
      if (filters.search) params.set('search', filters.search)
      params.set('page', String(filters.page || 1))
      params.set('limit', String(filters.limit || 20))

      const response = await fetch(`/api/resources?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch resources')
      
      const data = await response.json()
      const newResources = data.resources || []
      
      // Check if we have new resources (created after last known timestamp)
      if (lastResourceTimestamp && newResources.length > 0) {
        const latestResource = newResources[0] // Resources are sorted by created_at DESC
        if (latestResource.created_at > lastResourceTimestamp) {
          // Count new resources
          const newCount = newResources.filter((r: Resource) => 
            r.created_at > lastResourceTimestamp
          ).length
          
          if (newCount > 0) {
            toast.success(`${newCount} new ${type}${newCount > 1 ? 's' : ''} created`, {
              description: 'Resources created from batch completion',
              duration: 5000,
              action: {
                label: 'View',
                onClick: () => {
                  // Scroll to top and highlight new resources
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
              }
            })
            setLastResourceTimestamp(latestResource.created_at)
            
            // Highlight newly created resources
            const newResourceIds = newResources
              .filter((r: Resource) => r.created_at > lastResourceTimestamp)
              .map((r: Resource) => r.id)
            
            // Add highlight class to new resources (will be handled by ResourceCard)
            if (newResourceIds.length > 0) {
              setTimeout(() => {
                newResourceIds.forEach(id => {
                  const element = document.getElementById(`resource-${id}`)
                  if (element) {
                    element.classList.add('animate-pulse', 'ring-2', 'ring-primary', 'ring-offset-2')
                    setTimeout(() => {
                      element.classList.remove('animate-pulse', 'ring-2', 'ring-primary', 'ring-offset-2')
                    }, 3000)
                  }
                })
              }, 100)
            }
          }
        }
      } else if (newResources.length > 0 && !lastResourceTimestamp) {
        // First load - set initial timestamp
        setLastResourceTimestamp(newResources[0]?.created_at || null)
      }
      
      setResources(newResources)
      setPagination(data.pagination || pagination)
    } catch (error) {
      console.error('Error fetching resources:', error)
      toast.error('Failed to load resources')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (resource: Resource) => {
    if (!confirm('Are you sure you want to delete this resource?')) return

    try {
      const response = await fetch(`/api/resources/${resource.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete resource')

      toast.success('Resource deleted')
      fetchResources()
      if (selectedResource?.id === resource.id) {
        setIsDetailOpen(false)
        setSelectedResource(null)
      }
    } catch (error) {
      console.error('Error deleting resource:', error)
      toast.error('Failed to delete resource')
    }
  }

  const handleEdit = (resource: Resource) => {
    setSelectedResource(resource)
    setIsDetailOpen(true)
  }

  const handleView = (resource: Resource) => {
    setSelectedResource(resource)
    setIsDetailOpen(true)
  }

  const handleSave = (updatedResource: Resource) => {
    setResources(resources.map(r => r.id === updatedResource.id ? updatedResource : r))
    fetchResources()
  }

  const handleFiltersChange = (newFilters: ResourceFilters) => {
    setFilters({ ...newFilters, type, page: 1 })
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setFilters({ ...filters, search: value || undefined, page: 1 })
  }

  const handleSelectResource = (resourceId: string, selected: boolean) => {
    setSelectedResourceIds(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(resourceId)
      } else {
        next.delete(resourceId)
      }
      return next
    })
  }

  const handleClearSelection = () => {
    setSelectedResourceIds(new Set())
  }

  const handleSelectAll = () => {
    if (selectedResourceIds.size === resources.length) {
      // Deselect all
      setSelectedResourceIds(new Set())
    } else {
      // Select all on current page
      setSelectedResourceIds(new Set(resources.map(r => r.id)))
    }
  }

  const handleBulkDelete = async () => {
    const count = selectedResourceIds.size
    if (count === 0) return

    if (!confirm(`Are you sure you want to delete ${count} resource${count !== 1 ? 's' : ''}?`)) {
      return
    }

    try {
      const response = await fetch('/api/resources/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_ids: Array.from(selectedResourceIds),
          action: 'delete',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete resources')
      }

      toast.success(`Deleted ${count} resource${count !== 1 ? 's' : ''}`)
      setSelectedResourceIds(new Set())
      fetchResources()
    } catch (error) {
      console.error('Error deleting resources:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete resources')
    }
  }

  const handleBulkTag = async (tags: string[]) => {
    const count = selectedResourceIds.size
    if (count === 0 || tags.length === 0) return

    try {
      const response = await fetch('/api/resources/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_ids: Array.from(selectedResourceIds),
          action: 'tag',
          tags,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to tag resources')
      }

      toast.success(`Tagged ${count} resource${count !== 1 ? 's' : ''} with: ${tags.join(', ')}`)
      setSelectedResourceIds(new Set())
      fetchResources()
    } catch (error) {
      console.error('Error tagging resources:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to tag resources')
    }
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'lead': return 'Leads'
      case 'keyword': return 'Keywords'
      case 'content': return 'Content'
      case 'campaign': return 'Campaigns'
    }
  }

  const getTypeIcon = () => {
    switch (type) {
      case 'lead': return Database
      case 'keyword': return Search
      case 'content': return FileText
      case 'campaign': return Megaphone
    }
  }

  // Get unique source names for filter dropdown
  const availableSourceNames = Array.from(
    new Set(resources.map(r => r.source_name))
  ).sort()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-secondary/50 rounded animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-secondary/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const TypeIcon = getTypeIcon()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{getTypeLabel()}</h2>
          <p className="text-sm text-muted-foreground">
            Manage your {type.toLowerCase()} resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          {resources.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    exportResourcesAsCSV(resources, type)
                    toast.success(`Exported ${resources.length} ${type}${resources.length !== 1 ? 's' : ''} as CSV`)
                  }}
                >
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    exportResourcesAsJSON(resources, type)
                    toast.success(`Exported ${resources.length} ${type}${resources.length !== 1 ? 's' : ''} as JSON`)
                  }}
                >
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add {getTypeLabel().slice(0, -1)}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${getTypeLabel().toLowerCase()}...`}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <ResourceFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            availableSourceNames={availableSourceNames}
          />
        </div>
        {resources.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="shrink-0"
          >
            {selectedResourceIds.size === resources.length ? 'Deselect All' : 'Select All'}
          </Button>
        )}
      </div>

      {/* Resources List */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-10 bg-secondary/50 rounded animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-secondary/50 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          icon={TypeIcon}
          title={`No ${getTypeLabel().toLowerCase()} yet`}
          description={`Create your first ${type} resource to get started`}
          action={{
            label: `Add ${getTypeLabel().slice(0, -1)}`,
            onClick: () => setIsCreateModalOpen(true),
          }}
        />
      ) : (
        <>
          {/* Bulk Actions Bar */}
          {selectedResourceIds.size > 0 && (
            <BulkActionsBar
              selectedCount={selectedResourceIds.size}
              onBulkDelete={handleBulkDelete}
              onBulkTag={handleBulkTag}
              onClearSelection={handleClearSelection}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                isSelected={selectedResourceIds.has(resource.id)}
                onSelect={handleSelectResource}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} resources
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Resource Detail Modal */}
      <ResourceDetail
        resource={selectedResource}
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedResource(null)
        }}
        onSave={handleSave}
        onDelete={(id) => {
          const resource = resources.find(r => r.id === id)
          if (resource) handleDelete(resource)
        }}
      />

      {/* Create Resource Modal */}
      <CreateResourceModal
        type={type}
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          fetchResources()
          setIsCreateModalOpen(false)
        }}
      />
    </div>
  )
}

