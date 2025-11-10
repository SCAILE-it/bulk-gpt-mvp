/**
 * ABOUTME: AI Assistant section that consolidates AI-powered features
 * ABOUTME: Provides unified interface for column generation and prompt optimization
 */

import { Sparkles, Loader2, Wand2 } from 'lucide-react'
import { SectionHeader } from './SectionHeader'

export interface AIAssistantSectionProps {
  /** Whether the prompt field has content */
  hasPrompt: boolean
  /** Whether CSV data is loaded */
  hasCSVData: boolean
  /** Whether column generation is in progress */
  isGeneratingColumns: boolean
  /** Whether prompt optimization is in progress */
  isOptimizing: boolean
  /** Whether an optimized prompt suggestion is currently shown */
  hasOptimizedPrompt: boolean
  /** Callback when user clicks "Generate Columns" */
  onGenerateColumns: () => void
  /** Callback when user clicks "Optimize Prompt" */
  onOptimizePrompt: () => void
}

/**
 * Unified AI assistant interface for bulk processor
 *
 * Consolidates AI-powered features (column generation and prompt optimization)
 * into a single, coherent section with clear descriptions of each feature.
 *
 * @example
 * <AIAssistantSection
 *   hasPrompt={!!prompt}
 *   hasCSVData={!!csvData}
 *   isGeneratingColumns={isGenerating}
 *   isOptimizing={isOptimizing}
 *   hasOptimizedPrompt={!!optimizedPrompt}
 *   onGenerateColumns={handleGenerate}
 *   onOptimizePrompt={handleOptimize}
 * />
 */
export function AIAssistantSection({
  hasPrompt,
  hasCSVData,
  isGeneratingColumns,
  isOptimizing,
  hasOptimizedPrompt,
  onGenerateColumns,
  onOptimizePrompt
}: AIAssistantSectionProps) {
  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Sparkles}
        title="AI Assistant"
        description="Let AI help you configure your batch processing"
      />

      <div className="space-y-2">
        {/* Generate Columns Button */}
        <button
          onClick={onGenerateColumns}
          disabled={!hasPrompt || isGeneratingColumns || isOptimizing}
          className="w-full px-3 py-2.5 bg-zinc-900/50 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10 rounded-md text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-all active:scale-[0.98] flex items-start gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-left group"
          aria-label="Auto-generate output columns from your prompt using AI"
        >
          <div className="flex-shrink-0 mt-0.5">
            {isGeneratingColumns ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" aria-hidden="true" />
            ) : (
              <Wand2 className="h-4 w-4 text-zinc-500 group-hover:text-blue-400 transition-colors" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">
              {isGeneratingColumns ? 'Generating columns...' : 'Generate Columns'}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Analyzes your prompt to suggest appropriate output columns
            </div>
          </div>
        </button>

        {/* Optimize Prompt Button */}
        <button
          onClick={onOptimizePrompt}
          disabled={!hasPrompt || !hasCSVData || isOptimizing || hasOptimizedPrompt || isGeneratingColumns}
          className="w-full px-3 py-2.5 bg-zinc-900/50 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10 rounded-md text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-all active:scale-[0.98] flex items-start gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-left group"
          aria-label="Optimize prompt with AI and auto-detect output columns"
        >
          <div className="flex-shrink-0 mt-0.5">
            {isOptimizing ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4 text-zinc-500 group-hover:text-blue-400 transition-colors" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">
              {isOptimizing ? 'Optimizing prompt...' : 'Optimize Prompt'}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Improves your prompt and automatically detects output columns
            </div>
          </div>
        </button>
      </div>

      {/* Info text */}
      {!hasPrompt && (
        <p className="text-xs text-zinc-600 italic">
          Add a prompt to enable AI assistance
        </p>
      )}
      {hasPrompt && !hasCSVData && (
        <p className="text-xs text-zinc-600 italic">
          Upload CSV data to enable prompt optimization
        </p>
      )}
    </div>
  )
}
