/**
 * ResourceCard component - Displays a single resource card
 */

'use client'

import { Edit, Trash2, Eye, Database, Search, FileText, Megaphone, Link2, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { Resource, ResourceType } from '@/lib/types/resources'

interface ResourceCardProps {
  resource: Resource
  onEdit: (resource: Resource) => void
  onDelete: (resource: Resource) => void
  onView: (resource: Resource) => void
  isSelected?: boolean
  onSelect?: (resourceId: string, selected: boolean) => void
}

export function ResourceCard({ 
  resource, 
  onEdit, 
  onDelete, 
  onView,
  isSelected = false,
  onSelect
}: ResourceCardProps) {
  const getTypeIcon = (type: ResourceType) => {
    switch (type) {
      case 'lead': return Database
      case 'keyword': return Search
      case 'content': return FileText
      case 'campaign': return Megaphone
      case 'analytics': return BarChart3
    }
  }

  const getSourceBadgeVariant = (sourceType: string) => {
    switch (sourceType) {
      case 'customer': return 'default'
      case 'tool': return 'secondary'
      case 'generated': return 'outline'
      default: return 'outline'
    }
  }

  const formatResourceData = (resource: Resource) => {
    const data = resource.data as Record<string, unknown>
    switch (resource.type) {
      case 'lead':
        return {
          title: data.name || data.email || 'Unknown Lead',
          subtitle: data.company || data.title || '',
          metadata: data.email ? `Email: ${data.email}` : '',
        }
      case 'keyword':
        return {
          title: data.keyword as string || 'Unknown Keyword',
          subtitle: `Volume: ${data.search_volume || 'N/A'} | Difficulty: ${data.difficulty || 'N/A'}`,
          metadata: '',
        }
      case 'content':
        return {
          title: data.title as string || 'Untitled Content',
          subtitle: `${data.word_count || 0} words | Type: ${data.content_type || 'unknown'}`,
          metadata: '',
        }
      case 'campaign':
        return {
          title: data.name as string || 'Unnamed Campaign',
          subtitle: `Status: ${data.status || 'unknown'} | Type: ${data.type || 'unknown'}`,
          metadata: '',
        }
      case 'analytics':
        return {
          title: data.keyword as string || 'AEO Analytics',
          subtitle: `AEO Score: ${data.aeo_insights?.answer_engine_optimization_score || 'N/A'}/100`,
          metadata: data.insights as string || '',
        }
      default:
        return {
          title: 'Resource',
          subtitle: '',
          metadata: '',
        }
    }
  }

  const Icon = getTypeIcon(resource.type)
  const formatted = formatResourceData(resource)

  return (
    <div 
      id={`resource-${resource.id}`}
      className={`border rounded-lg p-4 transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5 hover:bg-primary/10'
          : 'border-border bg-secondary/40 hover:bg-secondary/60'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {onSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect?.(resource.id, checked === true)}
              className="shrink-0"
            />
          )}
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{formatted.title}</h3>
            {formatted.subtitle && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {formatted.subtitle}
              </p>
            )}
          </div>
        </div>
        <Badge variant={getSourceBadgeVariant(resource.source_type)} className="text-xs">
          {resource.source_type}
        </Badge>
      </div>

      {formatted.metadata && (
        <p className="text-xs text-muted-foreground mb-3">{formatted.metadata}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{resource.source_name}</span>
          {resource.tags && resource.tags.length > 0 && (
            <>
              <span>•</span>
              <span>{resource.tags.length} tag{resource.tags.length !== 1 ? 's' : ''}</span>
            </>
          )}
          {resource.related_resource_ids && resource.related_resource_ids.length > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                {resource.related_resource_ids.length} link{resource.related_resource_ids.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(resource)}
            className="h-7 w-7 p-0"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(resource)}
            className="h-7 w-7 p-0"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(resource)}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
