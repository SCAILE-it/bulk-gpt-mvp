'use client'

import { useState, useMemo } from 'react'
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
  const [showPreview, setShowPreview] = useState(false)

  // Fill variables with first row data
  const filledPrompt = useMemo(() => {
    if (!csvData || !prompt || csvData.rows.length === 0) return prompt
    
    let filled = prompt
    csvData.columns.forEach(col => {
      const value = csvData.rows[0].data[col] || ''
      filled = filled.replace(new RegExp(`\\{\\{${col}\\}\\}`, 'g'), value)
    })
    return filled
  }, [prompt, csvData])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="group relative">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            <div className="hidden group-hover:block absolute left-0 top-5 z-50 w-64 p-3 bg-accent border border-border rounded-md text-xs text-foreground shadow-xl">
              <p>Use <span className="font-mono text-primary">{'{{column_name}}'}</span> to reference CSV columns.</p>
            </div>
          </div>
          {csvData && csvData.rows.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenTemplates}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          title="Browse pre-made prompt templates"
          aria-label="Browse pre-made prompt templates"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          Browse Templates
        </button>
      </div>

      <div className="relative group">
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="w-full min-h-[120px] max-h-[400px] bg-secondary/70 border border-border text-foreground font-mono resize-y focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-border"
          placeholder="Write a bio for {{name}} at {{company}}"
          data-testid="prompt-textarea"
        />
        
        {/* Hover tooltip with filled preview */}
        {csvData && csvData.rows.length > 0 && prompt && (
          <div className="hidden group-hover:block absolute top-full left-0 right-0 mt-2 p-3 bg-accent border border-border rounded-md text-xs text-foreground shadow-xl z-50">
            <div className="font-semibold mb-1.5 text-muted-foreground">Preview:</div>
            <div className="font-mono whitespace-pre-wrap leading-relaxed">{filledPrompt}</div>
          </div>
        )}
      </div>

      {/* Preview below (when toggled) */}
      {showPreview && csvData && csvData.rows.length > 0 && prompt && (
        <div className="p-3 bg-secondary/50 border border-border rounded-md">
          <div className="text-xs font-semibold mb-2 text-muted-foreground">Preview with first row:</div>
          <div className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">{filledPrompt}</div>
        </div>
      )}

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
