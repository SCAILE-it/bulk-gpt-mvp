/**
 * ResourceLinker Component
 * Allows users to link/unlink resources
 */

'use client'

import { useState, useEffect } from 'react'
import { Link2, X, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Resource, ResourceType } from '@/lib/types/resources'

interface ResourceLinkerProps {
  resource: Resource
  onLinkChange: (resource: Resource) => void
}

export function ResourceLinker({ resource, onLinkChange }: ResourceLinkerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Resource[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [linkedResources, setLinkedResources] = useState<Resource[]>([])
  const [isLoadingLinked, setIsLoadingLinked] = useState(true)

  // Determine which resource types can be linked to this resource
  const getLinkableTypes = (resourceType: ResourceType): ResourceType[] => {
    switch (resourceType) {
      case 'campaign':
        return ['lead', 'content'] // Campaigns link to leads and content
      case 'content':
        return ['keyword'] // Content links to keywords
      case 'lead':
        return ['campaign'] // Leads link to campaigns
      case 'keyword':
        return ['content'] // Keywords link to content
      default:
        return []
    }
  }

  const linkableTypes = getLinkableTypes(resource.type)

  // Fetch linked resources
  useEffect(() => {
    const fetchLinkedResources = async () => {
      if (!resource.related_resource_ids || resource.related_resource_ids.length === 0) {
        setLinkedResources([])
        setIsLoadingLinked(false)
        return
      }

      try {
        const response = await fetch(
          `/api/resources?ids=${resource.related_resource_ids.join(',')}`
        )
        if (!response.ok) throw new Error('Failed to fetch linked resources')
        const data = await response.json()
        // Handle both response formats: { resources: [...] } or just [...]
        setLinkedResources(Array.isArray(data) ? data : (data.resources || []))
      } catch (error) {
        console.error('Error fetching linked resources:', error)
        toast.error('Failed to load linked resources')
      } finally {
        setIsLoadingLinked(false)
      }
    }

    fetchLinkedResources()
  }, [resource.related_resource_ids])

  // Search for resources to link
  const handleSearch = async () => {
    if (!searchQuery.trim() || linkableTypes.length === 0) return

    setIsSearching(true)
    try {
      const typeParams = linkableTypes.map(t => `type=${t}`).join('&')
      const response = await fetch(
        `/api/resources?${typeParams}&search=${encodeURIComponent(searchQuery)}&limit=10`
      )
      if (!response.ok) throw new Error('Failed to search resources')
      const data = await response.json()
      
      // Filter out already linked resources and the current resource
      const filtered = (data.resources || []).filter(
        (r: Resource) => 
          r.id !== resource.id && 
          !resource.related_resource_ids?.includes(r.id)
      )
      setSearchResults(filtered)
    } catch (error) {
      console.error('Error searching resources:', error)
      toast.error('Failed to search resources')
    } finally {
      setIsSearching(false)
    }
  }

  // Link a resource
  const handleLink = async (relatedResourceId: string) => {
    try {
      const response = await fetch(`/api/resources/${resource.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ related_resource_id: relatedResourceId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to link resource')
      }

      const data = await response.json()
      onLinkChange(data.resource)
      setSearchQuery('')
      setSearchResults([])
      toast.success('Resource linked successfully')
    } catch (error) {
      console.error('Error linking resource:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to link resource')
    }
  }

  // Unlink a resource
  const handleUnlink = async (relatedResourceId: string) => {
    try {
      const response = await fetch(
        `/api/resources/${resource.id}/link?related_resource_id=${relatedResourceId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to unlink resource')
      }

      const data = await response.json()
      onLinkChange(data.resource)
      toast.success('Resource unlinked successfully')
    } catch (error) {
      console.error('Error unlinking resource:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to unlink resource')
    }
  }

  const getResourceDisplayName = (r: Resource): string => {
    const data = r.data as Record<string, unknown>
    switch (r.type) {
      case 'lead':
        return (data.name as string) || (data.email as string) || 'Unknown Lead'
      case 'keyword':
        return (data.keyword as string) || 'Unknown Keyword'
      case 'content':
        return (data.title as string) || 'Untitled Content'
      case 'campaign':
        return (data.name as string) || 'Unnamed Campaign'
      default:
        return 'Resource'
    }
  }

  const getTypeLabel = (type: ResourceType): string => {
    switch (type) {
      case 'lead': return 'Lead'
      case 'keyword': return 'Keyword'
      case 'content': return 'Content'
      case 'campaign': return 'Campaign'
    }
  }

  if (linkableTypes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No linkable resource types for {getTypeLabel(resource.type)}s
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Linked Resources */}
      <div>
        <h4 className="text-sm font-medium mb-2">Linked Resources</h4>
        {isLoadingLinked ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : linkedResources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No linked resources</p>
        ) : (
          <div className="space-y-2">
            {linkedResources.map((linked) => (
              <div
                key={linked.id}
                className="flex items-center justify-between p-2 border rounded-md bg-secondary/40"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(linked.type)}
                  </Badge>
                  <span className="text-sm">{getResourceDisplayName(linked)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnlink(linked.id)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Link New Resource */}
      <div>
        <h4 className="text-sm font-medium mb-2">Link New Resource</h4>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${linkableTypes.map(getTypeLabel).join(' or ')}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch()
                }
              }}
              className="pl-8"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
            size="sm"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between p-2 border rounded-md hover:bg-secondary/40 cursor-pointer"
                onClick={() => handleLink(result.id)}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(result.type)}
                  </Badge>
                  <span className="text-sm">{getResourceDisplayName(result)}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7">
                  <Link2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

