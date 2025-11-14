/**
 * ABOUTME: Single-page bulk processor - power-user optimized interface
 * ABOUTME: Full-width layout, keyboard shortcuts, inline results, no wizard steps
 */

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  Upload, FileText, Play, CheckCircle,
  Loader2, X, ChevronDown, HelpCircle,
  Search, Filter, AlertTriangle, Sparkles, RotateCcw
} from 'lucide-react'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useCSVParser } from '@/hooks/useCSVParser'
import { useBatchProcessor } from '@/hooks/useBatchProcessor'
import type { ParsedCSV } from '@/lib/types'
import { useManualJobOptimizer } from '@/hooks/useManualJobOptimizer'
import { useVariableValidation } from '@/hooks/useVariableValidation'
import { getTimeEstimate } from '@/lib/time-estimation'
import { PARALLEL_CONCURRENCY } from '@/lib/processing-constants'
import { useBetaBanner } from '@/hooks/useBetaBanner'
import { useTemplateFilter } from '@/hooks/useTemplateFilter'
import { useCollapsibleState } from '@/hooks/useCollapsibleState'
import { useJobContext } from '@/hooks/useJobContext'
import { PromptSection } from './PromptSection'
import { JobPreview } from './JobPreview'
import { ResultsTable } from './ResultsTable'
import { DataInputTabs } from './DataInputTabs'
import { OutputFieldsSection } from './OutputFieldsSection'
import { ToolSelectionSection } from './ToolSelectionSection'
import { Modal } from '@/components/ui/modal'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
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
import { generateExportFilename } from '@/lib/export-filename'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { TEMPLATE_CATEGORIES, type PromptTemplate } from '@/lib/constants/promptTemplates'
import { saveCSVFile, restoreCSVFile, clearCSVFile } from '@/lib/storage/csv-storage'
import { getGoogleAccessToken, getStoredGoogleToken, storeGoogleToken, isGoogleTokenValid, clearGoogleToken } from '@/lib/auth/google-sheets'
import { flattenBatchResultsForExport } from '@/lib/export'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function BulkProcessor() {
  // === FILE STATE ===
  const fileUpload = useFileUpload()
  const csvParser = useCSVParser()
  const batchProcessor = useBatchProcessor()

  // === DEBUG LOGGING ===
  const debugLog = useDebugLogger()

  // === JOB CONTEXT PERSISTENCE ===
  const { saveContext, restoreContext, clearContext, loadContext } = useJobContext()
  const [hasRestoredContext, setHasRestoredContext] = useState(false)

  // === CONFIG STATE ===
  const [prompt, setPrompt] = useState('Write a bio for {{name}} at {{company}}')
  const [outputFields, setOutputFields] = useState<string[]>([])
  const [newField, setNewField] = useState('')
  const [showAdvancedSettingsModal, setShowAdvancedSettingsModal] = useState(false)
  // JSON mode is always enabled - no toggle needed for better output quality
  const [selectedTools, setSelectedTools] = useState<string[]>([]) // GTM tools to enable
  const [selectedInputColumns, setSelectedInputColumns] = useState<string[]>([]) // Input columns to include in output
  const [optimizeInput, setOptimizeInput] = useState(true)
  const [optimizeTask, setOptimizeTask] = useState(true)
  const [optimizeOutput, setOptimizeOutput] = useState(true)

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

  // === RESET CONFIRMATION ===
  const [showResetConfirmation, setShowResetConfirmation] = useState(false)

  // === COLLAPSIBLE SECTIONS STATE ===
  // Progressive disclosure: Input open by default, Task/Output closed
  // Only Input persists state - Task/Output always start closed for clean UX
  const dataInputSection = useCollapsibleState({
    storageKey: 'bulk-processor-data-input',
    defaultOpen: true // Only Input open by default
  })
  
  // Force Input section to be open on mount (override localStorage if needed)
  useEffect(() => {
    if (!dataInputSection.isOpen) {
      dataInputSection.setIsOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount
  
  // Task and Output don't persist state - always start closed
  const [promptSectionOpen, setPromptSectionOpen] = useState(false)
  const [outputSettingsSectionOpen, setOutputSettingsSectionOpen] = useState(false)
  
  const aiAssistantSection = useCollapsibleState({
    storageKey: 'bulk-processor-ai-assistant',
    defaultOpen: true // Open by default
  })

  // Force AI Optimization section to be open on mount (override localStorage)
  useEffect(() => {
    // Only open if not currently optimizing (don't override collapse when running)
    if (!isOptimizing && !aiAssistantSection.isOpen) {
      aiAssistantSection.setIsOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Restore job context and CSV file on mount (only once)
  useEffect(() => {
    if (hasRestoredContext) return

    const restoreFileAndContext = async () => {
      // First, try to restore CSV file from IndexedDB
      const savedContext = loadContext()
      const csvFilename = savedContext?.csvFilename
      
      // Try to restore the file
      const restoredFile = await restoreCSVFile(csvFilename)
      
      if (restoredFile) {
        // File found - upload and parse it
        try {
          await fileUpload.uploadFile(restoredFile)
          await csvParser.parseFile(restoredFile)
        } catch (err) {
          console.debug('Failed to restore CSV file:', err)
        }
      }

      // Now restore job context (after file is loaded if it exists)
      const currentCsvFilename = fileUpload.file?.name || restoredFile?.name || csvFilename
      const currentCsvColumnCount = csvParser.csvData?.columns.length
      const restored = restoreContext(currentCsvFilename, currentCsvColumnCount)

      if (Object.keys(restored).length > 0) {
        // Restore all context
        if (restored.prompt) setPrompt(restored.prompt)
        if (restored.outputFields) setOutputFields(restored.outputFields)
        if (restored.selectedTools) setSelectedTools(restored.selectedTools)
        if (restored.optimizeInput !== undefined) setOptimizeInput(restored.optimizeInput)
        if (restored.optimizeTask !== undefined) setOptimizeTask(restored.optimizeTask)
        if (restored.optimizeOutput !== undefined) setOptimizeOutput(restored.optimizeOutput)
        
        // Only restore selectedInputColumns if CSV matches
        if (restored.selectedInputColumns && csvParser.csvData) {
          // Validate that restored columns exist in current CSV
          const validColumns = restored.selectedInputColumns.filter(col =>
            csvParser.csvData!.columns.includes(col)
          )
          if (validColumns.length > 0) {
            setSelectedInputColumns(validColumns)
          }
          // If no valid columns, let existing logic handle it (defaults to all columns)
        }
      }

      setHasRestoredContext(true)
    }

    restoreFileAndContext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Re-restore selectedInputColumns when CSV loads after context restoration
  useEffect(() => {
    if (!hasRestoredContext || !csvParser.csvData) return

    const csvFilename = fileUpload.file?.name
    const csvColumnCount = csvParser.csvData.columns.length
    const restored = restoreContext(csvFilename, csvColumnCount)

    // If CSV matches saved context, restore selectedInputColumns
    if (restored.selectedInputColumns && csvFilename && csvColumnCount) {
      const validColumns = restored.selectedInputColumns.filter(col =>
        csvParser.csvData!.columns.includes(col)
      )
      if (validColumns.length > 0) {
        setSelectedInputColumns(validColumns)
        return // Don't run default logic below
      }
    }

    // Default: all columns selected (existing logic)
    const selectedSet = new Set(selectedInputColumns)
    const columnsMatch = csvParser.csvData.columns.length === selectedInputColumns.length &&
      csvParser.csvData.columns.every(col => selectedSet.has(col))
    
    if (selectedInputColumns.length === 0 || !columnsMatch) {
      setSelectedInputColumns([...csvParser.csvData.columns])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvParser.csvData?.columns.join(','), hasRestoredContext, fileUpload.file?.name])


  // Remove auto-collapse/expand - let user control sections manually
  // Sections stay open/closed based on user preference

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
  const [testStartTime, setTestStartTime] = useState<number | undefined>(undefined)
  const [processingStartTime, setProcessingStartTime] = useState<number | undefined>(undefined)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Memoize CSV columns to prevent infinite render loop (array created on every render)
  const csvColumns = useMemo(() => {
    return csvParser.csvData?.columns || []
  }, [csvParser.csvData?.columns])

  // Unified results: use batchProcessor.results as single source of truth
  const displayResults = useMemo(() => {
    return batchProcessor.results
  }, [batchProcessor.results])

  // Calculate token totals from batch results (fetch from database when batchId exists)
  const [tokenTotals, setTokenTotals] = useState<{ input: number; output: number }>({ input: 0, output: 0 })
  
  useEffect(() => {
    if (!batchProcessor.batchId) {
      setTokenTotals({ input: 0, output: 0 })
      return
    }

    // Fetch token totals from database
    const fetchTokenTotals = async () => {
      try {
        const supabase = createClient()
        if (!supabase) return

        const { data } = await supabase
          .from('batch_results')
          .select('input_tokens, output_tokens')
          .eq('batch_id', batchProcessor.batchId!)

        if (data && data.length > 0) {
          const totals = data.reduce(
            (acc, row) => ({
              input: acc.input + (row.input_tokens || 0),
              output: acc.output + (row.output_tokens || 0),
            }),
            { input: 0, output: 0 }
          )
          setTokenTotals(totals)
        }
      } catch (err) {
        // Silent failure - tokens will just not show
        if (process.env.NODE_ENV === 'development') {
          console.debug('Failed to fetch token totals:', err)
        }
      }
    }

    fetchTokenTotals()
    // Poll for updates while processing
    const interval = setInterval(fetchTokenTotals, 2000)
    return () => clearInterval(interval)
  }, [batchProcessor.batchId])

  // Manual AI optimization (user triggers with button)
  const {
    optimizedPrompt,
    setOptimizedPrompt,
    outputColumns,
    suggestedTools,
    suggestedInputColumns,
    reasoning,
    isOptimizing,
    triggerOptimization,
    clearOptimization,
  } = useManualJobOptimizer(
    prompt, 
    csvColumns,
    // Pass first 5 rows as sample data so AI can see which columns have content
    csvParser.csvData?.rows.slice(0, 5).map(row => row.data) || undefined
  )

  // Collapse AI Optimization panel when optimization starts (redundant when running)
  useEffect(() => {
    if (isOptimizing && aiAssistantSection.isOpen) {
      aiAssistantSection.setIsOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOptimizing, aiAssistantSection.isOpen])

  // Handle accepting AI suggestion
  const handleAcceptOptimization = useCallback(() => {
    if (optimizedPrompt) {
      setPrompt(optimizedPrompt)
    }
    // Use AI-detected output columns
    if (outputColumns.length > 0) {
      setOutputFields(outputColumns.map((col) => col.name))
    }
    // Apply AI-suggested tools
    if (suggestedTools.length > 0) {
      setSelectedTools(suggestedTools)
    }
    // Apply AI-suggested input columns
    if (suggestedInputColumns.length > 0) {
      setSelectedInputColumns(suggestedInputColumns)
    }
    clearOptimization()
    toast.success('AI suggestion applied!')
  }, [optimizedPrompt, outputColumns, suggestedTools, suggestedInputColumns, clearOptimization])

  // Handle rejecting AI suggestion
  const handleRejectOptimization = useCallback(() => {
    clearOptimization()
  }, [clearOptimization])

  // Recent files feature removed - users can re-upload files if needed

  // === VARIABLE VALIDATION ===
  const variableValidation = useVariableValidation(prompt, csvParser.csvData, selectedInputColumns)

  // === TIME ESTIMATION ===
  const timeEstimate = useMemo(() => {
    if (!csvParser.csvData || !prompt || !variableValidation.isValid) {
      return null
    }
    return getTimeEstimate(
      csvParser.csvData.totalRows,
      prompt.length,
      selectedTools.length,
      PARALLEL_CONCURRENCY
    )
  }, [csvParser.csvData, prompt, selectedTools.length, variableValidation.isValid])

  // Auto-save job context when state changes (debounced)
  useEffect(() => {
    if (!hasRestoredContext) return // Don't save during initial restoration

    const timeoutId = setTimeout(() => {
      saveContext({
        prompt,
        outputFields,
        selectedTools,
        selectedInputColumns,
        optimizeInput,
        optimizeTask,
        optimizeOutput,
        csvFilename: fileUpload.file?.name,
        csvColumnCount: csvParser.csvData?.columns.length,
      })
    }, 500) // Debounce 500ms

    return () => clearTimeout(timeoutId)
  }, [
    hasRestoredContext,
    prompt,
    outputFields,
    selectedTools,
    selectedInputColumns,
    optimizeInput,
    optimizeTask,
    optimizeOutput,
    fileUpload.file?.name,
    csvParser.csvData?.columns.length,
    saveContext,
  ])

  // === BATCH COMPLETION HANDLER ===
  // Clear test state when batch completes (for unified architecture)
  useEffect(() => {
    if (!batchProcessor.isProcessing && isTesting) {
      // Batch completed, clear test state
      setIsTesting(false)
      setTestStartTime(undefined)
    }
  }, [batchProcessor.isProcessing, isTesting])

  // === PROCESSING START TIME TRACKING ===
  // Track when processing starts for progress bar animation
  useEffect(() => {
    if (batchProcessor.isProcessing && !processingStartTime) {
      // Processing just started, set start time
      setProcessingStartTime(Date.now())
    } else if (!batchProcessor.isProcessing && processingStartTime) {
      // Processing stopped, clear start time
      setProcessingStartTime(undefined)
    }
  }, [batchProcessor.isProcessing, processingStartTime])

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

      // Save CSV file to IndexedDB and update context
      if (parsed && hasRestoredContext) {
        // Save file to IndexedDB for persistence
        await saveCSVFile(uploadedFile)
        
        // Save CSV filename to context
        saveContext({
          csvFilename: uploadedFile.name,
          csvColumnCount: parsed.columns.length,
        })
      }
    } catch (err) {
      // Errors are already handled by the hooks
      // Log error for debugging
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: 'fileUpload',
      })
    } finally {
      setIsUploading(false)
    }
  }, [csvParser, fileUpload, hasRestoredContext, saveContext])

  // === GOOGLE SHEETS DATA LOADED ===
  const handleGoogleSheetsDataLoaded = useCallback((parsedCSV: ParsedCSV) => {
    setIsUploading(true) // Set loading state while processing
    setError(null)
    
    try {
      // Set parsed data directly (bypassing file upload)
      csvParser.setParsedData(parsedCSV)
      
      // Track analytics
      trackEvent(ANALYTICS_EVENTS.FILE_UPLOADED, {
        fileName: parsedCSV.filename,
        fileSize: 0, // Google Sheets don't have file size
        source: 'google_sheets',
      })

      toast.success(`Imported "${parsedCSV.filename}" from Google Sheets`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process Google Sheet data'
      setError(errorMessage)
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: 'googleSheetsDataLoaded',
      })
      toast.error(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }, [csvParser])

  // === CLEAR DATA HANDLER ===
  const handleClearData = useCallback(() => {
    csvParser.clearData()
    fileUpload.clearFile()
    setSelectedInputColumns([])
    // Clear any stored CSV file from IndexedDB
    const csvFilename = fileUpload.file?.name
    if (csvFilename) {
      clearCSVFile(csvFilename).catch((err) => {
        console.debug('Failed to clear CSV file from IndexedDB:', err)
      })
    }
  }, [csvParser, fileUpload])

  // === KEYBOARD SHORTCUTS ===
  // Note: CSV file input is now handled inside CSVUploadTab component
  // Keyboard shortcut for file upload can be handled at tab level if needed

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

  // === RESET CONFIGURATION ===
  const handleResetConfiguration = useCallback(async () => {
    // Reset all configuration state
    setPrompt('Write a bio for {{name}} at {{company}}')
    setOutputFields([])
    setSelectedTools([])
    setOptimizeInput(true)
    setOptimizeTask(true)
    setOptimizeOutput(true)
    
    // Clear CSV file from IndexedDB
    const csvFilename = fileUpload.file?.name
    if (csvFilename) {
      await clearCSVFile(csvFilename)
    }
    
    // Clear file upload state
    fileUpload.clearFile()
    csvParser.clearData()
    
    // Reset selected input columns
    setSelectedInputColumns([])
    
    // Clear job context from localStorage
    clearContext()
    
    // Clear optimization results
    clearOptimization()
    
    // Close confirmation modal
    setShowResetConfirmation(false)
    
    toast.success('Configuration reset')
    
    trackEvent(ANALYTICS_EVENTS.JOB_RESET, {})
  }, [csvParser, fileUpload, clearContext, clearOptimization])

  // === TEST (1 ROW) - Unified with batch processor ===
  const handleTest = useCallback(async () => {
    if (!csvParser.csvData || !prompt) return

    // Variable validation check
    if (!variableValidation.isValid) {
      setError(`Cannot test: Missing variables in CSV: ${variableValidation.missing.join(', ')}`)
      return
    }

    setIsTesting(true)
    setError(null)
    setTestStartTime(Date.now())

    try {
      // Create test CSV with only first row
      const testCSVData = {
        ...csvParser.csvData,
        rows: [csvParser.csvData.rows[0]],
        totalRows: 1,
      }

      // Use unified batch processor with testMode flag
      await batchProcessor.startBatch({
        csvData: testCSVData,
        prompt,
        context: '',
        outputColumns: outputFields,
        tools: selectedTools.length > 0 ? selectedTools : undefined,
        testMode: true, // Enable test mode to bypass batch limit
        selectedInputColumns: selectedInputColumns.length > 0 ? selectedInputColumns : undefined,
      })

      // Note: batchId is set synchronously by startBatch after API call
      debugLog.info('Test batch started via unified processor', {
        rowCount: 1,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Test failed: ${message}`)
      setIsTesting(false)
      setTestStartTime(undefined)
    }
  }, [csvParser.csvData, prompt, outputFields, variableValidation, batchProcessor, selectedTools, selectedInputColumns, debugLog])

  // === PROCESS ALL ===
  const handleProcess = useCallback(async () => {
    if (!csvParser.csvData || !prompt) return

    // Variable validation check
    if (!variableValidation.isValid) {
      setError(`Cannot process: Missing variables in CSV: ${variableValidation.missing.join(', ')}`)
      return
    }

    // Clear test state when starting full batch
    setIsTesting(false)
    setTestStartTime(undefined)

    // Start batch processing using hook
    await batchProcessor.startBatch({
      csvData: csvParser.csvData,
      prompt,
      context: '',
      outputColumns: outputFields, // Always use JSON mode for structured output
      tools: selectedTools.length > 0 ? selectedTools : undefined,
      testMode: false, // Full batch
      selectedInputColumns: selectedInputColumns.length > 0 ? selectedInputColumns : undefined,
    })
  }, [csvParser.csvData, prompt, outputFields, batchProcessor, variableValidation, selectedTools, selectedInputColumns])

  // === EXPORT ===
  // === GOOGLE SHEETS EXPORT ===
  const handleExportToGoogleSheets = useCallback(async () => {
    const currentBatchId = batchProcessor.batchId
    if (!currentBatchId) {
      toast.error('No Batch Available', {
        description: 'Please run a batch first before exporting results.'
      })
      return
    }

    try {
      toast.loading('Preparing Google Sheets export...', { id: `export-gsheets-${currentBatchId}` })

      // Fetch results (same logic as CSV export)
      interface StatusResult {
        id?: string
        input?: Record<string, unknown>
        output?: string
        status?: string
        error?: string
        input_tokens?: number
        output_tokens?: number
        model?: string
      }
      interface ExportResult {
        input_data: Record<string, unknown>
        output_data: string
        status: string
        error_message: string
        input_tokens: number
        output_tokens: number
        model: string
      }
      let results: ExportResult[] = []
      
      try {
        const statusResponse = await fetch(`/api/batch/${currentBatchId}-status/status`)
        if (statusResponse.ok) {
          const statusData = await statusResponse.json() as { results?: StatusResult[] }
          if (statusData.results && Array.isArray(statusData.results) && statusData.results.length > 0) {
            results = statusData.results.map((r: StatusResult) => ({
              input_data: r.input || {},
              output_data: r.output || '',
              status: r.status === 'success' ? 'success' : r.status === 'error' ? 'error' : (r.status || 'unknown'),
              error_message: r.error || '',
              input_tokens: r.input_tokens || 0,
              output_tokens: r.output_tokens || 0,
              model: r.model || ''
            }))
          }
        }
      } catch {
        // Fallback to database
        const supabase = createClient()
        if (supabase) {
          const { data: dbResults } = await supabase
            .from('batch_results')
            .select('input_data, output_data, status, error_message, input_tokens, output_tokens, model')
            .eq('batch_id', currentBatchId)
            .order('id', { ascending: true })
          results = dbResults || []
        }
      }

      if (!results || results.length === 0) {
        toast.warning('No Results Available', {
          description: 'The batch may still be processing. Please wait a few moments and try again.',
          id: `export-gsheets-${currentBatchId}`
        })
        return
      }

      // Flatten results for export (same as CSV export)
      const flattenedResults = flattenBatchResultsForExport(results.map(row => ({
        input_data: typeof row.input_data === 'string' ? JSON.parse(row.input_data) : row.input_data,
        output_data: row.output_data,
        status: row.status,
        error_message: row.error_message,
        input_tokens: row.input_tokens,
        output_tokens: row.output_tokens,
        model: row.model
      })))

      // Convert to 2D array for Google Sheets
      const headers = Object.keys(flattenedResults[0] || {})
      const dataRows = flattenedResults.map(row => headers.map(header => {
        const value = row[header]
        // Convert to string, handle null/undefined
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value)
      }))
      const sheetData = [headers, ...dataRows]

      // Get or request Google access token
      let accessToken = getStoredGoogleToken()
      if (!accessToken || !isGoogleTokenValid()) {
        toast.loading('Authenticating with Google...', { id: `export-gsheets-${currentBatchId}` })
        const authResult = await getGoogleAccessToken()
        accessToken = authResult.accessToken
        storeGoogleToken(authResult.accessToken, authResult.expiresIn)
      }

      // Generate sheet title
      const sheetTitle = csvParser.csvData?.filename 
        ? `${csvParser.csvData.filename.replace('.csv', '')} - Results`
        : `Batch Results - ${new Date().toLocaleDateString()}`

      // Create Google Sheet
      toast.loading('Creating Google Sheet...', { id: `export-gsheets-${currentBatchId}` })
      const createResponse = await fetch('/api/google-sheets/create-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          title: sheetTitle,
          data: sheetData,
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}))
        if (createResponse.status === 401) {
          // Token expired, clear and retry
          clearGoogleToken()
          throw new Error('Session expired. Please try again.')
        }
        throw new Error(errorData.error || 'Failed to create Google Sheet')
      }

      const { spreadsheetUrl } = await createResponse.json()

      // Open Google Sheet in new tab
      window.open(spreadsheetUrl, '_blank')

      toast.success('Google Sheet Created!', {
        description: 'Opened in new tab',
        id: `export-gsheets-${currentBatchId}`
      })
    } catch (err) {
      logError(err instanceof Error ? err : new Error('Google Sheets export failed'), {
        source: 'BulkProcessor/handleExportToGoogleSheets',
        batchId: batchProcessor.batchId
      })
      toast.error('Google Sheets Export Failed', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.',
        id: `export-gsheets-${batchProcessor.batchId}`
      })
    }
  }, [batchProcessor.batchId, csvParser.csvData])

  const handleExport = useCallback(async () => {
    // Unified batch ID: use current batch (works for both test and full batches)
    const currentBatchId = batchProcessor.batchId
    if (!currentBatchId) {
      toast.error('No Batch Available', {
        description: 'Please run a batch first before exporting results.'
      })
      return
    }

    try {
      toast.loading('Preparing download...', { id: `export-${currentBatchId}` })

      // First try to fetch from status API (includes batch info)
      interface StatusResult {
        id?: string
        input?: Record<string, unknown>
        output?: string
        status?: string
        error?: string
        input_tokens?: number
        output_tokens?: number
        model?: string
      }
      interface ExportResult {
        input_data: Record<string, unknown>
        output_data: string
        status: string
        error_message: string
        input_tokens: number
        output_tokens: number
        model: string
      }
      let results: ExportResult[] = []
      try {
        const statusResponse = await fetch(`/api/batch/${currentBatchId}-status/status`)
        if (statusResponse.ok) {
          const statusData = await statusResponse.json() as { results?: StatusResult[] }
          if (statusData.results && Array.isArray(statusData.results) && statusData.results.length > 0) {
            // Transform status API results to export format (include tokens)
            results = statusData.results.map((r: StatusResult) => ({
              input_data: r.input || {},
              output_data: r.output || '',
              status: r.status === 'success' ? 'success' : r.status === 'error' ? 'error' : (r.status || 'unknown'),
              error_message: r.error || '',
              input_tokens: r.input_tokens || 0,
              output_tokens: r.output_tokens || 0,
              model: r.model || ''
            }))
          }
        }
      } catch (statusErr) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Status API fetch failed, trying database:', statusErr)
        }
      }

      // Fallback to direct database fetch if status API didn't work
      if (results.length === 0) {
        const supabase = createClient()
        if (!supabase) {
          toast.error('Database Error', {
            description: 'Supabase client not configured. Please refresh the page.',
            id: `export-${currentBatchId}`
          })
          return
        }

        const { data: dbResults, error } = await supabase
          .from('batch_results')
          .select('input_data, output_data, status, error_message, input_tokens, output_tokens, model')
          .eq('batch_id', currentBatchId)
          .order('id', { ascending: true })

        if (error) {
          logError(new Error('Batch results fetch failed'), {
            source: 'BulkProcessor/handleExport',
            batchId: currentBatchId,
            supabaseError: error
          })
          toast.error('Failed to Fetch Results', {
            description: 'Please try again or check the Dashboard for completed batches.',
            id: `export-${currentBatchId}`
          })
          return
        }

        results = dbResults || []
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
          output_tokens: row.output_tokens || 0,
          model: row.model || ''
        }
      })

      // Call server-side export API
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: exportData,
          format: 'csv',
          batchId: currentBatchId,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(errorData.error || `Export failed with status ${response.status}`)
      }

      // Get filename from Content-Disposition header (set by API using new naming convention)
      const disposition = response.headers.get('content-disposition') || ''
      const filenameMatch = disposition.match(/filename="([^"]+)"/)
      // Fallback uses same utility function for consistency (unlikely to be used, but ensures alignment)
      const filename = filenameMatch?.[1] || generateExportFilename(null, new Date(), 'csv')

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
        id: `export-${currentBatchId}`
      })
    } catch (err) {
      logError(err instanceof Error ? err : new Error('Export failed'), {
        source: 'BulkProcessor/handleExport',
        batchId: currentBatchId
      })
      toast.error('Export Failed', {
        description: 'An unexpected error occurred. Please try again.',
        id: `export-${currentBatchId}`
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

      {/* Beta Banner - Subtle, integrated */}
      {showBetaBanner && (
        <div className="flex-shrink-0 border-b border-border/30 bg-muted/20 px-4 sm:px-6 py-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {usage && (
                <span className="text-muted-foreground">
                  {usage.batchesToday}/{usage.dailyBatchLimit} batches today
                </span>
              )}
            </div>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={dismissBetaBanner}
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden min-h-0">
        {/* LEFT PANEL - Configuration */}
        <div className="h-full border-r border-border bg-secondary flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
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

            {/* Validation messages moved to Task section */}

            {/* Unused columns warning - Hidden to reduce noise */}

            {/* WORKFLOW STEPS - Hidden to reduce visual noise, onboarding handles guidance */}

            {/* INPUT SECTION */}
            <CollapsibleSection
              title="Input"
              open={dataInputSection.isOpen}
              onOpenChange={dataInputSection.setIsOpen}
              className="border border-border/30 rounded-md bg-background/30"
              triggerClassName="hover:bg-accent/20"
              contentClassName="px-0 pb-0"
              status={csvParser.csvData ? 'ready' : undefined}
              statusMessage={csvParser.csvData ? 'Ready' : undefined}
            >
              <DataInputTabs
                csvData={csvParser.csvData}
                fileName={fileUpload.file?.name}
                isUploading={isUploading}
                onFileUpload={handleFileUpload}
                onGoogleSheetsDataLoaded={handleGoogleSheetsDataLoaded}
                onClearData={handleClearData}
                selectedInputColumns={selectedInputColumns}
                onInputColumnsChange={setSelectedInputColumns}
              />
            </CollapsibleSection>

            {/* TASK SECTION */}
            <CollapsibleSection
              title="Task"
              open={promptSectionOpen}
              onOpenChange={setPromptSectionOpen}
              className="border border-border/30 rounded-md bg-background/30"
              triggerClassName="hover:bg-accent/20"
              contentClassName="px-0 pb-0"
              status={
                !csvParser.csvData ? undefined :
                !prompt.trim() ? undefined :
                !variableValidation.isValid ? 'error' :
                'ready'
              }
              statusMessage={
                !csvParser.csvData ? undefined :
                !prompt.trim() ? undefined :
                !variableValidation.isValid ? 'Missing variables' :
                'Ready'
              }
            >
              <PromptSection
                prompt={prompt}
                onPromptChange={setPrompt}
                csvData={csvParser.csvData}
                onOpenTemplates={() => setShowTemplateModal(true)}
                selectedInputColumns={selectedInputColumns}
                variableValidation={variableValidation}
              />
            </CollapsibleSection>

            {/* OUTPUT SECTION */}
            <CollapsibleSection
              title="Output"
              open={outputSettingsSectionOpen}
              onOpenChange={setOutputSettingsSectionOpen}
              className="border border-border/30 rounded-md bg-background/30"
              triggerClassName="hover:bg-accent/20"
              contentClassName="space-y-3"
              status={
                !csvParser.csvData || !prompt.trim() ? undefined :
                outputFields.length === 0 ? 'warning' :
                'ready'
              }
              statusMessage={
                !csvParser.csvData || !prompt.trim() ? undefined :
                outputFields.length === 0 ? 'No output fields' :
                'Ready'
              }
            >
              {/* OUTPUT COLUMNS - JSON mode always enabled for structured output */}
              <div className="space-y-3">
                <OutputFieldsSection
                  outputFields={outputFields}
                  newField={newField}
                  onNewFieldChange={setNewField}
                  onAddField={addOutputField}
                  onRemoveField={removeOutputField}
                />

                {/* TOOL SELECTION */}
                <ToolSelectionSection
                  selectedTools={selectedTools}
                  onToggleTool={toggleTool}
                />
              </div>

            </CollapsibleSection>

            {/* AI-OPTIMIZED JOB PREVIEW */}
            {(optimizedPrompt || outputColumns.length > 0 || suggestedInputColumns.length > 0 || suggestedTools.length > 0 || isOptimizing) && (
              <JobPreview
                optimizedPrompt={optimizedPrompt || undefined}
                setOptimizedPrompt={setOptimizedPrompt}
                outputColumns={outputColumns}
                suggestedInputColumns={suggestedInputColumns}
                suggestedTools={suggestedTools}
                reasoning={reasoning}
                isOptimizing={isOptimizing}
                onAccept={handleAcceptOptimization}
                onReject={handleRejectOptimization}
              />
            )}
          </div>

          {/* AI OPTIMIZATION - Global, above actions */}
          {csvParser.csvData && prompt && (
            <div className="flex-shrink-0 border-t border-border/30 bg-background/50">
              <CollapsibleSection
                title="AI Optimization"
                open={aiAssistantSection.isOpen}
                onOpenChange={aiAssistantSection.setIsOpen}
                className="border-0 bg-transparent"
                triggerClassName="hover:bg-accent/20 px-4 py-2.5"
                contentClassName="px-4 pb-3"
              >
                <div className="space-y-3">
                  {/* Optimization selector - Modern toggle switches */}
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <Switch
                        checked={optimizeInput}
                        onCheckedChange={setOptimizeInput}
                      />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Input</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <Switch
                        checked={optimizeTask}
                        onCheckedChange={setOptimizeTask}
                      />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Task</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <Switch
                        checked={optimizeOutput}
                        onCheckedChange={setOptimizeOutput}
                      />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Output</span>
                    </label>
                  </div>
                  
                  {/* Optimize button */}
                  <button
                    onClick={() => triggerOptimization({
                      optimizeInput,
                      optimizeTask,
                      optimizeOutput,
                      selectedInputColumns,
                      // Pass sample rows so AI can see which columns have data
                      sampleRows: csvParser.csvData?.rows.slice(0, 5).map(row => row.data),
                    })}
                    disabled={!csvParser.csvData || !prompt || isOptimizing || (!optimizeInput && !optimizeTask && !optimizeOutput)}
                    className="w-full px-3 py-2 h-9 bg-primary/10 hover:bg-primary/15 border border-primary/20 hover:border-primary/30 rounded-md text-xs font-medium text-foreground transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>AI Optimizing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Optimize with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* ACTIONS - Fixed Bottom */}
          <div className="flex-shrink-0 p-4 sm:p-6 pb-4 border-t border-border/50 bg-background/80 backdrop-blur-sm sticky bottom-0 z-10">
            <div className="flex items-center justify-between max-w-4xl mx-auto gap-2.5">
              {/* Reset button - Secondary action on left */}
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowResetConfirmation(true)}
                      className="flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded transition-colors"
                      aria-label="Reset configuration"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Reset configuration
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Primary action buttons */}
              <div className="flex gap-2.5 items-stretch flex-1 justify-end">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleTest}
                        disabled={!csvParser.csvData || !prompt || isTesting || !variableValidation.isValid}
                        className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2 h-9 bg-secondary/50 border border-border/50 rounded-md text-xs font-medium text-foreground/80 hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
                        aria-label="Test prompt with first CSV row"
                      >
                        {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
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
                        className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 min-h-[36px] bg-primary hover:bg-primary/90 active:bg-primary/95 transition-colors duration-150 rounded-md text-xs text-primary-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
                        data-testid="run-button"
                        aria-label={`Process all ${csvParser.csvData?.totalRows || 0} rows with AI${timeEstimate ? ` (estimated ${timeEstimate.formatted})` : ''}`}
                      >
                        {batchProcessor.isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
                        <span className="whitespace-nowrap flex items-center gap-1.5">
                          <span>Run All</span>
                          {csvParser.csvData && (
                            <>
                              <span className="inline">({csvParser.csvData.totalRows})</span>
                              {timeEstimate && !batchProcessor.isProcessing && (
                                <span className="inline opacity-75">• ~{timeEstimate.formatted}</span>
                              )}
                            </>
                          )}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {!csvParser.csvData ? 'Upload CSV file first' : !prompt ? 'Enter a prompt first' : !variableValidation.isValid ? `Missing variables: ${variableValidation.missing.join(', ')}` : `Run all ${csvParser.csvData?.totalRows || 0} rows${timeEstimate ? ` (~${timeEstimate.formatted})` : ''} (⌘Enter)`}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Results */}
        <div className="h-full overflow-hidden flex flex-col border-l border-border/30 bg-muted/20">
          {displayResults.length > 0 || batchProcessor.isProcessing || isTesting ? (
            <ResultsTable
              results={displayResults}
              columns={selectedInputColumns.length > 0 ? selectedInputColumns : (csvParser.csvData?.columns || [])}
              outputColumns={outputFields}
              progress={batchProcessor.progress ?? undefined}
              processingStartTime={processingStartTime}
              onExport={handleExport}
              onExportToGoogleSheets={handleExportToGoogleSheets}
              isTesting={isTesting}
              testStartTime={testStartTime}
              testEstimatedSeconds={isTesting && prompt ? getTimeEstimate(1, prompt.length, selectedTools.length).seconds : undefined}
              totalInputTokens={tokenTotals.input}
              totalOutputTokens={tokenTotals.output}
            />
          ) : (
            // Empty state - minimal and clean
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-2 max-w-xs">
                <p className="text-sm text-muted-foreground">
                  {csvParser.csvData 
                    ? 'Run a test or process all rows to see results'
                    : 'Upload CSV and configure prompt to see results'}
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
                className="w-full pl-10 pr-3 py-2.5 bg-secondary/70 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-border transition-all"
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

      {/* RESET CONFIGURATION CONFIRMATION MODAL */}
      <Modal
        isOpen={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        title="Reset configuration?"
        titleIcon={RotateCcw}
        titleIconColor="text-muted-foreground"
        size="sm"
        ariaLabelledBy="reset-config-title"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetConfiguration}
            >
              Reset
            </Button>
          </div>
        }
      >
        <p className="text-sm text-foreground">
          This will clear your prompt, output fields, selected tools, and AI optimization settings. Your CSV file will remain unchanged.
        </p>
      </Modal>

      {/* Debug Logger - Only show in development mode */}
      {process.env.NODE_ENV === 'development' && <DebugLogger />}
    </div>
  )
}
