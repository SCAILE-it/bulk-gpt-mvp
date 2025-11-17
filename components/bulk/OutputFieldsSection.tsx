'use client'

/**
 * ABOUTME: Output fields management section for bulk processor
 * ABOUTME: Handles adding/removing output column names with validation and help tooltip
 */

import React, { memo } from 'react'
import { HelpCircle, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface OutputFieldsSectionProps {
  outputFields: string[]
  newField: string
  onNewFieldChange: (value: string) => void
  onAddField: () => void
  onRemoveField: (field: string) => void
}

export const OutputFieldsSection = memo(function OutputFieldsSection({
  outputFields,
  newField,
  onNewFieldChange,
  onAddField,
  onRemoveField
}: OutputFieldsSectionProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-3">
        <div className="flex items-center justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Learn about output fields"
              >
                <HelpCircle className="h-3.5 w-3.5 cursor-help" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-1.5 text-xs">
                <p className="font-medium">Output Fields</p>
                <p className="text-muted-foreground">
                  These are the column names that will be added to your exported CSV. The AI will generate content for each field you specify.
                </p>
                <p className="text-muted-foreground mt-2 pt-2 border-t border-border">
                  <strong>Example:</strong> If you add &quot;bio&quot;, the exported CSV will have a &quot;bio&quot; column with AI-generated content for each row.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {outputFields.map(field => (
            <div key={field} className="inline-flex items-center gap-1 px-2 py-1 bg-secondary border border-border rounded text-sm text-foreground font-mono">
              {field}
              <button
                onClick={() => onRemoveField(field)}
                className="hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded"
                aria-label={`Remove ${field} output field`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
          <div className="inline-flex flex-col gap-1">
            <div className="inline-flex gap-1 items-center">
              <input
                value={newField}
                onChange={(e) => {
                  // Limit to 50 characters and alphanumeric/underscore only
                  const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 50)
                  onNewFieldChange(sanitized)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (newField.trim() && !outputFields.includes(newField.trim())) {
                      onAddField()
                    }
                  } else if (e.key === 'Escape') {
                    e.currentTarget.blur()
                  }
                }}
                placeholder="field..."
                maxLength={50}
                className={cn(
                  "w-24 sm:w-32 px-2 py-2 sm:py-1 min-h-[44px] sm:min-h-[36px] bg-secondary/70 border rounded text-sm text-foreground font-mono",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-border",
                  "transition-all duration-150 ease-out touch-manipulation",
                  newField.length >= 50 && "border-yellow-500/50",
                  outputFields.includes(newField.trim()) && "border-red-500/50"
                )}
                aria-label="New output field name"
                aria-invalid={outputFields.includes(newField.trim())}
                aria-describedby={newField.trim() ? `field-hint-${newField}` : undefined}
              />
              <button
                onClick={onAddField}
                disabled={!newField.trim() || outputFields.includes(newField.trim())}
                className="p-2 sm:p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center hover:bg-accent rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Add new output field"
              >
                <Plus className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              </button>
            </div>
            {newField.trim() && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
                <span className={cn(
                  "tabular-nums",
                  newField.length >= 45 && "text-yellow-500",
                  newField.length >= 50 && "text-red-500"
                )}>
                  {newField.length}/50
                </span>
                {outputFields.includes(newField.trim()) && (
                  <span className="text-red-500">• Field already exists</span>
                )}
                {newField.length >= 50 && (
                  <span className="text-red-500">• Max length reached</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
})
