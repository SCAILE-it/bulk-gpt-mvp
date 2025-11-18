/**
 * Shared resource selector component for agents
 * Allows selecting resources (keywords, leads, etc.) as input for agents
 */

'use client'

import { useState, useEffect } from 'react'
import { Search, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Resource {
  id: string
  type: string
  data: Record<string, unknown>
  created_at: string
  source_name?: string
}

interface ResourceSelectorProps {
  resourceType: 'keyword' | 'lead' | 'content' | 'campaign'
  selectedResourceIds: string[]
  onSelectionChange: (ids: string[]) => void
  label?: string
  description?: string
  minSelection?: number
  maxSelection?: number
}

export function ResourceSelector({
  resourceType,
  selectedResourceIds,
  onSelectionChange,
  label,
  description,
  minSelection = 1,
  maxSelection,
}: ResourceSelectorProps) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadResources()
  }, [resourceType])

  async function loadResources() {
    try {
      setLoading(true)
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      const { data, error } = await supabase
        .from('resources')
        .select('id, type, data, created_at, source_name')
        .eq('type', resourceType)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setResources(data || [])
    } catch (error) {
      console.error('Error loading resources:', error)
      toast.error('Failed to load resources')
    } finally {
      setLoading(false)
    }
  }

  const filteredResources = resources.filter(resource => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    const dataStr = JSON.stringify(resource.data).toLowerCase()
    return dataStr.includes(searchLower)
  })

  const handleToggle = (resourceId: string) => {
    const isSelected = selectedResourceIds.includes(resourceId)

    if (isSelected) {
      // Deselect
      if (selectedResourceIds.length <= minSelection) {
        toast.error(`Please select at least ${minSelection} ${resourceType}${minSelection > 1 ? 's' : ''}`)
        return
      }
      onSelectionChange(selectedResourceIds.filter(id => id !== resourceId))
    } else {
      // Select
      if (maxSelection && selectedResourceIds.length >= maxSelection) {
        toast.error(`You can only select up to ${maxSelection} ${resourceType}${maxSelection > 1 ? 's' : ''}`)
        return
      }
      onSelectionChange([...selectedResourceIds, resourceId])
    }
  }

  const handleSelectAll = () => {
    const allIds = filteredResources.map(r => r.id)
    const limited = maxSelection ? allIds.slice(0, maxSelection) : allIds
    onSelectionChange(limited)
  }

  const handleDeselectAll = () => {
    onSelectionChange([])
  }

  const getResourceLabel = (resource: Resource): string => {
    // Try to extract a meaningful label from the resource data
    const data = resource.data
    if (resourceType === 'keyword') {
      return (data.keyword as string) || (data.name as string) || 'Unnamed keyword'
    } else if (resourceType === 'lead') {
      return (data.email as string) || (data.name as string) || 'Unnamed lead'
    } else if (resourceType === 'content') {
      return (data.title as string) || (data.headline as string) || 'Unnamed content'
    } else if (resourceType === 'campaign') {
      return (data.name as string) || (data.title as string) || 'Unnamed campaign'
    }
    return `${resourceType} ${resource.id.slice(0, 8)}`
  }

  if (loading) {
    return (
      <div className="border border-border rounded-lg p-6">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading {resourceType}s...</span>
        </div>
      </div>
    )
  }

  if (resources.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            No {resourceType}s found. Please create some {resourceType}s first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {(label || description) && (
        <div>
          {label && (
            <label className="block text-sm font-medium text-foreground mb-1">
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Search and Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${resourceType}s...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          disabled={filteredResources.length === 0}
        >
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeselectAll}
          disabled={selectedResourceIds.length === 0}
        >
          Clear
        </Button>
      </div>

      {/* Resource List */}
      <div className="border border-border rounded-lg divide-y divide-border max-h-96 overflow-y-auto">
        {filteredResources.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No {resourceType}s match your search
          </div>
        ) : (
          filteredResources.map(resource => {
            const isSelected = selectedResourceIds.includes(resource.id)
            return (
              <label
                key={resource.id}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors ${
                  isSelected ? 'bg-primary/5' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(resource.id)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-1 focus:ring-ring cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {getResourceLabel(resource)}
                  </p>
                  {resource.source_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Source: {resource.source_name}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </label>
            )
          })
        )}
      </div>

      {/* Selection Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {selectedResourceIds.length} of {filteredResources.length} selected
        </span>
        {minSelection > 0 && (
          <span>
            Minimum: {minSelection}
            {maxSelection && ` • Maximum: ${maxSelection}`}
          </span>
        )}
      </div>
    </div>
  )
}
