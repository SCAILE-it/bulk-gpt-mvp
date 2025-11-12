/**
 * ABOUTME: Tool selection section for bulk processor
 * ABOUTME: Allows users to select which GTM tools the AI can use during batch processing
 * ABOUTME: Shows 12 core tools by default, with 31 advanced tools in collapsible section
 */

'use client'

import { useState } from 'react'
import { Wrench, ChevronDown } from 'lucide-react'
import { type GTMTool, CORE_GTM_TOOLS, ADVANCED_GTM_TOOLS } from '@/lib/types/gtm-types'

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

  // Helper to render tool badge
  const renderToolBadge = (tool: GTMTool) => {
    const isSelected = selectedTools.includes(tool.name)
    return (
      <button
        key={tool.name}
        onClick={() => onToggleTool(tool.name)}
        title={tool.description}
        className={`
          group relative inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all duration-150
          ${isSelected
            ? 'bg-primary/15 border-primary/40 text-primary/90 hover:bg-primary/20'
            : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary hover:border-border hover:text-muted-foreground'
          }
        `}
        aria-label={`${isSelected ? 'Deselect' : 'Select'} ${tool.displayName} tool`}
      >
        {isSelected && (
          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
        )}
        <span className="whitespace-nowrap">{tool.displayName}</span>
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Wrench className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <label className="text-xs font-medium text-muted-foreground">AI Tools</label>
        <span className="text-[11px] text-muted-foreground">
          ({selectedTools.length} selected)
        </span>
      </div>

      {/* Core Tools (Always Visible) */}
      <div className="space-y-2">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Essential Tools
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CORE_GTM_TOOLS.map(renderToolBadge)}
        </div>
      </div>

      {/* Advanced Tools (Collapsible) */}
      <div className="space-y-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider hover:text-muted-foreground transition-colors"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-200 ${
              showAdvanced ? 'rotate-180' : ''
            }`}
          />
          <span>Advanced Tools ({ADVANCED_GTM_TOOLS.length})</span>
        </button>

        {showAdvanced && (
          <div className="flex flex-wrap gap-1.5 pl-5">
            {ADVANCED_GTM_TOOLS.map(renderToolBadge)}
          </div>
        )}
      </div>
    </div>
  )
}
