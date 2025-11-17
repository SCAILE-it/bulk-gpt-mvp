/**
 * ResourceFilters component - Filter resources by source type and source name
 */

'use client'

import { Filter } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ResourceFilters } from '@/lib/types/resources'

interface ResourceFiltersProps {
  filters: ResourceFilters
  onFiltersChange: (filters: ResourceFilters) => void
  availableSourceNames: string[]
}

export function ResourceFilters({
  filters,
  onFiltersChange,
  availableSourceNames,
}: ResourceFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-secondary/40 border border-border rounded-lg">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium">Filters:</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Source Type Filter */}
        <div className="flex items-center gap-2">
          <Label htmlFor="source-type" className="text-xs text-muted-foreground">
            Source Type:
          </Label>
          <Select
            value={filters.source_type || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                source_type: value === 'all' ? undefined : (value as ResourceFilters['source_type']),
              })
            }
          >
            <SelectTrigger id="source-type" className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="tool">Tool</SelectItem>
              <SelectItem value="generated">Generated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Source Name Filter */}
        {availableSourceNames.length > 0 && (
          <div className="flex items-center gap-2">
            <Label htmlFor="source-name" className="text-xs text-muted-foreground">
              Source:
            </Label>
            <Select
              value={filters.source_name || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  source_name: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger id="source-name" className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {availableSourceNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
