/**
 * ABOUTME: Single-page bulk processor - power-user optimized interface
 * ABOUTME: Full-width layout, keyboard shortcuts, inline results, no wizard steps
 */

'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  Upload, FileText, Play, CheckCircle, XCircle,
  Loader2, X, ChevronDown, HelpCircle,
  Code, Search, Filter, AlertTriangle
} from 'lucide-react'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useCSVParser } from '@/hooks/useCSVParser'
import { useBatchProcessor } from '@/hooks/useBatchProcessor'
import { useManualJobOptimizer } from '@/hooks/useManualJobOptimizer'
import { useVariableValidation } from '@/hooks/useVariableValidation'
import { useBetaBanner } from '@/hooks/useBetaBanner'
import { useTemplateFilter } from '@/hooks/useTemplateFilter'
import { useCollapsibleState } from '@/hooks/useCollapsibleState'
import { PromptSection } from './PromptSection'
import { JobPreview } from './JobPreview'
import { CSVPreviewTable } from './CSVPreviewTable'
import { ResultsTable } from './ResultsTable'
import { FileUploadSection } from './FileUploadSection'
import { OutputFieldsSection } from './OutputFieldsSection'
import { ToolSelectionSection } from './ToolSelectionSection'
import { AIAssistantSection } from './AIAssistantSection'
import { Modal } from '@/components/ui/modal'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logError } from '@/lib/errors'
import { useDebugLogger } from '@/lib/hooks/useDebugLogger'
import { DebugLogger } from '@/components/debug/DebugLogger'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { TEMPLATE_CATEGORIES, type PromptTemplate } from '@/lib/constants/promptTemplates'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface Result {
  id: string
  input: Record<string, string>
  output: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
}

export default function BulkProcessor() {
  // === FILE STATE ===
  const fileUpload = useFileUpload()
  const csvParser = useCSVParser()
  const batchProcessor = useBatchProcessor()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // === DEBUG LOGGING ===
  const debugLog = useDebugLogger()

  // === CONFIG STATE ===
  const [prompt, setPrompt] = useState('Write a bio for {{name}} at {{company}}')
  const [outputFields, setOutputFields] = useState<string[]>(['bio'])
  const [newField, setNewField] = useState('')
  const [showAdvancedSettingsModal, setShowAdvancedSettingsModal] = useState(false)
  const [useJsonMode, setUseJsonMode] = useState(true) // JSON schema toggle
  const [selectedTools, setSelectedTools] = useState<string[]>([]) // GTM tools to enable

  // === BETA BANNER ===
  const { showBanner: showBetaBanner, usage, dismissBanner: dismissBetaBanner } = useBetaBanner()

  // === TEMPLATE GALLERY ===
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateSearchQuery, setTemplateSearchQuery] = useState('')
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<'all' | 'content' | 'data' | 'analysis'>('all')

  // === KEYBOARD SHORTCUTS HELP ===
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // === DELETE CONFIRMATION ===
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null)

  // === COLLAPSIBLE SECTIONS STATE ===
  // Sections start collapsed, but auto-expand based on active state
  const dataInputSection = useCollapsibleState({
    storageKey: 'bulk-processor-data-input',
    defaultOpen: false
  })
  const promptSection = useCollapsibleState({
    storageKey: 'bulk-processor-prompt',
    defaultOpen: false
  })
  const outputSettingsSection = useCollapsibleState({
    storageKey: 'bulk-processor-output-settings',
    defaultOpen: false
  })
  const aiAssistantSection = useCollapsibleState({
    storageKey: 'bulk-processor-ai-assistant',
    defaultOpen: true // Always expanded when visible
  })

  // Auto-expand sections sequentially (one by one) based on user flow
  // Track previous states to only expand on transitions (not continuously)
  const prevHasCSV = useRef(false)
  const prevHasPrompt = useRef(false)

  useEffect(() => {
    // Step 1: Expand Data Input when CSV is first uploaded (one by one)
    const hasCSV = !!csvParser.csvData
    const wasCSV = prevHasCSV.current
    
    // Only expand on transition from no CSV to CSV
    if (hasCSV && !wasCSV) {
      // Expand Data Input section
      if (!dataInputSection.isOpen) {
        dataInputSection.setIsOpen(true)
      }
      // Don't force-close other sections - let user control them
    }
    
    prevHasCSV.current = hasCSV
  }, [csvParser.csvData, dataInputSection])

  useEffect(() => {
    // Step 2: Expand Prompt section when prompt is first filled (only after CSV exists)
    const hasPrompt = !!(prompt && prompt.trim())
    const hasCSV = !!csvParser.csvData
    const wasPrompt = prevHasPrompt.current
    
    // Only expand on transition from no prompt to prompt (and CSV must exist)
    if (hasPrompt && hasCSV && !wasPrompt) {
      // Expand Prompt section
      if (!promptSection.isOpen) {
        promptSection.setIsOpen(true)
      }
      // Don't force-close Output Settings - let user control
    }
    
    prevHasPrompt.current = hasPrompt
  }, [prompt, csvParser.csvData, promptSection])

  // === ONBOARDING STATE ===
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Check if user needs onboarding on mount
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('bulk-gpt-onboarding-seen')
    const defaultPrompt = 'Write a bio for {{name}} at {{company}}'
    const isDefaultPrompt = prompt === defaultPrompt || !prompt.trim()
    
    if (!hasSeenOnboarding && !csvParser.csvData && isDefaultPrompt) {
      // Show onboarding for new users (no CSV uploaded and prompt is default/empty)
      setShowOnboarding(true)
    }
  }, [csvParser.csvData, prompt])

  // === PROCESSING STATE ===
  const [isTesting, setIsTesting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Result[]>([])

  // Memoize CSV columns to prevent infinite render loop (array created on every render)
  const csvColumns = useMemo(() => {
    return csvParser.csvData?.columns || []
  }, [csvParser.csvData?.columns])

  // Display results: show test results if available, otherwise batch results
  const displayResults = useMemo(() => {
    return testResults.length > 0 ? testResults : batchProcessor.results
  }, [testResults, batchProcessor.results])

  // Manual AI optimization (user triggers with button)
  const {
    optimizedPrompt,
    setOptimizedPrompt,
    outputColumns,
    suggestedTools,
    reasoning,
    isOptimizing,
    triggerOptimization,
    clearOptimization,
  } = useManualJobOptimizer(prompt, csvColumns)

  // Handle accepting AI suggestion
  const handleAcceptOptimization = useCallback(() => {
    if (optimizedPrompt) {
      setPrompt(optimizedPrompt)
      // Use AI-detected output columns
      if (outputColumns.length > 0) {
        setOutputFields(outputColumns.map((col) => col.name))
      }
      // Apply AI-suggested tools
      if (suggestedTools.length > 0) {
        setSelectedTools(suggestedTools)
      }
      clearOptimization()
      toast.success('AI suggestion applied!')
    }
  }, [optimizedPrompt, outputColumns, suggestedTools, clearOptimization])

  // Handle rejecting AI suggestion
  const handleRejectOptimization = useCallback(() => {
    clearOptimization()
  }, [clearOptimization])

  // Recent files feature removed - users can re-upload files if needed

  // === VARIABLE VALIDATION ===
  const variableValidation = useVariableValidation(prompt, csvParser.csvData)

  // === FILTERED TEMPLATES ===
  const filteredTemplates = useTemplateFilter(templateSearchQuery, templateCategoryFilter)

  // === FILE UPLOAD ===
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    // IMMEDIATE feedback (within 100ms)
    setIsUploading(true)
    setError(null)

    // Validate file (applies to both V1 and V2)
    if (!uploadedFile.name.endsWith('.csv')) {
      setIsUploading(false)
      setError(`File type not supported. Please upload a CSV file (found: ${uploadedFile.name.split('.').pop()}). Export your spreadsheet as CSV from Excel or Google Sheets.`)
      return
    }
    if (uploadedFile.size > MAX_FILE_SIZE) {
      setIsUploading(false)
      setError(`File is too large (${(uploadedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB. Try reducing the number of rows or removing unnecessary columns.`)
      return
    }
    if (uploadedFile.size === 0) {
      setIsUploading(false)
      setError(`File "${uploadedFile.name}" is empty (0 bytes). Please check your file and try again.`)
      return
    }

    // Upload and parse CSV using hooks
    try {
      // Upload file (validates and tracks)
      await fileUpload.uploadFile(uploadedFile)

      // Parse CSV immediately (don't check state - it hasn't updated yet!)
      const parsed = await csvParser.parseFile(uploadedFile)

      // Add to recent if parse succeeded
      if (parsed) {
        fileUpload.addToRecent(uploadedFile, parsed.totalRows)
      }
    } catch (err) {
      // Errors are already handled by the hooks
      // Just log for debugging
      console.error('Upload/parse error:', err)
    } finally {
      setIsUploading(false)
    }
  }, [csvParser, fileUpload])

  // === KEYBOARD SHORTCUTS ===
  useHotkeys('mod+o', (e) => {
    e.preventDefault()
    fileInputRef.current?.click()
  })

  useHotkeys('mod+t', (e) => {
    e.preventDefault()
    if (csvParser.csvData && prompt) handleTest()
  })

  useHotkeys('mod+enter', (e) => {
    e.preventDefault()
    if (csvParser.csvData && prompt) handleProcess()
  })

  // === OUTPUT FIELDS ===
  const addOutputField = useCallback(() => {
    if (newField.trim() && !outputFields.includes(newField.trim())) {
      setOutputFields([...outputFields, newField.trim()])
      setNewField('')
    }
  }, [newField, outputFields])

  const removeOutputField = useCallback((field: string) => {
    setFieldToDelete(field)
  }, [])

  const confirmDeleteOutputField = useCallback(() => {
    if (fieldToDelete) {
      setOutputFields(outputFields.filter(f => f !== fieldToDelete))
      setFieldToDelete(null)
    }
  }, [fieldToDelete, outputFields])

  // === TOOL SELECTION ===
  const toggleTool = useCallback((toolName: string) => {
    setSelectedTools(prev =>
      prev.includes(toolName)
        ? prev.filter(t => t !== toolName)
        : [...prev, toolName]
    )
  }, [])

  // === TEST (1 ROW) - Now polls for async results ===
  const handleTest = useCallback(async () => {
    if (!csvParser.csvData || !prompt) return

    // Variable validation check
    if (!variableValidation.isValid) {
      setError(`Cannot test: Missing variables in CSV: ${variableValidation.missing.join(', ')}`)
      return
    }

    setIsTesting(true)
    setError(null)

    try {
      // Log test mode API call
      debugLog.info('Starting test mode - sending single row to /api/process', {
        filename: csvParser.csvData.filename,
        rowCount: 1,
        promptLength: prompt.length,
        outputFieldsCount: outputFields.length
      })

      // Step 1: Create batch (async) - testMode bypasses batch limit
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvFilename: csvParser.csvData.filename,
          rows: [csvParser.csvData.rows[0].data], // Only first row
          prompt,
          context: '',
          outputColumns: useJsonMode ? outputFields : [], // Empty array = free-form text
          tools: selectedTools.length > 0 ? selectedTools : undefined,
          testMode: true, // Enable test mode to bypass batch limit
        }),
      })

      debugLog.info('Test mode API response received', {
        status: response.status,
        ok: response.ok
      })

      if (!response.ok) {
        const errorData = await response.json()
        debugLog.error('Test mode API call failed', { status: response.status, error: errorData })
        
        // Enhanced error message for limit issues
        if (response.status === 429 && errorData.error) {
          throw new Error(errorData.error)
        }
        throw new Error(errorData.error || 'Test failed')
      }

      const data = await response.json()

      // API returns 202 with batchId, status: 'pending'
      if (!data.batchId) {
        throw new Error('No batch ID returned from API')
      }

      const testBatchId = data.batchId

      // Step 2: Poll for completion (max 30 seconds)
      const maxAttempts = 15 // 15 attempts * 2 seconds = 30 seconds
      const pollInterval = 2000 // 2 seconds

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval))

        const statusResponse = await fetch(`/api/batch/${testBatchId}/status`)
        if (!statusResponse.ok) continue

        const statusData = await statusResponse.json()

        // Check if completed
        if (statusData.status === 'completed') {
          // Fetch the result
          const supabase = createClient()
          if (!supabase) {
            throw new Error('Database client not configured')
          }

          const { data: results, error: fetchError } = await supabase
            .from('batch_results')
            .select('input_data, output_data, status, error_message')
            .eq('batch_id', testBatchId)
            .order('id', { ascending: true })
            .limit(1)

          if (fetchError || !results || results.length === 0) {
            throw new Error('Failed to fetch test result from database')
          }

          const firstResult = results[0]
          const inputData = typeof firstResult.input_data === 'string'
            ? JSON.parse(firstResult.input_data)
            : firstResult.input_data

          let outputValue: string
          if (firstResult.output_data) {
            outputValue = typeof firstResult.output_data === 'string'
              ? firstResult.output_data
              : JSON.stringify(firstResult.output_data, null, 2)
          } else {
            outputValue = ''
          }

          // Show test result
          const testResult: Result = {
            id: 'test-result',
            input: inputData,
            output: outputValue,
            status: firstResult.status === 'success' ? 'completed' : 'failed',
            error: firstResult.error_message || undefined
          }
          setTestResults([testResult])
          setIsTesting(false)
          return
        } else if (statusData.status === 'failed') {
          throw new Error('Test batch failed during processing')
        }
      }

      // Timeout
      throw new Error('Test timed out after 30 seconds. The API may be slow or overloaded. Try again in a moment.')

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Test failed: ${message}`)
    } finally {
      setIsTesting(false)
    }
  }, [csvParser.csvData, prompt, outputFields, variableValidation, debugLog, useJsonMode, selectedTools])

  // === PROCESS ALL ===
  const handleProcess = useCallback(async () => {
    if (!csvParser.csvData || !prompt) return

    // Variable validation check
    if (!variableValidation.isValid) {
      setError(`Cannot process: Missing variables in CSV: ${variableValidation.missing.join(', ')}`)
      return
    }

    // Clear test results when starting full batch
    setTestResults([])

    // Start batch processing using hook
    await batchProcessor.startBatch({
      csvData: csvParser.csvData,
      prompt,
      context: '',
      outputColumns: useJsonMode ? outputFields : [], // Empty array = free-form text
      tools: selectedTools.length > 0 ? selectedTools : undefined,
    })
  }, [csvParser.csvData, prompt, outputFields, batchProcessor, variableValidation, useJsonMode, selectedTools])

  // === EXPORT ===
  const handleExport = useCallback(async () => {
    if (!batchProcessor.batchId) {
      toast.error('No Batch Available', {
        description: 'Please run a batch first before exporting results.'
      })
      return
    }

    try {
      const supabase = createClient()
      if (!supabase) {
        toast.error('Database Error', {
          description: 'Supabase client not configured. Please refresh the page.'
        })
        return
      }

      toast.loading('Preparing download...', { id: `export-${batchProcessor.batchId}` })

      // Fetch completed results from database
      const { data: results, error } = await supabase
        .from('batch_results')
        .select('input_data, output_data, status, error_message, input_tokens, output_tokens')
        .eq('batch_id', batchProcessor.batchId)
        .order('id', { ascending: true })

      if (error) {
        logError(new Error('Batch results fetch failed'), {
          source: 'BulkProcessor/handleExport',
          batchId: batchProcessor.batchId,
          supabaseError: error
        })
        toast.error('Failed to Fetch Results', {
          description: 'Please try again or check the Dashboard for completed batches.',
          id: `export-${batchProcessor.batchId}`
        })
        return
      }

      if (!results || results.length === 0) {
        toast.warning('No Results Available', {
          description: 'The batch may still be processing. Please wait a few moments and try again.',
          id: `export-${batchProcessor.batchId}`
        })
        return
      }

      // Transform results for export API
      const exportData = results.map(row => {
        const input = typeof row.input_data === 'string'
          ? JSON.parse(row.input_data)
          : row.input_data

        return {
          input_data: input,
          output_data: row.output_data,
          status: row.status,
          error_message: row.error_message,
          input_tokens: row.input_tokens || 0,
          output_tokens: row.output_tokens || 0
        }
      })

      // Call server-side export API
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: exportData,
          format: 'csv',
          batchId: batchProcessor.batchId,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(errorData.error || `Export failed with status ${response.status}`)
      }

      // Get filename from Content-Disposition header
      const disposition = response.headers.get('content-disposition') || ''
      const filenameMatch = disposition.match(/filename="([^"]+)"/)
      const filename = filenameMatch?.[1] || `results-${batchProcessor.batchId}.csv`

      // Trigger browser download
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Download Complete', {
        description: `Successfully downloaded ${results.length} result rows.`,
        id: `export-${batchProcessor.batchId}`
      })
    } catch (err) {
      logError(err instanceof Error ? err : new Error('Export failed'), {
        source: 'BulkProcessor/handleExport',
        batchId: batchProcessor.batchId
      })
      toast.error('Export Failed', {
        description: 'An unexpected error occurred. Please try again.',
        id: `export-${batchProcessor.batchId}`
      })
    }
  }, [batchProcessor.batchId])

  const applyTemplate = useCallback((template: PromptTemplate) => {
    setPrompt(template.prompt)
    setShowTemplateModal(false)

    // Track template usage
    trackEvent(ANALYTICS_EVENTS.BULK_TEMPLATE_USED, {
      templateId: template.id,
      templateName: template.name,
      category: template.category
    })
  }, [])

  // === KEYBOARD NAVIGATION: ESC TO CLOSE MODALS ===
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Close modals in priority order (innermost first)
        if (fieldToDelete) {
          setFieldToDelete(null)
        } else if (showKeyboardHelp) {
          setShowKeyboardHelp(false)
        } else if (showAdvancedSettingsModal) {
          setShowAdvancedSettingsModal(false)
        } else if (showTemplateModal) {
          setShowTemplateModal(false)
        }
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleEscapeKey)

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [fieldToDelete, showKeyboardHelp, showAdvancedSettingsModal, showTemplateModal])

  // === RENDER ===
  return (
    <div className="h-full bg-background text-foreground flex flex-col">
      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlow
          onDismiss={() => setShowOnboarding(false)}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      {/* Beta Banner - Minimal */}
      {showBetaBanner && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 sm:px-6 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded flex-shrink-0">BETA</span>
              {usage && (
                <p className="text-xs text-primary/80 truncate">
                  {usage.batchesToday}/{usage.dailyBatchLimit} batches today
                </p>
              )}
            </div>
            <button
              className="text-primary hover:text-primary/80 flex-shrink-0"
              onClick={dismissBetaBanner}
              aria-label="Dismiss beta banner"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Header - Minimal, clean */}
      <header className="flex-shrink-0 sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-3">
          <h1 className="text-sm font-medium tracking-tight">Bulk Processor</h1>
          <div className="flex items-center gap-3">
            {csvParser.csvData && (
              <div className="text-xs text-muted-foreground">
                {csvParser.csvData.totalRows} rows
              </div>
            )}
            <button
              onClick={() => setShowKeyboardHelp(true)}
              className="flex items-center justify-center w-7 h-7 rounded-md bg-secondary hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors"
              aria-label="View keyboard shortcuts"
              title="Keyboard shortcuts"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 h-screen overflow-hidden">
        {/* LEFT PANEL - Configuration */}
        <div className="h-full border-r border-border bg-secondary flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-12rem)]">
            {/* Error - Use V2 error if available */}
            {(fileUpload.error || csvParser.error || batchProcessor.error || error) && (
              <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-red-400">
                      {fileUpload.error || csvParser.error || batchProcessor.error || error}
                    </p>
                    {/* Enhanced limit error display */}
                    {(error?.includes('limit reached') || error?.includes('limit resets') || batchProcessor.error?.includes('limit')) && (
                      <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                        <p>Wait for the limit to reset or review previous batches in Dashboard.</p>
                      </div>
                    )}
                  </div>
                </div>
                {(error?.includes('wait for your current batch') || error?.includes('batch to complete')) && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/batch/reset', { method: 'POST' })
                        if (response.ok) {
                          setError(null)
                        }
                      } catch {
                        // Silent failure - user can try again
                      }
                    }}
                    className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-red-300 transition-colors"
                  >
                    Reset Stuck Batch
                  </button>
                )}
              </div>
            )}

            {/* VALIDATION MESSAGES - Only show errors, hide success messages to reduce noise */}

            {!variableValidation.isValid && variableValidation.missing.length > 0 && (
              <div className="flex items-start gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-md">
                <XCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-400">
                  Missing variables: {variableValidation.missing.map(v => v.replace(/[{}]/g, '')).join(', ')}
                </p>
              </div>
            )}

            {/* Unused columns warning - Hidden to reduce noise */}

            {/* WORKFLOW STEPS - Hidden to reduce visual noise, onboarding handles guidance */}

            {/* DATA INPUT SECTION */}
            <CollapsibleSection
              title="Data Input"
              open={dataInputSection.isOpen}
              onOpenChange={dataInputSection.setIsOpen}
              className="bg-secondary/30 border border-border rounded-lg"
              triggerClassName="hover:bg-accent/50"
              contentClassName="px-0 pb-0"
            >
              <FileUploadSection
                ref={fileInputRef}
                csvData={csvParser.csvData}
                fileName={fileUpload.file?.name}
                errors={[fileUpload.error, csvParser.error, batchProcessor.error, error]}
                isUploading={isUploading}
                onFileUpload={handleFileUpload}
              />
            </CollapsibleSection>

            {/* PROMPT CONFIGURATION SECTION */}
            <CollapsibleSection
              title="Prompt Configuration"
              open={promptSection.isOpen}
              onOpenChange={promptSection.setIsOpen}
              className="bg-secondary/30 border border-border rounded-lg"
              triggerClassName="hover:bg-accent/50"
              contentClassName="px-0 pb-0"
            >
              <PromptSection
                prompt={prompt}
                onPromptChange={setPrompt}
                csvData={csvParser.csvData}
                onOpenTemplates={() => setShowTemplateModal(true)}
              />
            </CollapsibleSection>

            {/* OUTPUT SETTINGS SECTION - Grouped */}
            <CollapsibleSection
              title="Output Settings"
              open={outputSettingsSection.isOpen}
              onOpenChange={outputSettingsSection.setIsOpen}
              className="bg-secondary/30 border border-border rounded-lg"
              triggerClassName="hover:bg-accent/50"
              contentClassName="space-y-4"
            >
              {/* JSON MODE TOGGLE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <label className="text-xs font-medium text-muted-foreground">Output Format</label>
                  </div>
                  <button
                    onClick={() => setUseJsonMode(!useJsonMode)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      useJsonMode ? 'bg-primary' : 'bg-accent'
                    }`}
                    aria-label={useJsonMode ? 'Switch to free-form text mode' : 'Switch to JSON mode'}
                    title={useJsonMode ? 'JSON mode (structured output)' : 'Free-form mode (unstructured text)'}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        useJsonMode ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* OUTPUT COLUMNS - Disabled when JSON mode is OFF */}
              {useJsonMode && (
                <>
                  <OutputFieldsSection
                    outputFields={outputFields}
                    newField={newField}
                    onNewFieldChange={setNewField}
                    onAddField={addOutputField}
                    onRemoveField={removeOutputField}
                  />

                  {/* TOOL SELECTION - Hidden by default, shown in advanced settings */}
                  {selectedTools.length > 0 && (
                    <ToolSelectionSection
                      selectedTools={selectedTools}
                      onToggleTool={toggleTool}
                    />
                  )}
                </>
              )}

            </CollapsibleSection>

            {/* AI ASSISTANT SECTION - Separate collapsible section, only show when CSV and prompt are ready */}
            {csvParser.csvData && prompt && (
              <CollapsibleSection
                title="AI Optimization"
                open={aiAssistantSection.isOpen}
                onOpenChange={aiAssistantSection.setIsOpen}
                className="bg-secondary/30 border border-border rounded-lg"
                triggerClassName="hover:bg-accent/50"
                contentClassName="px-0 pb-0"
              >
                <AIAssistantSection
                  hasPrompt={!!prompt}
                  hasCSVData={!!csvParser.csvData}
                  isOptimizing={isOptimizing}
                  hasOptimizedPrompt={!!optimizedPrompt}
                  onOptimize={triggerOptimization}
                />
              </CollapsibleSection>
            )}

            {/* AI-OPTIMIZED JOB PREVIEW */}
            {optimizedPrompt && (
              <JobPreview
                optimizedPrompt={optimizedPrompt}
                setOptimizedPrompt={setOptimizedPrompt}
                outputColumns={outputColumns}
                reasoning={reasoning}
                isOptimizing={isOptimizing}
                onAccept={handleAcceptOptimization}
                onReject={handleRejectOptimization}
              />
            )}

            {/* Show loading state */}
            {isOptimizing && !optimizedPrompt && (
              <JobPreview
                optimizedPrompt={''}
                setOptimizedPrompt={() => {}}
                outputColumns={[]}
                reasoning={null}
                isOptimizing={true}
                onAccept={() => {}}
                onReject={() => {}}
              />
            )}
          </div>

          {/* ACTIONS - Fixed Bottom */}
          <div className="flex-shrink-0 p-3 border-t border-border bg-background/95 backdrop-blur-md">
            <TooltipProvider>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleTest}
                      disabled={!csvParser.csvData || !prompt || isTesting || !variableValidation.isValid}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-secondary border border-border rounded-md text-sm text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label="Test prompt with first CSV row"
                    >
                      {isTesting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                      <span className="whitespace-nowrap">Test</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!csvParser.csvData ? 'Upload CSV file first' : !prompt ? 'Enter a prompt first' : !variableValidation.isValid ? `Missing variables: ${variableValidation.missing.join(', ')}` : 'Test with first row (⌘T)'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleProcess}
                      disabled={!csvParser.csvData || !prompt || batchProcessor.isProcessing || !variableValidation.isValid}
                      className="flex-[2] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary hover:bg-primary/90 active:bg-primary/95 transition-all duration-150 ease-out rounded-md text-sm text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      data-testid="run-button"
                      aria-label={`Process all ${csvParser.csvData?.totalRows || 0} rows with AI`}
                    >
                      {batchProcessor.isProcessing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                      <span className="whitespace-nowrap">
                        Run All {csvParser.csvData && <span className="inline">({csvParser.csvData.totalRows})</span>}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!csvParser.csvData ? 'Upload CSV file first' : !prompt ? 'Enter a prompt first' : !variableValidation.isValid ? `Missing variables: ${variableValidation.missing.join(', ')}` : `Run all ${csvParser.csvData?.totalRows || 0} rows (⌘Enter)`}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* RIGHT PANEL - Results */}
        <div className="h-full overflow-hidden flex flex-col">
          {displayResults.length > 0 ? (
            <ResultsTable
              results={displayResults}
              columns={csvParser.csvData?.columns || []}
              outputColumns={outputFields}
              progress={batchProcessor.progress ?? undefined}
              onExport={handleExport}
            />
          ) : csvParser.csvData ? (
            // Show CSV preview when CSV is uploaded but no results yet
            <CSVPreviewTable csvData={csvParser.csvData} />
          ) : (
            // Empty state - minimal, not overwhelming
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-2 max-w-sm">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Results will appear here after you run a batch
                </p>
              </div>
            </div>
          )}
        </div>
      </main>


      {/* TEMPLATE GALLERY MODAL */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Template Gallery"
        titleIcon={FileText}
        size="lg"
        ariaLabelledBy="template-gallery-title"
      >
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-3 py-2.5 bg-secondary/70 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/10 focus:border-border transition-all"
                aria-label="Search templates by name or category"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex gap-2 flex-wrap">
                {TEMPLATE_CATEGORIES.map((category) => {
                  const Icon = category.icon
                  const isActive = templateCategoryFilter === category.id
                  return (
                    <button
                      key={category.id}
                      onClick={() => setTemplateCategoryFilter(category.id)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        Icon ? 'flex items-center gap-1.5' : ''
                      } ${
                        isActive
                          ? 'bg-accent text-foreground border border-border'
                          : 'bg-accent text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                      aria-label={`Filter templates by ${category.label}`}
                      aria-pressed={isActive}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                      {category.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Templates List */}
          <div className="grid grid-cols-1 gap-3">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="text-left p-4 bg-secondary/70 hover:bg-accent/70 border border-border hover:border-border rounded-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
                          {template.name}
                        </h4>
                        <span className="px-2 py-0.5 bg-accent text-muted-foreground rounded text-xs font-mono">
                          {template.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Uses:</span>
                        <span className="font-mono">
                          {template.exampleVariables.map(v => `{{${v}}}`).join(', ')}
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground rotate-[-90deg] transition-colors flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))
            ) : (
              <div className="p-12 text-center">
                <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">No templates match your search</p>
                <p className="text-xs text-muted-foreground mb-4">Try a different search term or category</p>
                <button
                  onClick={() => {
                    setTemplateSearchQuery('')
                    setTemplateCategoryFilter('all')
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* KEYBOARD SHORTCUTS HELP MODAL */}
      <Modal
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        title="Keyboard Shortcuts"
        titleIcon={HelpCircle}
        titleIconColor="text-primary"
        size="md"
        ariaLabelledBy="keyboard-shortcuts-title"
        footer={
          <button onClick={() => setShowKeyboardHelp(false)} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors">
            Got it
          </button>
        }
      >
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">Keyboard shortcuts</p>

          <div className="space-y-4">
            {/* File Operations */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">File Operations</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-md">
                  <div className="flex items-center gap-3">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Open file picker</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">⌘</kbd>
                    <span className="text-muted-foreground">+</span>
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">O</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Processing */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Processing</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-md">
                  <div className="flex items-center gap-3">
                    <Play className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Test with first row</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">⌘</kbd>
                    <span className="text-muted-foreground">+</span>
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">T</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-md">
                  <div className="flex items-center gap-3">
                    <Play className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-foreground">Run all rows</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">⌘</kbd>
                    <span className="text-muted-foreground">+</span>
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">↵</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-md space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-primary/90">Pro Tip</p>
                  <p className="text-xs text-primary/70 leading-relaxed">
                    Use ⌘T to test your prompt with the first row before running the full batch. This helps you verify the output format and catch any issues early.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* DELETE OUTPUT FIELD CONFIRMATION MODAL */}
      <Modal
        isOpen={fieldToDelete !== null}
        onClose={() => setFieldToDelete(null)}
        title="Delete Output Field?"
        titleIcon={AlertTriangle}
        titleIconColor="text-yellow-500"
        size="sm"
        ariaLabelledBy="delete-field-title"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setFieldToDelete(null)}
              className="px-4 py-2 bg-accent hover:bg-accent text-foreground text-sm font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteOutputField}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-md transition-colors"
            >
              Delete Field
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            Are you sure you want to delete the output field <span className="font-mono text-primary">{fieldToDelete}</span>?
          </p>
          <p className="text-xs text-muted-foreground">
            This action cannot be undone. You&apos;ll need to manually add it back if you change your mind.
          </p>
        </div>
      </Modal>

      {/* Debug Logger - Only show in development mode or when there are errors */}
      {(typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') || batchProcessor.error || fileUpload.error || csvParser.error) && (
        <DebugLogger />
      )}
    </div>
  )
}
