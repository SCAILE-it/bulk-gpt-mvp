/**
 * ABOUTME: Step 2 of wizard - Configure prompt with Test/Full mode and collapsible advanced options
 * ABOUTME: Simplified UX matching the planned architecture
 */

'use client'

import React, { useState, useCallback, useRef, useMemo } from 'react'
import { ChevronDown, ChevronUp, X, Plus, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import Hint from '@/components/ui/hint'
import { cn } from '@/lib/utils'
import { validatePrompt, type ValidationResult } from '@/lib/prompt-validation'
import { estimateProcessing } from '@/lib/processing-estimates'

interface CSVData {
  file: File
  headers: string[]
  rowCount: number
  preview: string[][]
}

interface ConfigurationData {
  promptTemplate: string
  processingMode: 'test' | 'full'
  context?: string
  outputColumns?: string[]
}

export interface StepConfigureProps {
  csvData: CSVData
  onNext: (data: ConfigurationData) => void
  onBack: () => void
}

export default function StepConfigure({
  csvData,
  onNext,
  onBack,
}: StepConfigureProps) {
  const [promptTemplate, setPromptTemplate] = useState('')
  const [processingMode, setProcessingMode] = useState<'test' | 'full'>('test')
  const [showAdvanced, setShowAdvanced] = useState(true) // Power-user: visible by default
  const [context, setContext] = useState('')
  const [outputColumns, setOutputColumns] = useState<string[]>([])
  const [newColumnInput, setNewColumnInput] = useState('')
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: false,
    error: null,
    missingVariables: [],
    foundVariables: [],
  })

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Real-time validation as user types
  const handlePromptChange = useCallback((value: string) => {
    setPromptTemplate(value)
    
    // Only validate if user has started typing
    if (value.trim()) {
      const result = validatePrompt(value, csvData.headers)
      setValidation(result)
    } else {
      // Reset validation for empty input
      setValidation({
        isValid: false,
        error: null,
        missingVariables: [],
        foundVariables: [],
      })
    }
  }, [csvData.headers])

  // Insert column variable at cursor position
  const handleInsertColumn = useCallback((column: string) => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const before = text.substring(0, start)
    const after = text.substring(end)
    const newText = `${before}{{${column}}}${after}`

    handlePromptChange(newText) // Use handlePromptChange to trigger validation

    // Restore cursor position after inserted text
    setTimeout(() => {
      const newCursorPos = start + column.length + 4 // {{}} = 4 chars
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [handlePromptChange])

  // Add output column
  const handleAddOutputColumn = useCallback(() => {
    const trimmed = newColumnInput.trim()
    if (trimmed && !outputColumns.includes(trimmed)) {
      setOutputColumns([...outputColumns, trimmed])
      setNewColumnInput('')
    }
  }, [newColumnInput, outputColumns])

  // Remove output column
  const handleRemoveOutputColumn = useCallback((column: string) => {
    setOutputColumns(outputColumns.filter(c => c !== column))
  }, [outputColumns])

  // Validate and proceed
  const handleNext = useCallback(() => {
    // Run validation if not already done
    const result = promptTemplate.trim()
      ? validatePrompt(promptTemplate, csvData.headers)
      : validation

    // Block if invalid
    if (!result.isValid) {
      setValidation(result)
      return
    }

    onNext({
      promptTemplate,
      processingMode,
      context: context.trim() || undefined,
      outputColumns: outputColumns.length > 0 ? outputColumns : undefined,
    })
  }, [promptTemplate, processingMode, context, outputColumns, csvData.headers, validation, onNext])

  const TEST_SIZE = 5
  const testRowCount = Math.min(TEST_SIZE, csvData.rowCount)

  // Calculate estimates for both modes
  const testEstimate = useMemo(() => estimateProcessing(testRowCount), [testRowCount])
  const fullEstimate = useMemo(() => estimateProcessing(csvData.rowCount), [csvData.rowCount])

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-8">
      {/* CSV Info Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{csvData.file.name}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {csvData.rowCount.toLocaleString()} rows
          </p>
        </div>
      </div>

      {/* Helpful Tip */}
      <Hint
        variant="tip"
        title="Use variables in your prompt"
        description={`Reference CSV columns with {{column_name}}. Click any column below to insert it. Available columns: ${csvData.headers.join(', ')}`}
      />

      {/* Main Prompt Editor */}
      <div className="space-y-4">
        <Label htmlFor="prompt" className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-mono">
          Write your prompt:
        </Label>
        <textarea
          ref={textareaRef}
          id="prompt"
          placeholder="Enter your prompt template here..."
          value={promptTemplate}
          onChange={(e) => handlePromptChange(e.target.value)}
          className={cn(
            "w-full min-h-[150px] rounded-md border bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y transition-colors font-mono",
            validation.error
              ? "border-destructive focus-visible:ring-destructive"
              : "border-input focus-visible:ring-ring"
          )}
          aria-invalid={!!validation.error}
          aria-describedby={validation.error ? "prompt-error" : undefined}
        />

        {/* Inline Error with Icon */}
        {validation.error && (
          <div
            id="prompt-error"
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{validation.error}</p>
              {validation.missingVariables.length > 0 && csvData.headers.length > 0 && (
                <p className="mt-1 text-xs text-destructive/80">
                  Available columns: {csvData.headers.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Column Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Columns:</span>
          {csvData.headers.map((header) => (
            <Button
              key={header}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleInsertColumn(header)}
              className="h-7 text-xs"
            >
              {header}
            </Button>
          ))}
        </div>
      </div>

      {/* Separator */}
      <hr className="border-t" />

      {/* Processing Mode */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold text-gray-900 dark:text-gray-100">Processing mode:</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Test Mode Card */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg border',
              processingMode === 'test'
                ? 'border-primary bg-primary/10 shadow-md'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => setProcessingMode('test')}
          >
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base">Test Mode</h3>
                {processingMode === 'test' && (
                  <div className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Check className="h-3 w-3" />
                    Selected
                  </div>
                )}
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">{testRowCount}</p>
                <p className="text-sm text-muted-foreground">rows</p>
              </div>
              <div className="pt-2 border-t space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{testEstimate.timeFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">{testEstimate.costFormatted}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Full Mode Card */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg border',
              processingMode === 'full'
                ? 'border-primary bg-primary/10 shadow-md'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => setProcessingMode('full')}
          >
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base">Full Processing</h3>
                {processingMode === 'full' && (
                  <div className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Check className="h-3 w-3" />
                    Selected
                  </div>
                )}
              </div>
              <div>
                <p className="text-3xl font-bold">{csvData.rowCount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">rows</p>
              </div>
              <div className="pt-2 border-t space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{fullEstimate.timeFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">{fullEstimate.costFormatted}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Advanced Options - Collapsible */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <span>Advanced Options (click to expand)</span>
        </button>

        {showAdvanced && (
          <Card className="p-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Context */}
            <div className="space-y-2">
              <Label htmlFor="context" className="text-sm font-semibold">
                Context (optional):
              </Label>
              <textarea
                id="context"
                placeholder="Add optional context to guide the AI..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              />
            </div>

            {/* Output Columns */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Output Columns (optional):
              </Label>
              <p className="text-xs text-muted-foreground">
                Define specific fields for AI to generate. If empty, AI will auto-generate appropriate columns.
              </p>

              {/* Add Column Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., summary, sentiment"
                  value={newColumnInput}
                  onChange={(e) => setNewColumnInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddOutputColumn()
                    }
                  }}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddOutputColumn}
                  disabled={!newColumnInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Column Pills */}
              {outputColumns.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {outputColumns.map((col) => (
                    <div
                      key={col}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-md bg-primary text-primary-foreground"
                    >
                      <span>{col}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOutputColumn(col)}
                        className="hover:bg-primary-foreground/20 rounded-sm transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack} size="lg">
          ← Back
        </Button>
        <Button onClick={handleNext} size="lg">
          Start Processing <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-background/20 rounded">⌘↵</kbd>
        </Button>
      </div>
    </div>
  )
}
