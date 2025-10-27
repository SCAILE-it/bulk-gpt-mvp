'use client'

import { Sparkles } from 'lucide-react'
import type { OutputColumn } from '@/hooks/useAutoJobOptimizer'

interface JobPreviewProps {
  optimizedPrompt: string
  outputColumns: OutputColumn[]
  reasoning: string | null
  isOptimizing: boolean
}

/**
 * ABOUTME: Displays AI-optimized job preview with improved prompt and detected output columns
 * ABOUTME: Shows automatically when user enters a prompt (after debounced optimization completes)
 */
export function JobPreview({ optimizedPrompt, outputColumns, reasoning, isOptimizing }: JobPreviewProps) {
  if (isOptimizing) {
    return (
      <div data-testid="job-preview" className="mt-3 p-3 rounded-md bg-zinc-900/50 border border-white/5">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Sparkles className="h-3 w-3 animate-pulse" />
          <span>Optimizing your job...</span>
        </div>
      </div>
    )
  }

  if (!optimizedPrompt) {
    return null
  }

  return (
    <div data-testid="job-preview" className="mt-3 p-3 rounded-md bg-zinc-900/50 border border-white/5 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-3 w-3 text-zinc-400" />
        <span className="text-xs font-medium text-zinc-300">AI-Optimized Job</span>
      </div>

      {/* Optimized Prompt */}
      <div className="space-y-1">
        <p className="text-xs text-zinc-500">Optimized Prompt:</p>
        <p data-testid="optimized-prompt" className="text-xs text-zinc-300 font-mono bg-zinc-900/70 p-2 rounded border border-white/5">
          {optimizedPrompt}
        </p>
      </div>

      {/* Output Columns */}
      {outputColumns.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500">Output Columns:</p>
          <div className="flex flex-wrap gap-2">
            {outputColumns.map((column, index) => (
              <div
                key={index}
                data-testid="output-column"
                className="text-xs bg-zinc-800/50 text-zinc-300 px-2 py-1 rounded border border-white/5"
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
        <p className="text-xs text-zinc-500 italic">
          {reasoning}
        </p>
      )}
    </div>
  )
}
