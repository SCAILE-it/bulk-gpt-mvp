/**
 * ABOUTME: AI Assistant section that consolidates AI-powered features
 * ABOUTME: Single unified button for prompt optimization and column generation
 */

import { Sparkles, Loader2 } from 'lucide-react'
import { SectionHeader } from './SectionHeader'

export interface AIAssistantSectionProps {
  /** Whether the prompt field has content */
  hasPrompt: boolean
  /** Whether CSV data is loaded */
  hasCSVData: boolean
  /** Whether optimization is in progress */
  isOptimizing: boolean
  /** Whether an optimized prompt suggestion is currently shown */
  hasOptimizedPrompt: boolean
  /** Callback when user clicks "Optimize with AI" */
  onOptimize: () => void
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
  isOptimizing,
  hasOptimizedPrompt,
  onOptimize
}: AIAssistantSectionProps) {
  return (
    <div className="space-y-2">
      <SectionHeader
        icon={Sparkles}
        title="AI Assistant"
      />

      {/* Single Unified AI Button */}
      <button
        onClick={onOptimize}
        disabled={!hasPrompt || !hasCSVData || isOptimizing || hasOptimizedPrompt}
        className="w-full px-3 py-2.5 bg-gradient-to-r from-blue-600/10 to-purple-600/10 hover:from-blue-600/20 hover:to-purple-600/20 border border-blue-500/20 hover:border-blue-500/30 rounded-md text-sm font-medium text-zinc-100 transition-all active:scale-[0.98] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
        aria-label="Optimize prompt and auto-generate columns with AI"
      >
        <div className="flex-shrink-0">
          {isOptimizing ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4 text-blue-400 group-hover:text-blue-300 transition-colors" aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium">
            {isOptimizing ? 'Optimizing with AI...' : 'Optimize with AI'}
          </div>
        </div>
      </button>

      {/* Info text */}
      {!hasPrompt && (
        <p className="text-xs text-zinc-600 italic">
          Add a prompt to enable AI optimization
        </p>
      )}
      {hasPrompt && !hasCSVData && (
        <p className="text-xs text-zinc-600 italic">
          Upload CSV data to enable AI optimization
        </p>
      )}
    </div>
  )
}
