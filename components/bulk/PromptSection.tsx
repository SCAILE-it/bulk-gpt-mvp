'use client'

import { FileText, HelpCircle } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'

interface PromptSectionProps {
  prompt: string
  onPromptChange: (value: string) => void
  csvData: ParsedCSV | null
  onOpenTemplates: () => void
}

export function PromptSection({ prompt, onPromptChange, csvData, onOpenTemplates }: PromptSectionProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="prompt" className="text-xs font-medium text-zinc-300">
            Prompt
          </label>
          <div className="group relative">
            <HelpCircle className="h-3 w-3 text-zinc-600 cursor-help" />
            <div className="hidden group-hover:block absolute left-0 top-5 z-50 w-64 p-3 bg-zinc-800 border border-white/10 rounded-md text-xs text-zinc-300 shadow-xl">
              <p>Use <span className="font-mono text-blue-400">{'{{column_name}}'}</span> to reference CSV columns.</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenTemplates}
          className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
          title="Browse pre-made prompt templates"
          aria-label="Browse pre-made prompt templates"
        >
          <FileText className="h-3 w-3" aria-hidden="true" />
          Browse Templates
        </button>
      </div>

      <Textarea
        id="prompt"
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        className="w-full min-h-[120px] max-h-[400px] bg-zinc-900/70 border-white/5 text-zinc-300 font-mono resize-y focus-visible:ring-white/10 focus-visible:border-white/10"
        placeholder="Write a bio for {{name}} at {{company}}"
        data-testid="prompt-textarea"
      />

      <div className="flex items-center justify-between text-xs">
        {csvData && (
          <p className="text-zinc-300">
            Variables: {csvData.columns.map(h => `{{${h}}}`).join(', ')}
          </p>
        )}
        <p className={`${
          prompt.length === 0 ? 'text-zinc-600' :
          prompt.length < 20 ? 'text-orange-500' :
          prompt.length > 2000 ? 'text-yellow-500' :
          'text-zinc-400'
        }`}>
          {prompt.length} characters
          {prompt.length > 0 && prompt.length < 20 && ' (too short)'}
          {prompt.length > 2000 && ' (may be too long)'}
        </p>
      </div>
    </div>
  )
}
