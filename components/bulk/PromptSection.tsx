'use client'

import { useState, useMemo } from 'react'
import { FileText, HelpCircle, XCircle, Eye, EyeOff } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface PromptSectionProps {
  prompt: string
  onPromptChange: (value: string) => void
  csvData: ParsedCSV | null
  onOpenTemplates: () => void
  selectedInputColumns?: string[]
  variableValidation?: {
    missing: string[]
    isValid: boolean
  }
}

export function PromptSection({ 
  prompt, 
  onPromptChange, 
  csvData, 
  onOpenTemplates,
  selectedInputColumns = [],
  variableValidation
}: PromptSectionProps) {
  const [showPreview, setShowPreview] = useState(false)

  // Filter available columns based on selectedInputColumns
  const availableColumns = useMemo(() => {
    if (!csvData) return []
    if (selectedInputColumns.length === 0) return csvData.columns
    return csvData.columns.filter(col => selectedInputColumns.includes(col))
  }, [csvData, selectedInputColumns])

  // Extract variables from prompt
  const promptVariables = useMemo(() => {
    if (!prompt) return []
    const variablePattern = /\{\{([^}]+)\}\}/g
    const matches = Array.from(prompt.matchAll(variablePattern))
    return Array.from(new Set(matches.map(m => m[1].trim())))
  }, [prompt])

  // Fill variables with first row data (only from selected columns)
  const filledPrompt = useMemo(() => {
    if (!csvData || !prompt || csvData.rows.length === 0) return prompt
    
    let filled = prompt
    availableColumns.forEach(col => {
      const value = csvData.rows[0].data[col] || ''
      filled = filled.replace(new RegExp(`\\{\\{${col}\\}\\}`, 'g'), value)
    })
    return filled
  }, [prompt, csvData, availableColumns])

  const hasPreview = csvData && csvData.rows.length > 0 && prompt && filledPrompt !== prompt

  return (
    <div className="space-y-3">
      {/* Header with help and templates */}
      <div className="flex items-center justify-between">
        <div className="group relative">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          <div className="hidden group-hover:block absolute left-0 top-5 z-50 w-64 p-3 bg-accent border border-border rounded-md text-xs text-foreground shadow-xl">
            <p>Use <span className="font-mono text-primary">{'{{column_name}}'}</span> to reference CSV columns.</p>
          </div>
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

      {/* Textarea */}
      <Textarea
        id="prompt"
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        className="w-full min-h-[120px] max-h-[400px] bg-secondary/70 border border-border text-foreground font-mono resize-y focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-border"
        placeholder="Write a bio for {{name}} at {{company}}"
        data-testid="prompt-textarea"
      />

      {/* Preview section - integrated and clean */}
      {hasPreview && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-7 text-xs text-muted-foreground hover:text-foreground -ml-2"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-3 w-3 mr-1.5" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1.5" />
                Show Preview
              </>
            )}
          </Button>
          
          {showPreview && (
            <div className="p-4 bg-muted/30 border border-border/50 rounded-md">
              <div className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">
                Preview (first row)
              </div>
              <div className="text-sm font-mono text-foreground whitespace-pre-wrap leading-relaxed">
                {filledPrompt}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Variables and character count */}
      <div className="flex items-start justify-between gap-4 text-xs pt-1">
        {csvData && (
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[10px] font-medium">Variables:</span>
              {/* Show available columns */}
              {availableColumns.map(col => {
                const isUsed = promptVariables.includes(col)
                
                return (
                  <span
                    key={col}
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      isUsed
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-muted/50 text-muted-foreground border border-border/30'
                    }`}
                    title={isUsed ? 'Variable used in prompt' : 'Available variable'}
                  >
                    {`{{${col}}}`}
                  </span>
                )
              })}
              {/* Show missing variables (used in prompt but not in available columns) */}
              {variableValidation?.missing.map(v => (
                <span
                  key={v}
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30"
                  title="Variable used in prompt but column is deselected"
                >
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          </div>
        )}
        <p className={`flex-shrink-0 ${
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

      {/* Error messages in Task section */}
      {variableValidation && !variableValidation.isValid && variableValidation.missing.length > 0 && (
        <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
          <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">
            Missing variables: {variableValidation.missing.map(v => `{{${v}}}`).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}
