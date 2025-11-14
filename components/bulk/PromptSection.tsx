'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { FileText, HelpCircle, XCircle, Eye, EyeOff } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

// Helper function to highlight variables in text (returns HTML)
function highlightVariables(
  text: string,
  availableColumns: string[],
  missingVariables: string[]
): string {
  if (!text) return ''
  
  // Escape HTML first
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // Find all variables and highlight them
  const variablePattern = /\{\{([^}]+)\}\}/g
  const matches = Array.from(text.matchAll(variablePattern))
  
  // Sort by position (reverse order to avoid index shifting)
  const sortedMatches = matches.sort((a, b) => (b.index || 0) - (a.index || 0))
  
  sortedMatches.forEach(match => {
    const variableName = match[1].trim()
    const isMissing = missingVariables.includes(variableName)
    const isValid = availableColumns.includes(variableName)
    
    let colorClass = ''
    if (isMissing) {
      colorClass = 'text-red-400'
    } else if (isValid) {
      colorClass = 'text-green-400'
    }
    
    if (colorClass) {
      const highlighted = `<span class="${colorClass}">${match[0]}</span>`
      const start = match.index || 0
      const end = start + match[0].length
      escaped = escaped.slice(0, start) + highlighted + escaped.slice(end)
    }
  })
  
  // Convert newlines to <br>
  return escaped.replace(/\n/g, '<br>')
}

export function PromptSection({ 
  prompt, 
  onPromptChange, 
  csvData, 
  onOpenTemplates,
  selectedInputColumns = [],
  variableValidation
}: PromptSectionProps) {
  const [previewMode, setPreviewMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

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

  // Highlighted HTML for edit mode
  const highlightedPrompt = useMemo(() => {
    if (previewMode) return ''
    return highlightVariables(
      prompt,
      availableColumns,
      variableValidation?.missing || []
    )
  }, [prompt, availableColumns, variableValidation?.missing, previewMode])

  // Highlighted HTML for preview mode (highlight filled values)
  const highlightedFilledPrompt = useMemo(() => {
    if (!previewMode || !csvData || !prompt) return ''
    
    // In preview mode, we want to highlight the filled values
    let result = filledPrompt
    
    // Find original variables in prompt
    const variablePattern = /\{\{([^}]+)\}\}/g
    const matches = Array.from(prompt.matchAll(variablePattern))
    
    // Replace filled values with highlighted versions
    matches.forEach(match => {
      const variableName = match[1].trim()
      const isMissing = (variableValidation?.missing || []).includes(variableName)
      const isValid = availableColumns.includes(variableName)
      
      if (isValid && csvData.rows[0]) {
        const value = csvData.rows[0].data[variableName] || ''
        if (value) {
          // Escape the value for HTML
          const escapedValue = value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          const colorClass = 'text-green-400'
          const highlighted = `<span class="${colorClass}">${escapedValue}</span>`
          // Replace the first occurrence
          result = result.replace(value, highlighted)
        }
      } else if (isMissing) {
        // Keep the variable placeholder highlighted in red
        const escapedVar = match[0]
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        const colorClass = 'text-red-400'
        const highlighted = `<span class="${colorClass}">${escapedVar}</span>`
        result = result.replace(match[0], highlighted)
      }
    })
    
    // Convert newlines to <br>
    return result.replace(/\n/g, '<br>')
  }, [previewMode, filledPrompt, prompt, csvData, availableColumns, variableValidation?.missing])

  const hasPreview = csvData && csvData.rows.length > 0 && prompt && filledPrompt !== prompt

  // Insert variable at cursor position
  const insertVariable = useCallback((variableName: string) => {
    if (previewMode) return
    
    const textarea = textareaRef.current
    if (!textarea) return
    
    const variable = `{{${variableName}}}`
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const textBefore = prompt.substring(0, start)
    const textAfter = prompt.substring(end)
    const newPrompt = textBefore + variable + textAfter
    
    onPromptChange(newPrompt)
    
    // Set cursor position after inserted variable
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + variable.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      }
    }, 0)
  }, [prompt, previewMode, onPromptChange])

  // Sync highlight overlay with textarea scroll and content
  useEffect(() => {
    if (!textareaRef.current || !highlightRef.current) return
    
    const textarea = textareaRef.current
    const highlight = highlightRef.current
    
    // Sync scroll
    const syncScroll = () => {
      highlight.scrollTop = textarea.scrollTop
      highlight.scrollLeft = textarea.scrollLeft
    }
    
    textarea.addEventListener('scroll', syncScroll)
    
    // Update highlight content
    if (previewMode) {
      highlight.innerHTML = highlightedFilledPrompt || filledPrompt.replace(/\n/g, '<br>')
    } else {
      highlight.innerHTML = highlightedPrompt || prompt.replace(/\n/g, '<br>')
    }
    
    return () => {
      textarea.removeEventListener('scroll', syncScroll)
    }
  }, [prompt, filledPrompt, highlightedPrompt, highlightedFilledPrompt, previewMode])

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

      {/* Textarea with syntax highlighting overlay */}
      <div className="relative">
        {/* Highlight overlay */}
        <div
          ref={highlightRef}
          className={cn(
            "absolute inset-0 w-full min-h-[120px] max-h-[400px] bg-secondary/70 border border-transparent text-foreground font-mono resize-none overflow-hidden pointer-events-none text-sm",
            "px-3 py-2 rounded-md whitespace-pre-wrap break-words",
            previewMode && "opacity-90"
          )}
          aria-hidden="true"
        />
        
        {/* Actual textarea */}
        <Textarea
          ref={textareaRef}
          id="prompt"
          value={previewMode ? filledPrompt : prompt}
          onChange={(e) => {
            if (!previewMode) {
              onPromptChange(e.target.value)
            }
          }}
          readOnly={previewMode}
          className={cn(
            "w-full min-h-[120px] max-h-[400px] bg-transparent border border-border text-transparent font-mono resize-y text-sm",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-border",
            "caret-foreground",
            previewMode && "opacity-90 cursor-default"
          )}
          placeholder="Write a bio for {{name}} at {{company}}"
          data-testid="prompt-textarea"
          style={{
            color: 'transparent',
          }}
        />
        
        {/* Preview Mode Toggle */}
        {hasPreview && (
          <div className="absolute top-2 right-2 z-10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground bg-background/80 backdrop-blur-sm"
              title={previewMode ? 'Switch to edit mode' : 'Switch to preview mode'}
            >
              {previewMode ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1.5" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1.5" />
                  Preview
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Variables and character count */}
      <div className="flex items-start justify-between gap-4 text-xs pt-1">
        {csvData && (
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Variables:</span>
              {/* Show available columns */}
              {availableColumns.map(col => {
                const isUsed = promptVariables.includes(col)
                
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => insertVariable(col)}
                    disabled={previewMode}
                    className={cn(
                      "font-mono text-xs px-1.5 py-0.5 rounded transition-colors cursor-pointer",
                      "hover:opacity-80 active:scale-95",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      isUsed
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                        : 'bg-muted/50 text-muted-foreground border border-border/30 hover:bg-muted/70'
                    )}
                    title={isUsed ? 'Variable used in prompt - Click to insert' : 'Click to insert variable'}
                  >
                    {`{{${col}}}`}
                  </button>
                )
              })}
              {/* Show missing variables (used in prompt but not in available columns) */}
              {variableValidation?.missing.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  disabled={previewMode}
                  className="font-mono text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors cursor-pointer hover:opacity-80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Variable used in prompt but column is deselected - Click to insert"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className={cn(
          "flex-shrink-0 text-xs",
          prompt.length === 0 ? 'text-muted-foreground' :
          prompt.length < 20 ? 'text-orange-500' :
          prompt.length > 2000 ? 'text-yellow-500' :
          'text-muted-foreground'
        )}>
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
