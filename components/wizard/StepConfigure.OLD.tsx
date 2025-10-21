/**
 * ABOUTME: Step 2 of wizard - Configure bulk processing with Quick or Custom mode
 * ABOUTME: Handles prompt template creation, column mapping, and token estimation
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Sparkles, ChevronRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface CSVData {
  headers: string[]
  rowCount: number
  preview: string[][]
}

interface ColumnMapping {
  [key: string]: string
}

interface ConfigurationData {
  mode: 'quick' | 'custom'
  promptTemplate: string
  columnMapping: ColumnMapping
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
  // Defensive validation: csvData must be provided
  if (!csvData) {
    throw new Error('CSV data is required for configuration step')
  }

  // Defensive validation: CSV must have headers
  if (!csvData.headers || csvData.headers.length === 0) {
    throw new Error('CSV data must have at least one header column')
  }

  const [mode, setMode] = useState<'quick' | 'custom'>('quick')
  const [promptTemplate, setPromptTemplate] = useState('')
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [customPromptTemplate, setCustomPromptTemplate] = useState('')

  // Generate column mapping from CSV headers
  const generateColumnMapping = useCallback(() => {
    const mapping: ColumnMapping = {}
    csvData.headers.forEach((header) => {
      mapping[header] = header
    })
    return mapping
  }, [csvData.headers])

  // Mock auto-column generation API call
  const handleGenerateColumns = useCallback(async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mapping = generateColumnMapping()
      setColumnMapping(mapping)

      // Generate a sample prompt template
      const generatedTemplate = `Hello {{${csvData.headers[0]}}}, we noticed your interest in our product. Your company ({{${csvData.headers[2] || csvData.headers[1]}}}) could benefit from our solution.`

      setPromptTemplate(generatedTemplate)
      setGenerationComplete(true)
    } catch (err) {
      setError('Failed to generate columns. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [csvData.headers, generateColumnMapping])

  // Validate prompt template
  const validatePromptTemplate = useCallback(
    (template: string): string | null => {
      // Empty template validation
      if (!template.trim()) {
        return 'Prompt template is required and cannot be empty'
      }

      // Max length validation (4000 characters)
      const MAX_TEMPLATE_LENGTH = 4000
      if (template.length > MAX_TEMPLATE_LENGTH) {
        return `Prompt template is too long. Maximum ${MAX_TEMPLATE_LENGTH} characters allowed`
      }

      // Check for invalid single-brace syntax
      // Remove all valid {{...}} patterns, then check if any braces remain
      const withoutValidVars = template.replace(/\{\{[^}]+\}\}/g, '')
      if (withoutValidVars.includes('{') || withoutValidVars.includes('}')) {
        return 'Invalid variable syntax. Use {{variable}} format.'
      }

      // Extract variables from template
      const variableMatches = template.match(/\{\{([^}]+)\}\}/g)

      // Check that template has at least one variable
      if (!variableMatches || variableMatches.length === 0) {
        return 'Prompt template must contain at least one variable placeholder (e.g., {{name}})'
      }

      if (variableMatches) {
        const variables = variableMatches.map((v) =>
          v.replace(/\{\{|\}\}/g, '').trim()
        )

        // Check for undefined variables
        const undefinedVars = variables.filter(
          (v) => !csvData.headers.includes(v)
        )
        if (undefinedVars.length > 0) {
          return `Variable "{{${undefinedVars[0]}}}" is not found in CSV headers. Available columns: ${csvData.headers.join(', ')}`
        }
      }

      return null
    },
    [csvData.headers]
  )

  // Current validation error (only validate if template has content)
  const validationError = useMemo(() => {
    const template = mode === 'quick' ? promptTemplate : customPromptTemplate

    // Don't show validation errors for empty templates until user tries to proceed
    // The handleNext function will catch this
    if (!template.trim()) {
      return null
    }

    return validatePromptTemplate(template)
  }, [mode, promptTemplate, customPromptTemplate, validatePromptTemplate])

  // Check if configuration is complete (used in form validation)
  // Keeping this for future form validation enhancements
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isConfigComplete = useMemo(() => {
    if (mode === 'quick') {
      return generationComplete && promptTemplate.trim() !== '' && !validationError
    } else {
      return customPromptTemplate.trim() !== '' && !validationError
    }
  }, [mode, generationComplete, promptTemplate, customPromptTemplate, validationError])

  // Replace variables in template with sample data
  const generatePreview = useCallback(
    (template: string, rowIndex: number): string => {
      let preview = template
      csvData.headers.forEach((header, colIndex) => {
        const value = csvData.preview[rowIndex]?.[colIndex] || ''
        preview = preview.replace(
          new RegExp(`\\{\\{${header}\\}\\}`, 'g'),
          value
        )
      })
      return preview
    },
    [csvData]
  )

  // Preview samples (first 2 rows)
  const previewSamples = useMemo(() => {
    const template = mode === 'quick' ? promptTemplate : customPromptTemplate
    if (!template.trim()) return []

    return [0, 1]
      .filter((i) => i < csvData.preview.length)
      .map((i) => generatePreview(template, i))
  }, [mode, promptTemplate, customPromptTemplate, csvData, generatePreview])

  // Estimate tokens (rough approximation: ~4 chars per token)
  const estimateTokens = useCallback((text: string): number => {
    return Math.ceil(text.length / 4)
  }, [])

  const tokensPerRow = useMemo(() => {
    const template = mode === 'quick' ? promptTemplate : customPromptTemplate
    if (!template.trim()) return 0

    const samplePreview = generatePreview(template, 0)
    return estimateTokens(samplePreview)
  }, [mode, promptTemplate, customPromptTemplate, generatePreview, estimateTokens])

  const totalTokens = useMemo(() => {
    return tokensPerRow * csvData.rowCount
  }, [tokensPerRow, csvData.rowCount])

  // Handle mode change
  const handleModeChange = useCallback((newMode: string) => {
    setMode(newMode as 'quick' | 'custom')
    setStatusMessage(`${newMode === 'quick' ? 'Quick' : 'Custom'} mode selected`)

    // Initialize custom mode with empty template
    if (newMode === 'custom' && !customPromptTemplate) {
      setCustomPromptTemplate('')
      setColumnMapping(generateColumnMapping())
    }

    setTimeout(() => setStatusMessage(null), 2000)
  }, [customPromptTemplate, generateColumnMapping])

  // Add variable to custom prompt
  const handleAddVariable = useCallback((header: string) => {
    setCustomPromptTemplate((prev) => prev + `{{${header}}}`)
  }, [])

  // Handle next
  const handleNext = useCallback(() => {
    const finalTemplate = mode === 'quick' ? promptTemplate : customPromptTemplate

    // Validate before proceeding
    const validation = validatePromptTemplate(finalTemplate)
    if (validation) {
      setError(validation)
      return
    }

    const finalMapping = columnMapping

    onNext({
      mode,
      promptTemplate: finalTemplate,
      columnMapping: finalMapping,
    })
  }, [mode, promptTemplate, customPromptTemplate, columnMapping, onNext, validatePromptTemplate])

  // Initialize custom mode column mapping
  useEffect(() => {
    if (mode === 'custom' && Object.keys(columnMapping).length === 0) {
      setColumnMapping(generateColumnMapping())
    }
  }, [mode, columnMapping, generateColumnMapping])

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Processing Mode</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {csvData.headers.length} {csvData.headers.length === 1 ? 'column' : 'columns'} detected
              </p>
            </div>
          </div>

          <div className="inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleModeChange('quick')}
              aria-pressed={mode === 'quick'}
              className={cn(
                'h-8 rounded-md px-3',
                mode === 'quick' && 'bg-background text-foreground shadow-sm'
              )}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Quick
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleModeChange('custom')}
              aria-pressed={mode === 'custom'}
              className={cn(
                'h-8 rounded-md px-3',
                mode === 'custom' && 'bg-background text-foreground shadow-sm'
              )}
            >
              Custom
            </Button>
          </div>
        </div>
      </Card>

      {/* Status Message */}
      {statusMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-blue-500 bg-blue-500/10 p-4 text-sm text-blue-700 dark:text-blue-400"
        >
          {statusMessage}
        </div>
      )}

      {/* Error Message */}
      {(error || validationError) && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4" />
          {error || validationError}
        </div>
      )}

      {/* Quick Mode */}
      {mode === 'quick' && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">AI-Powered Column Generation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                AI will automatically generate a prompt template based on your CSV columns
              </p>
            </div>

            {!generationComplete && (
              <Button
                onClick={handleGenerateColumns}
                disabled={isGenerating}
                size="lg"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate Columns'}
              </Button>
            )}

            {generationComplete && (
              <div className="space-y-4">
                {/* Column Mapping */}
                <div>
                  <Label className="text-sm font-semibold">Column Mapping</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {csvData.headers.map((header) => (
                      <div
                        key={header}
                        className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm"
                      >
                        <span>{`{{${header}}}`}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prompt Template */}
                <div>
                  <Label htmlFor="prompt-template">Prompt Template</Label>
                  <textarea
                    id="prompt-template"
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                    value={promptTemplate}
                    onChange={(e) => setPromptTemplate(e.target.value)}
                    aria-label="Prompt template"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Custom Mode */}
      {mode === 'custom' && (
        <Card className="p-6">
          <div className="space-y-4">
            {/* Column Mapping */}
            <div>
              <Label className="text-sm font-semibold">Column Mapping</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Click to add variables to your prompt
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {csvData.headers.map((header) => (
                  <Button
                    key={header}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddVariable(header)}
                    aria-label={`Add ${header}`}
                  >
                    {header}
                  </Button>
                ))}
              </div>
            </div>

            {/* Prompt Template Editor */}
            <div>
              <Label htmlFor="custom-prompt-template">Prompt Template</Label>
              <textarea
                id="custom-prompt-template"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                value={customPromptTemplate}
                onChange={(e) => setCustomPromptTemplate(e.target.value)}
                placeholder="Enter your prompt template with {{variables}}"
                aria-label="Prompt template"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Preview */}
      {((mode === 'quick' && generationComplete) ||
        (mode === 'custom' && customPromptTemplate.trim())) && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Preview</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Sample prompts with your data
              </p>
            </div>

            <div className="space-y-3">
              {previewSamples.map((sample, index) => (
                <div
                  key={index}
                  className="rounded-md border border-muted bg-muted/30 p-3 text-sm"
                >
                  {sample}
                </div>
              ))}
            </div>

            {/* Token Estimation */}
            <div className="flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-muted-foreground">
                ~{tokensPerRow} {tokensPerRow === 1 ? 'token' : 'tokens'} per row
              </span>
              <span className="font-semibold">
                Total: ~{totalTokens.toLocaleString()} {totalTokens === 1 ? 'token' : 'tokens'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} size="lg">
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
