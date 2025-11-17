'use client'

import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react'
import { FileText, HelpCircle, XCircle, Eye, EyeOff, Save } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useContextStorage } from '@/hooks/useContextStorage'
import { SavePromptDialog } from '@/components/prompts/SavePromptDialog'
import { useSavedPrompts } from '@/hooks/useSavedPrompts'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { KeyboardShortcutTooltip } from '@/components/ui/keyboard-shortcut-tooltip'

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
  missingVariables: string[],
  contextVariables?: Record<string, string | undefined>
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
    const isContextVar = variableName.startsWith('context.')
    const isMissing = missingVariables.includes(variableName)
    const isValid = availableColumns.includes(variableName)
    
    let colorClass = ''
    if (isContextVar) {
      // Context variables: blue if set, red if missing
      const contextValue = contextVariables?.[variableName.replace('context.', '')]
      if (contextValue && contextValue.trim()) {
        colorClass = 'text-blue-400' // Blue for context variables that are set
      } else {
        colorClass = 'text-red-400' // Red if context variable is missing
      }
    } else if (isMissing) {
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

export const PromptSection = memo(function PromptSection({ 
  prompt, 
  onPromptChange, 
  csvData, 
  onOpenTemplates,
  selectedInputColumns = [],
  variableValidation
}: PromptSectionProps) {
  const [previewMode, setPreviewMode] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const errorMessageId = `prompt-error-${useMemo(() => Math.random().toString(36).substr(2, 9), [])}`
  const { context } = useContextStorage()
  const { savePrompt } = useSavedPrompts()

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

  // Get context variable names that are set
  const contextVariableNames = useMemo(() => {
    const names: string[] = []
    if (context.tone) names.push('context.tone')
    if (context.targetCountries) names.push('context.targetCountries')
    if (context.productDescription) names.push('context.productDescription')
    if (context.competitors) names.push('context.competitors')
    if (context.targetIndustries) names.push('context.targetIndustries')
    if (context.complianceFlags) names.push('context.complianceFlags')
    return names
  }, [context])

  // Fill variables with first row data and context variables
  const filledPrompt = useMemo(() => {
    if (!prompt) return prompt
    
    let filled = prompt
    
    // Fill CSV variables
    if (csvData && csvData.rows.length > 0) {
      availableColumns.forEach(col => {
        const value = csvData.rows[0].data[col] || ''
        filled = filled.replace(new RegExp(`\\{\\{${col}\\}\\}`, 'g'), value)
      })
    }
    
    // Fill context variables
    const contextMap: Record<string, string> = {
      'context.tone': context.tone || '',
      'context.targetCountries': context.targetCountries || '',
      'context.productDescription': context.productDescription || '',
      'context.competitors': context.competitors || '',
      'context.targetIndustries': context.targetIndustries || '',
      'context.complianceFlags': context.complianceFlags || '',
    }
    
    Object.entries(contextMap).forEach(([varName, value]) => {
      if (value) {
        filled = filled.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value)
      }
    })
    
    return filled
  }, [prompt, csvData, availableColumns, context])

  // Highlighted HTML for edit mode
  const highlightedPrompt = useMemo(() => {
    if (previewMode) return ''
    return highlightVariables(
      prompt,
      availableColumns,
      variableValidation?.missing || [],
      {
        tone: context.tone,
        targetCountries: context.targetCountries,
        productDescription: context.productDescription,
        competitors: context.competitors,
        targetIndustries: context.targetIndustries,
        complianceFlags: context.complianceFlags,
      }
    )
  }, [prompt, availableColumns, variableValidation?.missing, previewMode, context])

  // Highlighted HTML for preview mode (highlight filled values)
  const highlightedFilledPrompt = useMemo(() => {
    if (!previewMode || !prompt) return ''
    
    // If no CSV data and no context values, return empty
    const hasData = (csvData && csvData.rows.length > 0) || Object.values(context).some(v => v && v.trim())
    if (!hasData) return ''
    
    // In preview mode, we want to highlight the filled values
    let result = filledPrompt
    
    // Escape HTML first
    result = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Find original variables in prompt
    const variablePattern = /\{\{([^}]+)\}\}/g
    const matches = Array.from(prompt.matchAll(variablePattern))
    
    // Sort by position (reverse order to avoid index shifting)
    const sortedMatches = matches.sort((a, b) => (b.index || 0) - (a.index || 0))
    
    // Replace filled values with highlighted versions
    sortedMatches.forEach(match => {
      const variableName = match[1].trim()
      const isContextVar = variableName.startsWith('context.')
      const isMissing = (variableValidation?.missing || []).includes(variableName)
      const isValid = availableColumns.includes(variableName)
      
      if (isContextVar) {
        // Context variable - find the filled value
        const contextKey = variableName.replace('context.', '')
        const contextValue = context[contextKey as keyof typeof context] as string | undefined
        
        if (contextValue && contextValue.trim()) {
          // Escape and highlight the filled context value in blue
          const escapedValue = contextValue
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          const highlighted = `<span class="text-blue-400 font-medium">${escapedValue}</span>`
          // Replace all occurrences of this value (but be careful with partial matches)
          result = result.replace(new RegExp(escapedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), highlighted)
        } else {
          // Context variable not set - keep placeholder in red
          const escapedVar = match[0]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          const highlighted = `<span class="text-red-400">${escapedVar}</span>`
          result = result.replace(match[0], highlighted)
        }
      } else if (isValid && csvData?.rows[0]) {
        const value = csvData.rows[0].data[variableName] || ''
        if (value) {
          // Escape the value for HTML
          const escapedValue = value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          const colorClass = 'text-green-400 font-medium'
          const highlighted = `<span class="${colorClass}">${escapedValue}</span>`
          // Replace the first occurrence (be careful with partial matches)
          const regex = new RegExp(escapedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          result = result.replace(regex, highlighted)
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
  }, [previewMode, filledPrompt, prompt, csvData, availableColumns, variableValidation?.missing, context])

  // Check if preview is available (has CSV data or context variables that can be filled)
  const hasPreview = prompt && (
    (csvData && csvData.rows.length > 0) || 
    Object.values(context).some(v => v && v.trim())
  ) && filledPrompt !== prompt

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

  // Check if context variable is used in prompt
  const isContextVariableUsed = useCallback((varName: string) => {
    return promptVariables.includes(varName)
  }, [promptVariables])

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
      <TooltipProvider>
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Learn about variable syntax"
              >
                <HelpCircle className="h-3.5 w-3.5 cursor-help" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1.5 text-xs">
                <p className="font-medium">Variable Syntax</p>
                <p className="text-muted-foreground">
                  Use <span className="font-mono text-primary">{'{{column_name}}'}</span> to reference CSV columns in your prompt.
                </p>
                <p className="text-muted-foreground mt-2 pt-2 border-t border-border">
                  <strong>Example:</strong> <span className="font-mono">{'{{name}}'}</span> will be replaced with the value from the &quot;name&quot; column for each row.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2">
            {prompt.trim() && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowSaveDialog(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                    aria-label="Save prompt"
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    Save Prompt
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save this prompt for later use</p>
                </TooltipContent>
              </Tooltip>
            )}
            <KeyboardShortcutTooltip
              content="Browse pre-made prompt templates"
              shortcut="⌘B"
            >
              <button
                type="button"
                onClick={onOpenTemplates}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-accent/50"
                aria-label="Browse pre-made prompt templates"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Browse Templates</span>
              </button>
            </KeyboardShortcutTooltip>
          </div>
        </div>
      </TooltipProvider>

      {/* Save Prompt Dialog */}
      <SavePromptDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={async (name, description, tags) => {
          await savePrompt(name, prompt, description, tags)
        }}
        prompt={prompt}
      />

      {/* Textarea with syntax highlighting overlay */}
      <div className="relative">
        {/* Highlight overlay - shows colored variables */}
        <div
          ref={highlightRef}
          className={cn(
            "absolute inset-0 w-full min-h-[120px] max-h-[400px] bg-transparent border border-transparent font-mono resize-none overflow-hidden pointer-events-none text-sm sm:text-base",
            "px-3 py-2 sm:px-4 sm:py-3 rounded-md whitespace-pre-wrap break-words",
            previewMode && "opacity-90"
          )}
          aria-hidden="true"
          style={{ 
            zIndex: 1,
          }}
        />
        
        {/* Actual textarea */}
        <Textarea
          ref={textareaRef}
          id="prompt"
          value={previewMode ? filledPrompt : prompt}
          onChange={(e) => {
            if (!previewMode) {
              // Limit to 10,000 characters
              const value = e.target.value.slice(0, 10000)
              onPromptChange(value)
            }
          }}
          readOnly={previewMode}
          maxLength={10000}
          className={cn(
            "w-full min-h-[120px] sm:min-h-[140px] max-h-[400px] bg-transparent border font-mono resize-y text-sm sm:text-base",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-border",
            "caret-foreground transition-colors relative z-10",
            "px-3 py-2 sm:px-4 sm:py-3",
            previewMode && "opacity-90 cursor-default",
            variableValidation && !variableValidation.isValid && "border-red-500/50",
            prompt.length >= 10000 && "border-yellow-500/50",
            prompt.length >= 8000 && prompt.length < 10000 && "border-yellow-500/30"
          )}
          placeholder="Write a bio for {{name}} at {{company}}"
          data-testid="prompt-textarea"
          aria-invalid={variableValidation && !variableValidation.isValid}
          aria-describedby={variableValidation && !variableValidation.isValid ? errorMessageId : undefined}
          style={{
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
          }}
          onBlur={() => {
            // Trigger validation feedback on blur
            if (variableValidation && !variableValidation.isValid) {
              // Ensure error message is visible
              const errorElement = document.getElementById(errorMessageId)
              if (errorElement) {
                errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              }
            }
          }}
        />
        
        {/* Preview Mode Toggle and Validation Status */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          {/* Real-time validation indicator */}
          {prompt && (
            <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
              {variableValidation && variableValidation.isValid ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                  <span className="text-green-500 font-medium">Valid</span>
                </>
              ) : variableValidation && !variableValidation.isValid ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                  <span className="text-red-500 font-medium">
                    {variableValidation.missing.length} missing
                  </span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                  <span className="text-muted-foreground">Checking...</span>
                </>
              )}
            </div>
          )}
          {hasPreview && (
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
          )}
        </div>
      </div>

      {/* Variables and character count */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 text-xs pt-1">
        {/* Enhanced Character count */}
        <div className="flex items-center gap-2">
          {prompt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className={cn(
                "tabular-nums font-medium",
                prompt.length >= 8000 && prompt.length < 10000 && "text-yellow-500",
                prompt.length >= 10000 && "text-red-500"
              )}>
                {prompt.length.toLocaleString()}/10,000
              </span>
              {prompt.length >= 8000 && prompt.length < 10000 && (
                <span className="text-[10px] text-yellow-500">• Approaching limit</span>
              )}
              {prompt.length >= 10000 && (
                <span className="text-[10px] text-red-500">• Max length reached</span>
              )}
              {prompt.length > 5000 && prompt.length < 8000 && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline">• Long prompt may increase processing time</span>
              )}
            </div>
          )}
        </div>
        {(csvData || contextVariableNames.length > 0) && (
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Variables:</span>
              
              {/* CSV Variables */}
              {csvData && availableColumns.map(col => {
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
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      isUsed
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                        : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted/70'
                    )}
                    title={isUsed ? 'Variable used in prompt - Click to insert' : 'Click to insert variable'}
                    aria-label={isUsed ? `Variable ${col} is used in prompt. Click to insert into prompt` : `Insert variable ${col} into prompt`}
                  >
                    {`{{${col}}}`}
                  </button>
                )
              })}
              
              {/* Context Variables */}
              {contextVariableNames.length > 0 && (
                <>
                  {csvData && availableColumns.length > 0 && (
                    <span className="text-muted-foreground/50 mx-1">•</span>
                  )}
                  {contextVariableNames.map(varName => {
                    const isUsed = isContextVariableUsed(varName)
                    const contextKey = varName.replace('context.', '')
                    const hasValue = !!(context[contextKey as keyof typeof context] as string | undefined)
                    
                    return (
                      <button
                        key={varName}
                        type="button"
                        onClick={() => insertVariable(varName)}
                        disabled={previewMode}
                        className={cn(
                          "font-mono text-xs px-1.5 py-0.5 rounded transition-colors cursor-pointer",
                          "hover:opacity-80 active:scale-95",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                          isUsed && hasValue
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30' // Blue when used and has value
                            : isUsed && !hasValue
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' // Red when used but missing value
                            : hasValue
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20' // Light blue when has value but not used
                            : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted/70' // Gray when no value
                        )}
                        title={
                          isUsed && hasValue
                            ? 'Context variable used in prompt - Click to insert'
                            : isUsed && !hasValue
                            ? 'Context variable used but not set - Set it in Context tab'
                            : hasValue
                            ? 'Context variable available - Click to insert'
                            : 'Context variable not set - Set it in Context tab'
                        }
                        aria-label={
                          isUsed && hasValue
                            ? `Context variable ${varName} is used in prompt and has value. Click to insert into prompt`
                            : isUsed && !hasValue
                            ? `Context variable ${varName} is used in prompt but not set. Set it in Context tab or click to insert`
                            : hasValue
                            ? `Context variable ${varName} is available. Click to insert into prompt`
                            : `Context variable ${varName} is not set. Set it in Context tab or click to insert`
                        }
                      >
                        {`{{${varName}}}`}
                      </button>
                    )
                  })}
                </>
              )}
              
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
      </div>

      {/* Enhanced Error messages with actionable fixes */}
      {variableValidation && !variableValidation.isValid && variableValidation.missing.length > 0 && (
        <div 
          id={errorMessageId} 
          role="alert" 
          aria-live="polite" 
          className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md space-y-2"
        >
          <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-xs text-red-400 font-medium">
              Missing variables: {variableValidation.missing.map(v => `{{${v}}}`).join(', ')}
            </p>
            <div className="text-xs text-red-300/80 space-y-1.5">
              <p className="font-medium mb-1">How to fix:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Remove these variables from your prompt, or</li>
                <li>Add these columns to your CSV file, or</li>
                <li>Select these columns in the Input section</li>
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  let newPrompt = prompt
                  variableValidation.missing.forEach(v => {
                    // Remove all occurrences of the variable
                    const regex = new RegExp(`\\{\\{${v}\\}\\}`, 'g')
                    newPrompt = newPrompt.replace(regex, '')
                    // Clean up extra spaces
                    newPrompt = newPrompt.replace(/\s+/g, ' ').trim()
                  })
                  onPromptChange(newPrompt)
                }}
                className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-red-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
              >
                Remove {variableValidation.missing.length === 1 ? 'variable' : 'variables'} from prompt
              </button>
              <span className="text-xs text-red-300/60">or</span>
              <span className="text-xs text-red-300/80">
                Add {variableValidation.missing.length === 1 ? 'this column' : 'these columns'} to your CSV
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

