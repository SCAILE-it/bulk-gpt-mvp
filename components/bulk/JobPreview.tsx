'use client'

import { Sparkles, Check, X } from 'lucide-react'
import type { OutputColumn } from '@/hooks/useManualJobOptimizer'

interface JobPreviewProps {
  optimizedPrompt: string
  setOptimizedPrompt: (prompt: string) => void
  outputColumns: OutputColumn[]
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
  outputColumns,
  reasoning,
  isOptimizing,
  onAccept,
  onReject,
}: JobPreviewProps) {
  if (isOptimizing) {
    return (
      <div data-testid="job-preview" className="mt-3 p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-center gap-2 text-xs text-blue-300">
          <Sparkles className="h-3 w-3 animate-pulse" />
          <span>AI is analyzing your prompt and generating output columns...</span>
        </div>
      </div>
    )
  }

  if (!optimizedPrompt) {
    return null
  }

  return (
    <div data-testid="job-preview" className="mt-3 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-blue-400" />
          <span className="text-xs font-medium text-blue-300">AI Suggestion</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-300 hover:bg-white/5 rounded transition-all"
            title="Dismiss suggestion"
          >
            <X className="h-3 w-3" />
          </button>
          <button
            onClick={onAccept}
            className="px-3 py-1 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded transition-all active:scale-95"
          >
            <Check className="h-3 w-3 inline mr-1" />
            Use This Prompt
          </button>
        </div>
      </div>

      {/* Editable Optimized Prompt */}
      <div className="space-y-1">
        <p className="text-xs text-blue-300 font-medium">Optimized Prompt (editable):</p>
        <textarea
          data-testid="optimized-prompt"
          value={optimizedPrompt}
          onChange={(e) => setOptimizedPrompt(e.target.value)}
          className="w-full text-xs text-zinc-200 font-mono bg-zinc-900/70 p-2 rounded border border-blue-500/20 focus:border-blue-500/40 focus:outline-none resize-none"
          rows={3}
        />
      </div>

      {/* Output Columns */}
      {outputColumns.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-blue-300 font-medium">Detected Output Columns:</p>
          <div className="flex flex-wrap gap-2">
            {outputColumns.map((column, index) => (
              <div
                key={index}
                data-testid="output-column"
                className="text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded border border-blue-500/30"
                title={column.description}
              >
                {column.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reasoning */}
      {reasoning && (
        <p className="text-xs text-blue-300/70 italic">
          💡 {reasoning}
        </p>
      )}
    </div>
  )
}
