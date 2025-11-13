/**
 * ABOUTME: Tool selection section for bulk processor
 * ABOUTME: Allows users to select which GTM tools the AI can use during batch processing
 * ABOUTME: Shows 12 core tools by default, with 31 advanced tools in collapsible section
 */

'use client'

import { useState, useMemo } from 'react'
import { Wrench, ChevronDown, Search, X } from 'lucide-react'
import { type GTMTool, CORE_GTM_TOOLS, ADVANCED_GTM_TOOLS } from '@/lib/types/gtm-types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { searchTools } from '@/lib/tool-search'
import { Input } from '@/components/ui/input'

// Re-export for backward compatibility
export { type GTMTool } from '@/lib/types/gtm-types'

interface ToolSelectionSectionProps {
  selectedTools: string[]
  onToggleTool: (toolName: string) => void
}

export function ToolSelectionSection({
  selectedTools,
  onToggleTool
}: ToolSelectionSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Sort tools alphabetically and filter by search
  const coreTools = useMemo(() => {
    return searchTools(CORE_GTM_TOOLS, searchQuery)
  }, [searchQuery])

  const advancedTools = useMemo(() => {
    return searchTools(ADVANCED_GTM_TOOLS, searchQuery)
  }, [searchQuery])

  // Auto-expand advanced section when searching
  const shouldShowAdvanced = showAdvanced || searchQuery.trim().length > 0

  // Helper to render tool badge
  const renderToolBadge = (tool: GTMTool) => {
    const isSelected = selectedTools.includes(tool.name)
    return (
      <Tooltip key={tool.name}>
        <TooltipTrigger asChild>
          <button
            onClick={() => onToggleTool(tool.name)}
            className={`
              group relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 min-h-[36px]
              ${isSelected
                ? 'bg-primary/20 border-primary/50 text-primary shadow-sm hover:bg-primary/25 hover:border-primary/60'
                : 'bg-secondary/70 border-border/50 text-muted-foreground hover:bg-secondary hover:border-border hover:text-foreground'
              }
            `}
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${tool.displayName} tool`}
          >
            {isSelected && (
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            )}
            <span className="whitespace-nowrap">{tool.displayName}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{tool.description}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <label className="text-sm font-medium text-foreground">AI Tools</label>
          <span className="text-xs text-muted-foreground">
            ({selectedTools.length} selected)
          </span>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-8 text-xs bg-secondary/70 border-border/50 focus-visible:ring-1 focus-visible:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Core Tools (Always Visible) */}
        {coreTools.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Essential Tools {searchQuery && <span className="normal-case font-normal">({coreTools.length})</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {coreTools.map(renderToolBadge)}
            </div>
          </div>
        )}

        {/* Advanced Tools (Collapsible) */}
        {advancedTools.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  shouldShowAdvanced ? 'rotate-180' : ''
                }`}
              />
              <span>
                Advanced Tools ({searchQuery ? `${advancedTools.length} found` : ADVANCED_GTM_TOOLS.length})
              </span>
            </button>

            {shouldShowAdvanced && (
              <div className="flex flex-wrap gap-2">
                {advancedTools.map(renderToolBadge)}
              </div>
            )}
          </div>
        )}

        {/* No results message */}
        {searchQuery && coreTools.length === 0 && advancedTools.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No tools found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
