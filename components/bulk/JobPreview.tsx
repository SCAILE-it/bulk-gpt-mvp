'use client'

import { Sparkles, Check, X } from 'lucide-react'
import type { OutputColumn } from '@/hooks/useManualJobOptimizer'

interface JobPreviewProps {
  optimizedPrompt?: string
  setOptimizedPrompt: (prompt: string) => void
  outputColumns?: OutputColumn[]
  suggestedInputColumns?: string[]
  suggestedTools?: string[]
  reasoning: string | null
  isOptimizing: boolean
  onAccept: () => void
  onReject: () => void
}

/**
 * ABOUTME: Displays editable AI-optimized job preview with accept/reject buttons
 * ABOUTME: User can edit the suggestion before accepting it
 */
export function JobPreview({
  optimizedPrompt,
  setOptimizedPrompt,
  outputColumns = [],
  suggestedInputColumns = [],
  suggestedTools = [],
  reasoning,
  isOptimizing,
  onAccept,
  onReject,
}: JobPreviewProps) {
  if (isOptimizing) {
    return (
      <div data-testid="job-preview" className="mt-3 p-3 rounded-md bg-primary/10 border border-primary/20 space-y-3">
        <div className="flex items-center gap-2 text-xs text-primary/90">
          <Sparkles className="h-3 w-3 animate-pulse" />
          <span>AI is analyzing your job and generating optimizations...</span>
        </div>
        {/* Progress bar with shimmer effect */}
        <div className="w-full h-1.5 bg-primary/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full relative"
            style={{ 
              width: '100%',
              background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 50%, hsl(var(--primary)) 100%)',
              backgroundSize: '200% 100%',
              animation: 'progress-shimmer 1.5s linear infinite'
            }}
          />
        </div>
      </div>
    )
  }

  // Show preview if any optimization exists or if tools section should be shown
  if (!optimizedPrompt && outputColumns.length === 0 && suggestedInputColumns.length === 0 && suggestedTools.length === 0) {
    return null
  }

  return (
    <div data-testid="job-preview" className="mt-3 p-3 rounded-md bg-primary/10 border border-primary/20 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-primary/90">AI Suggestion</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded transition-all"
            title="Dismiss suggestion"
          >
            <X className="h-3 w-3" />
          </button>
          <button
            onClick={onAccept}
            className="px-3 py-1 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-all active:scale-95"
          >
            <Check className="h-3 w-3 inline mr-1" />
            Apply
          </button>
        </div>
      </div>

      {/* Suggested Input Columns */}
      {suggestedInputColumns.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-primary/90 font-medium">Suggested Input Columns:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedInputColumns.map((column, index) => (
              <div
                key={index}
                data-testid="input-column"
                className="text-xs bg-primary/20 text-primary/80 px-2 py-1 rounded border border-primary/30"
              >
                {column}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editable Optimized Prompt */}
      {optimizedPrompt && (
        <div className="space-y-1">
          <p className="text-xs text-primary/90 font-medium">Optimized Prompt (editable):</p>
          <textarea
            data-testid="optimized-prompt"
            value={optimizedPrompt}
            onChange={(e) => setOptimizedPrompt(e.target.value)}
            className="w-full text-xs text-foreground font-mono bg-secondary/70 p-2 rounded border border-primary/20 focus:border-primary/40 focus:outline-none resize-none"
            rows={3}
          />
        </div>
      )}

      {/* Suggested Output Columns */}
      {outputColumns.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-primary/90 font-medium">Suggested Output Columns:</p>
          <div className="flex flex-wrap gap-2">
            {outputColumns.map((column, index) => (
              <div
                key={index}
                data-testid="output-column"
                className="text-xs bg-primary/20 text-primary/80 px-2 py-1 rounded border border-primary/30"
                title={column.description}
              >
                {column.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Tools - Always show, even if empty */}
      <div className="space-y-1">
        <p className="text-xs text-primary/90 font-medium">Suggested Tools:</p>
        {suggestedTools.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestedTools.map((tool, index) => (
              <div
                key={index}
                data-testid="suggested-tool"
                className="text-xs bg-primary/20 text-primary/80 px-2 py-1 rounded border border-primary/30"
              >
                {tool}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic">No tools suggested</p>
        )}
      </div>

      {/* Reasoning */}
      {reasoning && (
        <p className="text-xs text-primary/70 italic">
          💡 {reasoning}
        </p>
      )}
    </div>
  )
}
