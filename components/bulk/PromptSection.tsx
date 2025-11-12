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
          <label htmlFor="prompt" className="text-xs font-medium text-foreground">
            Prompt
          </label>
          <div className="group relative">
            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
            <div className="hidden group-hover:block absolute left-0 top-5 z-50 w-64 p-3 bg-accent border border-border rounded-md text-xs text-foreground shadow-xl">
              <p>Use <span className="font-mono text-primary">{'{{column_name}}'}</span> to reference CSV columns.</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenTemplates}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
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
        className="w-full min-h-[120px] max-h-[400px] bg-secondary/70 border border-border text-foreground font-mono resize-y focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-border"
        placeholder="Write a bio for {{name}} at {{company}}"
        data-testid="prompt-textarea"
      />

      <div className="flex items-center justify-between text-xs">
        {csvData && (
          <p className="text-foreground">
            Variables: {csvData.columns.map(h => `{{${h}}}`).join(', ')}
          </p>
        )}
        <p className={`${
          prompt.length === 0 ? 'text-muted-foreground' :
          prompt.length < 20 ? 'text-orange-500' :
          prompt.length > 2000 ? 'text-yellow-500' :
          'text-muted-foreground'
        }`}>
          {prompt.length} characters
          {prompt.length > 0 && prompt.length < 20 && ' (too short)'}
          {prompt.length > 2000 && ' (may be too long)'}
        </p>
      </div>
    </div>
  )
}
