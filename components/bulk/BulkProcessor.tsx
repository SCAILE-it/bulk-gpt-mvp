/**
 * ABOUTME: Single-page bulk processor - power-user optimized interface
 * ABOUTME: Full-width layout, keyboard shortcuts, inline results, no wizard steps
 */

'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  Upload, FileText, Play, CheckCircle, XCircle,
  Loader2, Plus, X, ChevronDown, HelpCircle,
  Table2, Webhook, Code, Search, Filter, Sparkles, Database, FileEdit, AlertTriangle
} from 'lucide-react'
import { parseCSV } from '@/lib/csv-parser'
import type { ParsedCSV } from '@/lib/types'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { features } from '@/lib/features'
import { useFileUpload, type RecentFile } from '@/hooks/useFileUpload'
import { useCSVParser } from '@/hooks/useCSVParser'
import { useBatchProcessor } from '@/hooks/useBatchProcessor'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useManualJobOptimizer } from '@/hooks/useManualJobOptimizer'
import { PromptSection } from './PromptSection'
import { JobPreview } from './JobPreview'
import { CSVPreviewTable } from './CSVPreviewTable'
import { ResultsTable } from './ResultsTable'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logError } from '@/lib/errors'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const RECENT_FILES_KEY = 'bulk-gpt-recent-files'

// PROMPT TEMPLATES
interface PromptTemplate {
  id: string
  name: string
  description: string
  prompt: string
  exampleVariables: string[]
  category: 'content' | 'data' | 'analysis'
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'write-bio',
    name: 'Professional Bio',
    description: 'Generate professional bios for team members, speakers, or clients',
    prompt: 'Write a professional bio (2-3 sentences) for {{name}} who works as {{title}} at {{company}}. {{name}} specializes in {{expertise}}. Keep it engaging and suitable for a conference website.',
    exampleVariables: ['name', 'title', 'company', 'expertise'],
    category: 'content'
  },
  {
    id: 'summarize-content',
    name: 'Content Summarizer',
    description: 'Summarize long text into concise bullet points',
    prompt: 'Summarize the following text into 3-5 key bullet points. Focus on the main ideas and actionable insights:\n\n{{text}}',
    exampleVariables: ['text'],
    category: 'analysis'
  },
  {
    id: 'extract-data',
    name: 'Data Extractor',
    description: 'Extract structured information from unstructured text',
    prompt: 'Extract the following information from this text and return as JSON:\n- Company name\n- Industry\n- Location\n- Key products/services\n\nText: {{description}}',
    exampleVariables: ['description'],
    category: 'data'
  }
]

// Category filter configuration
const TEMPLATE_CATEGORIES = [
  { id: 'all' as const, label: 'All', icon: null },
  { id: 'content' as const, label: 'Content', icon: FileEdit },
  { id: 'data' as const, label: 'Data', icon: Database },
  { id: 'analysis' as const, label: 'Analysis', icon: Sparkles },
]

interface Result {
  id: string
  input: Record<string, string>
  output: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
}

export default function BulkProcessor() {
  // === FILE STATE (V2: Use hooks if feature flags enabled) ===
  const useV2FileUpload = features.useNewFileUpload
  const useV2CSVParser = features.useNewCSVParser
  const useV2BatchProcessor = features.useNewBatchProcessor
  
  const v2FileUpload = useFileUpload()
  const v2CSVParser = useCSVParser()
  const v2BatchProcessor = useBatchProcessor()
  
  // V1 (Legacy) file state
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null)
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Use V2 or V1 state based on feature flags
  const currentFile = useV2FileUpload ? v2FileUpload.file : file
  const currentCsvData = useV2CSVParser ? v2CSVParser.csvData : csvData
  const currentError = useV2FileUpload ? v2FileUpload.error : (useV2CSVParser ? v2CSVParser.error : (useV2BatchProcessor ? v2BatchProcessor.error : null))

  // === CONFIG STATE ===
  const [prompt, setPrompt] = useState('Write a bio for {{name}} at {{company}}')
  const [outputFields, setOutputFields] = useState<string[]>(['bio'])
  const [newField, setNewField] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [showAdvancedSettingsModal, setShowAdvancedSettingsModal] = useState(false)

  // === API ACCESS ===
  const [apiToken, setApiToken] = useState<string | null>(null)
  const [showApiAccess, setShowApiAccess] = useState(false)
  const [isFetchingToken, setIsFetchingToken] = useState(false)

  // === TIMEOUT REFS (for cleanup) ===
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // === BETA BANNER ===
  const [showBetaBanner, setShowBetaBanner] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('bulk-beta-banner-dismissed') !== 'true'
  })

  // === TEMPLATE GALLERY ===
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateSearchQuery, setTemplateSearchQuery] = useState('')
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<'all' | 'content' | 'data' | 'analysis'>('all')

  // === KEYBOARD SHORTCUTS HELP ===
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // === DELETE CONFIRMATION ===
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null)

  // === FOCUS MANAGEMENT ===
  // Focus trap refs for modals - ensures keyboard navigation stays within modal
  const templateModalRef = useFocusTrap<HTMLDivElement>(showTemplateModal)
  const advancedSettingsModalRef = useFocusTrap<HTMLDivElement>(showAdvancedSettingsModal)
  const keyboardHelpModalRef = useFocusTrap<HTMLDivElement>(showKeyboardHelp)
  const deleteConfirmationModalRef = useFocusTrap<HTMLDivElement>(fieldToDelete !== null)

  // === PROCESSING STATE ===
  const [batchId, setBatchId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ total: number; completed: number; status: string } | null>(null)
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null)

  // Use V2 or V1 processing state
  const currentBatchId = useV2BatchProcessor ? v2BatchProcessor.batchId : batchId
  const currentIsProcessing = useV2BatchProcessor ? v2BatchProcessor.isProcessing : isProcessing
  const currentResults = useV2BatchProcessor ? v2BatchProcessor.results : results
  const currentProgress = useV2BatchProcessor ? v2BatchProcessor.progress : progress

  // Memoize CSV columns to prevent infinite render loop (array created on every render)
  const csvColumns = useMemo(() => {
    return currentCsvData?.columns || []
  }, [currentCsvData?.columns])

  // Manual AI optimization (user triggers with button)
  const {
    optimizedPrompt,
    setOptimizedPrompt,
    outputColumns,
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
      clearOptimization()
      toast.success('AI suggestion applied!')
    }
  }, [optimizedPrompt, outputColumns, clearOptimization])

  // Handle rejecting AI suggestion
  const handleRejectOptimization = useCallback(() => {
    clearOptimization()
  }, [clearOptimization])

  // Recent files feature removed - users can re-upload files if needed

  // === VARIABLE VALIDATION ===
  const variableValidation = useMemo(() => {
    if (!currentCsvData || !prompt) {
      return { missing: [], unused: [], isValid: true }
    }

    // Extract variables from prompt ({{variable}} syntax)
    const variablePattern = /\{\{([^}]+)\}\}/g
    const matches = Array.from(prompt.matchAll(variablePattern))
    const promptVars = new Set<string>()
    for (const match of matches) {
      promptVars.add(match[1].trim())
    }

    // Compare with CSV columns
    const csvCols = new Set(currentCsvData.columns)
    const missing = Array.from(promptVars).filter(v => !csvCols.has(v))
    const unused = Array.from(csvCols).filter(c => !promptVars.has(c))

    return {
      missing,
      unused,
      isValid: promptVars.size > 0 && missing.length === 0 // Require at least one variable AND all variables must exist in CSV
    }
  }, [currentCsvData, prompt])

  // === WEBHOOK URL VALIDATION ===
  const webhookValidation = useMemo(() => {
    if (!webhookUrl || webhookUrl.trim() === '') {
      return { isValid: true, error: null } // Empty is valid (optional field)
    }

    try {
      const url = new URL(webhookUrl)

      // Must use HTTPS for security
      if (url.protocol !== 'https:') {
        return { isValid: false, error: 'Webhook URL must use HTTPS (not HTTP) for security' }
      }

      // Valid HTTPS URL
      return { isValid: true, error: null }
    } catch {
      return { isValid: false, error: 'Invalid URL format (must start with https://)' }
    }
  }, [webhookUrl])

  // === FILTERED TEMPLATES ===
  const filteredTemplates = useMemo(() => {
    let filtered = PROMPT_TEMPLATES

    // Filter by category
    if (templateCategoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === templateCategoryFilter)
    }

    // Filter by search query
    if (templateSearchQuery.trim()) {
      const query = templateSearchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [templateSearchQuery, templateCategoryFilter])

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

    // V2: Use new hooks if feature flags enabled
    if (useV2FileUpload && useV2CSVParser) {
      try {
        await v2FileUpload.uploadFile(uploadedFile)

        // If successful, parse CSV
        if (!v2FileUpload.error && v2FileUpload.file) {
          await v2CSVParser.parseFile(uploadedFile)

          // Add to recent if parse succeeded
          if (!v2CSVParser.error && v2CSVParser.csvData) {
            v2FileUpload.addToRecent(uploadedFile, v2CSVParser.csvData.totalRows)
          }
        }
      } finally {
        setIsUploading(false)
      }
      return
    }

    // V1: Legacy implementation
    try {
      // Parse CSV (validation already done above)
      const parsed = await parseCSV(uploadedFile)

      // Validate parsed data - EDGE CASES
      if (parsed.columns.length === 0) {
        setError(`CSV has no column headers. Please ensure the first row contains column names (e.g., "name", "email", "company").`)
        return
      }
      if (parsed.totalRows === 0) {
        setError(`CSV has no data rows. The file only contains headers. Please add at least one row of data below the headers.`)
        return
      }
      if (parsed.totalRows > 1000) {
        setError(`CSV has too many rows (${parsed.totalRows}). Beta version is limited to 1,000 rows per batch. Try splitting your file or request full access.`)
        return
      }

      // Check for duplicate column names
      const duplicateCols = parsed.columns.filter((col, index) => parsed.columns.indexOf(col) !== index)
      if (duplicateCols.length > 0) {
        const uniqueDuplicates = Array.from(new Set(duplicateCols))
        setError(`Duplicate column names found: ${uniqueDuplicates.join(', ')}. Each column must have a unique name.`)
        return
      }

      // Check for empty column names
      const emptyColumns = parsed.columns.filter(col => !col || col.trim() === '')
      if (emptyColumns.length > 0) {
        setError(`Found ${emptyColumns.length} column(s) with no name. All columns must have names in the header row.`)
        return
      }

      setFile(uploadedFile)
      setCsvData(parsed)

      // Track successful upload
      trackEvent(ANALYTICS_EVENTS.FILE_UPLOADED, {
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        rowCount: parsed.totalRows,
        columnCount: parsed.columns.length,
      })

      // Add to recent files
      const recent: RecentFile = {
        name: uploadedFile.name,
        timestamp: Date.now(),
        rowCount: parsed.totalRows,
      }
      const updated = [recent, ...recentFiles.filter(f => f.name !== uploadedFile.name)].slice(0, 5)
      setRecentFiles(updated)
      localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated))

      // Show success message
      setSuccessMessage(`✓ Successfully loaded ${parsed.totalRows} rows from ${uploadedFile.name}`)

      // Clear any existing timeout
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }

      // Set new timeout with cleanup
      successTimeoutRef.current = setTimeout(() => {
        setSuccessMessage(null)
        successTimeoutRef.current = null
      }, 3000)

    } catch (err) {
      let errorMessage = 'Failed to parse CSV file'
      if (err instanceof Error) {
        // Make error messages more user-friendly
        if (err.message.includes('column') || err.message.includes('header')) {
          errorMessage = `CSV format error: ${err.message}. Make sure your file has column headers in the first row.`
        } else if (err.message.includes('encoding')) {
          errorMessage = `File encoding issue: ${err.message}. Try saving your CSV with UTF-8 encoding.`
        } else if (err.message.includes('quote') || err.message.includes('delimiter')) {
          errorMessage = `CSV structure error: ${err.message}. Check for unmatched quotes or unusual delimiters.`
        } else {
          errorMessage = `Parse error: ${err.message}. Please ensure your CSV file is properly formatted.`
        }
      }
      setError(errorMessage)

      // Track parse error
      trackEvent(ANALYTICS_EVENTS.FILE_PARSE_ERROR, {
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        error: errorMessage,
      })
    } finally {
      setIsUploading(false)
    }
  }, [recentFiles, useV2FileUpload, useV2CSVParser, v2FileUpload, v2CSVParser])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) handleFileUpload(acceptedFiles[0])
    },
    onDropRejected: (fileRejections) => {
      if (!fileRejections[0]) return
      const { file, errors } = fileRejections[0]

      if (errors.find(e => e.code === 'file-invalid-type')) {
        const ext = file.name.split('.').pop() || 'unknown'
        setError(`File type not supported. Please upload a CSV file (found: ${ext}). Export your spreadsheet as CSV from Excel or Google Sheets.`)
      } else if (errors.find(e => e.code === 'file-too-large')) {
        setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB. Try reducing the number of rows or removing unnecessary columns.`)
      } else {
        setError(`File rejected: ${errors[0]?.message || 'Unknown error'}`)
      }
    },
    multiple: false,
    accept: { 'text/csv': ['.csv'] },
    noClick: false,
    noKeyboard: false,
  })

  // === KEYBOARD SHORTCUTS ===
  useHotkeys('mod+o', (e) => {
    e.preventDefault()
    fileInputRef.current?.click()
  })

  useHotkeys('mod+t', (e) => {
    e.preventDefault()
    if (currentCsvData && prompt) handleTest()
  })

  useHotkeys('mod+enter', (e) => {
    e.preventDefault()
    if (currentCsvData && prompt) handleProcess()
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

  // === TEST (1 ROW) - Now polls for async results ===
  const handleTest = useCallback(async () => {
    if (!currentCsvData || !prompt) return

    // Variable validation check
    if (!variableValidation.isValid) {
      setError(`Cannot test: Missing variables in CSV: ${variableValidation.missing.join(', ')}`)
      return
    }

    // Webhook validation check
    if (!webhookValidation.isValid) {
      setError(`Cannot test: ${webhookValidation.error}`)
      return
    }

    setIsTesting(true)
    setError(null)

    try {
      // Step 1: Create batch (async)
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvFilename: currentCsvData.filename,
          rows: [currentCsvData.rows[0].data], // Only first row
          prompt,
          context: '',
          outputColumns: outputFields,
          webhookUrl: webhookUrl || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
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
          setResults([testResult])
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
  }, [currentCsvData, prompt, outputFields, webhookUrl, variableValidation, webhookValidation])

  // === PROCESS ALL ===
  const handleProcess = useCallback(async () => {
    if (!currentCsvData || !prompt) return

    // Variable validation check
    if (!variableValidation.isValid) {
      setError(`Cannot process: Missing variables in CSV: ${variableValidation.missing.join(', ')}`)
      return
    }

    // Webhook validation check
    if (!webhookValidation.isValid) {
      setError(`Cannot process: ${webhookValidation.error}`)
      return
    }

    // V2: Use new batch processor hook
    if (useV2BatchProcessor) {
      await v2BatchProcessor.startBatch({
        csvData: currentCsvData,
        prompt,
        context: '',
        outputColumns: outputFields,
        webhookUrl: webhookUrl || undefined,
      })
      return
    }

    // V1: Legacy implementation
    setIsProcessing(true)
    setError(null)
    setResults([])
    setProgress(null)
    setProcessingStartTime(Date.now())

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvFilename: currentCsvData.filename,
          rows: currentCsvData.rows.map(r => r.data),
          prompt,
          context: '',
          outputColumns: outputFields,
          webhookUrl: webhookUrl || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Processing failed')
      }

      const data = await response.json()
      setBatchId(data.batchId)

      // Track batch start
      trackEvent(ANALYTICS_EVENTS.BATCH_STARTED, {
        batchId: data.batchId,
        rowCount: currentCsvData.rows.length,
        promptLength: prompt.length,
        outputFieldCount: outputFields.length,
      })

      // Initialize results and progress
      const initialResults: Result[] = currentCsvData.rows.map((row, index) => ({
        id: `${data.batchId}-${index}`,
        input: row.data,
        output: '',
        status: 'pending' as const,
      }))
      setResults(initialResults)
      setProgress({ total: currentCsvData.rows.length, completed: 0, status: 'pending' })

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Batch processing failed: ${message}. Your data has not been processed. Please try again or contact support if the issue persists.`)
      setIsProcessing(false)
    }
  }, [currentCsvData, prompt, outputFields, webhookUrl, useV2BatchProcessor, v2BatchProcessor, variableValidation, webhookValidation])

  // === STREAMING (EventSource) - V1 ONLY ===
  useEffect(() => {
    // V2: useBatchProcessor handles streaming internally
    if (useV2BatchProcessor) return
    
    if (!batchId || !isProcessing) return

    const eventSource = new EventSource(`/api/batch/${batchId}/stream`)

    // Handle new result
    eventSource.addEventListener('result', (e) => {
      const result = JSON.parse(e.data)
      setResults(prev => {
        const updated = [...prev]
        const index = result.row_index
        if (index >= 0 && index < updated.length) {
          updated[index] = {
            id: result.id,
            input: typeof result.input_data === 'string' ? JSON.parse(result.input_data) : result.input_data,
            output: result.output_data || '',
            status: result.status === 'success' ? 'completed' : result.status === 'error' ? 'failed' : result.status,
            error: result.error_message,
          }
        }
        return updated
      })
    })

    // Handle progress update
    eventSource.addEventListener('progress', (e) => {
      const progressData = JSON.parse(e.data)
      setProgress({
        total: progressData.total || 0,
        completed: progressData.completed || 0,
        status: progressData.status || 'processing',
      })
    })

    // Handle completion
    eventSource.addEventListener('complete', () => {
      setIsProcessing(false)
      eventSource.close()
    })

    // Handle errors
    eventSource.addEventListener('error', () => {
      setError('Stream connection failed')
      setIsProcessing(false)
      eventSource.close()
    })

    // Cleanup on unmount
    return () => {
      eventSource.close()
    }
  }, [batchId, isProcessing, useV2BatchProcessor])

  // === CLEANUP TIMEOUTS ON UNMOUNT ===
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  // === EXPORT ===
  const handleExport = useCallback(async () => {
    if (!currentBatchId) {
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

      toast.loading('Preparing download...', { id: `export-${currentBatchId}` })

      // Fetch completed results from database
      const { data: results, error } = await supabase
        .from('batch_results')
        .select('input_data, output_data, status, error_message')
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

      if (!results || results.length === 0) {
        toast.warning('No Results Available', {
          description: 'The batch may still be processing. Please wait a few moments and try again.',
          id: `export-${currentBatchId}`
        })
        return
      }

      // Parse first result to get input column names
      const firstResult = results[0]
      const inputData = typeof firstResult.input_data === 'string'
        ? JSON.parse(firstResult.input_data)
        : firstResult.input_data
      const inputColumns = Object.keys(inputData)

      // Generate CSV with proper output field mapping
      const outputFieldNames = outputFields
      const headers = [...inputColumns, ...outputFieldNames, 'Status', 'Error']

      const csvRows = results.map(row => {
        const input = typeof row.input_data === 'string'
          ? JSON.parse(row.input_data)
          : row.input_data
        const inputValues = inputColumns.map(col => `"${(input[col] || '').replace(/"/g, '""')}"`)

        // Parse output_data to extract individual fields
        let outputValues: string[] = []
        if (row.output_data) {
          try {
            const outputJson = typeof row.output_data === 'string'
              ? JSON.parse(row.output_data)
              : row.output_data

            // Extract each output field by name
            outputValues = outputFieldNames.map(fieldName => {
              const value = outputJson[fieldName] || ''
              return `"${value.toString().replace(/"/g, '""')}"`
            })
          } catch {
            // If parsing fails, use raw output for all fields
            const rawOutput = `"${row.output_data.toString().replace(/"/g, '""')}"`
            outputValues = outputFieldNames.map(() => rawOutput)
          }
        } else {
          // Empty output fields if no data
          outputValues = outputFieldNames.map(() => '""')
        }

        const status = row.status || 'unknown'
        const error = row.error_message ? `"${row.error_message.replace(/"/g, '""')}"` : '""'

        return [...inputValues, ...outputValues, status, error].join(',')
      })

      const csvContent = [headers.join(','), ...csvRows].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `results-${currentBatchId}.csv`
      a.click()
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
  }, [currentBatchId, outputFields])

  // === FETCH API TOKEN ===
  const handleFetchToken = useCallback(async () => {
    setIsFetchingToken(true)
    setError(null)

    try {
      const response = await fetch('/api/tokens')
      if (!response.ok) throw new Error('Failed to fetch token')
      const data = await response.json()
      setApiToken(data.token)
      setShowApiAccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API token')
    } finally {
      setIsFetchingToken(false)
    }
  }, [])

  const dismissBetaBanner = useCallback(() => {
    localStorage.setItem('bulk-beta-banner-dismissed', 'true')
    setShowBetaBanner(false)
  }, [])

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
    <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Beta Banner */}
      {showBetaBanner && (
        <div className="bg-blue-600/10 border-b border-blue-500/20 px-4 sm:px-6 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded flex-shrink-0">BETA</span>
              <p className="text-xs text-blue-300 truncate sm:whitespace-normal">
                <span className="hidden sm:inline">Limited to 1,000 rows per batch • 5 batches per day •</span>
                <span className="sm:hidden">1k rows/batch • 5/day •</span>
                <a href="#" className="ml-1 underline hover:text-blue-200 whitespace-nowrap">Request full access →</a>
              </p>
            </div>
            <button
              className="text-blue-400 hover:text-blue-300 flex-shrink-0"
              onClick={dismissBetaBanner}
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 sticky top-0 z-50 border-b border-white/5 bg-zinc-950/95 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-950/60">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <h1 className="text-sm font-medium tracking-tight">Bulk Processor</h1>
            <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-white/5 rounded text-xs">⌘O</kbd>
                <span>Upload</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-white/5 rounded text-xs">⌘T</kbd>
                <span>Test</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-white/5 rounded text-xs">⌘↵</kbd>
                <span>Run</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentCsvData && (
              <div className="text-xs text-zinc-500">
                {currentCsvData.totalRows} rows • {currentCsvData.columns.length} cols
              </div>
            )}
            <button
              onClick={() => setShowKeyboardHelp(true)}
              className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-400 hover:text-zinc-300 transition-colors"
              aria-label="View keyboard shortcuts"
              title="Keyboard shortcuts"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 h-full grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* LEFT PANEL - Configuration */}
        <div className="h-full border-r border-white/5 bg-zinc-900 flex flex-col">
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {/* Error - Use V2 error if available */}
            {(currentError || error) && (
              <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded space-y-2">
                <p className="text-sm text-red-400">{currentError || error}</p>
                {(error?.includes('wait for your current batch') || error?.includes('batch to complete')) && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/batch/reset', { method: 'POST' })
                        if (response.ok) {
                          setError(null)
                          setIsProcessing(false)
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

            {/* Success Message */}
            {successMessage && (
              <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {successMessage}
              </div>
            )}

            {/* WORKFLOW STEPS */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 ${currentCsvData ? 'text-green-400' : 'text-blue-400'}`}>
                  {currentCsvData ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-current" />
                  )}
                  <span className="text-xs font-medium">1. Upload CSV</span>
                </div>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 ${currentCsvData && prompt ? 'text-green-400' : currentCsvData ? 'text-blue-400' : 'text-zinc-600'}`}>
                  {currentCsvData && prompt ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : currentCsvData ? (
                    <div className="h-4 w-4 rounded-full border-2 border-current flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-current" />
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-current" />
                  )}
                  <span className="text-xs font-medium">2. Configure Prompt</span>
                </div>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 ${currentIsProcessing ? 'text-blue-400' : currentResults.length > 0 ? 'text-green-400' : 'text-zinc-600'}`}>
                  {currentIsProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : currentResults.length > 0 ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-current" />
                  )}
                  <span className="text-xs font-medium">3. Process Data</span>
                </div>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
            </div>

            <div className="h-px bg-zinc-800/50" />

            {/* FILE UPLOAD / DATA PREVIEW (Combined) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">Dataset</label>
                {currentCsvData && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
                    title="Upload a different CSV file (⌘O)"
                  >
                    <Upload className="h-3 w-3" />
                    Change file
                  </button>
                )}
              </div>

              {currentCsvData && !isUploading ? (
                // Show CSV Preview when file is loaded
                <>
                  <div className="border border-white/5 rounded-lg overflow-hidden bg-zinc-900/40">
                    <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-zinc-900/60">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-xs text-zinc-300 font-medium">{currentFile?.name || 'data.csv'}</span>
                      </div>
                      <span className="text-xs text-zinc-500" data-testid="row-count-display">
                        {currentCsvData.totalRows} rows • {currentCsvData.columns.length} columns
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-[120px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-zinc-900/95 border-b border-white/5">
                          <tr>
                            {currentCsvData.columns.map(col => (
                              <th key={col} className="px-2 py-1 text-left font-medium text-zinc-400 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentCsvData.rows.slice(0, 5).map((row, i) => (
                            <tr
                              key={i}
                              className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? 'bg-zinc-900/40' : 'bg-transparent'}`}
                            >
                              {currentCsvData.columns.map(col => (
                                <td key={col} className="px-2 py-1 text-zinc-300 font-mono text-xs whitespace-nowrap">
                                  {row.data[col] || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {currentCsvData.totalRows > 5 && (
                      <div className="px-3 py-1.5 bg-zinc-900/60 border-t border-white/5 text-xs text-zinc-500">
                        Showing first 5 of {currentCsvData.totalRows} rows
                      </div>
                    )}
                  </div>
                  <input {...getInputProps()} ref={fileInputRef} className="hidden" data-testid="file-input" />
                </>
              ) : (
                // Show Upload Dropzone when no file or uploading
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-3 min-h-[80px] flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 ${
                    isDragActive
                      ? 'border-white/20 bg-white/5 scale-[1.02]'
                      : 'border-white/10 hover:border-white/15 bg-zinc-900/30 hover:bg-zinc-900/50 active:scale-[0.98]'
                  }`}
                >
                  <input {...getInputProps()} ref={fileInputRef} className="hidden" data-testid="file-input" />
                  {isUploading ? (
                    <>
                      <Loader2 className="h-8 w-8 mx-auto mb-2 text-zinc-400 animate-spin" />
                      <p className="text-sm text-zinc-300 font-medium">Uploading and parsing...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-zinc-400" />
                      <p className="text-sm text-zinc-200 font-medium mb-1">
                        {isDragActive ? 'Drop here' : 'Drop your CSV file here'}
                      </p>
                      <p className="text-xs text-zinc-300 mb-2">or</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          fileInputRef.current?.click()
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-md text-sm font-medium text-zinc-200 transition-all active:scale-95"
                      >
                        Browse Files
                      </button>
                      <p className="text-xs text-zinc-500 mt-3">
                        Max 10MB • CSV format • Up to 1,000 rows
                      </p>
                      <a
                        href="/sample.csv"
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-zinc-400 hover:text-zinc-300 mt-2 inline-flex items-center gap-1 hover:underline"
                      >
                        Download sample template →
                      </a>
                    </>
                  )}
                </div>
              )}

              {/* Upload feedback */}
              {successMessage && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <p className="text-xs text-green-500">{successMessage}</p>
                </div>
              )}
              {currentError && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md">
                  <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">{currentError}</p>
                </div>
              )}
            </div>

            <div className="h-px bg-zinc-800/50" />

            {/* PROMPT */}
            <PromptSection
              prompt={prompt}
              onPromptChange={setPrompt}
              csvData={csvData}
              onOpenTemplates={() => setShowTemplateModal(true)}
            />

            {/* OUTPUT COLUMNS - Now inline for better visibility */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Table2 className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                <label className="text-xs font-medium text-zinc-300">Output Columns</label>
                <div className="group relative">
                  <HelpCircle className="h-3 w-3 text-zinc-600 cursor-help" />
                  <div className="hidden group-hover:block absolute left-0 top-5 z-50 w-72 p-3 bg-zinc-800 border border-white/10 rounded-md text-xs text-zinc-300 shadow-xl">
                    <p className="font-medium mb-1.5">What are output columns?</p>
                    <p className="mb-2">These define what fields the AI generates for each row in your CSV export.</p>
                    <p className="text-zinc-400">
                      <span className="font-medium">Example:</span> If you set &quot;bio&quot; and &quot;summary&quot;, your exported CSV will have both columns filled with AI-generated content.
                    </p>
                    <p className="mt-2 text-zinc-500 text-[11px]">Default is &quot;bio&quot; - most users keep this.</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Define what columns appear in your exported CSV. The AI will generate content for each field.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {outputFields.map(field => (
                  <div key={field} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-white/5 rounded text-sm text-zinc-300 font-mono">
                    {field}
                    <button
                      onClick={() => removeOutputField(field)}
                      className="hover:text-red-400 transition-colors"
                      aria-label={`Remove ${field} output field`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <div className="inline-flex gap-1">
                  <input
                    value={newField}
                    onChange={(e) => setNewField(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addOutputField()}
                    placeholder="field..."
                    className="w-24 px-2 py-1 bg-zinc-900/70 border border-white/5 rounded text-sm text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-white/10 focus:border-white/10 transition-all duration-150 ease-out"
                  />
                  <button
                    onClick={addOutputField}
                    className="p-1 hover:bg-zinc-800 rounded transition-colors"
                    aria-label="Add output field"
                  >
                    <Plus className="h-3 w-3 text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* OPTIMIZE WITH AI BUTTON - Improved text to clarify it auto-detects columns */}
            {prompt && csvData && !optimizedPrompt && !isOptimizing && (
              <button
                onClick={triggerOptimization}
                className="mt-3 w-full px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md text-sm font-medium text-blue-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Optimize with AI (auto-detect columns)
              </button>
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

              {csvData && prompt && variableValidation.isValid && Array.from(new Set(prompt.match(/\{\{([^}]+)\}\}/g) || [])).length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-400">
                    <span className="font-medium">Variables detected: </span>
                    <span className="font-mono">
                      {Array.from(new Set(prompt.match(/\{\{([^}]+)\}\}/g) || [])).join(', ')}
                    </span>
                  </p>
                </div>
              )}

              {/* VARIABLE VALIDATION WARNING */}
              {!variableValidation.isValid && variableValidation.missing.length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-md">
                  <XCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-orange-400">
                      Missing variables in your CSV
                    </p>
                    <p className="text-xs text-orange-300/80">
                      These variables are used in your prompt but don&apos;t exist in your CSV:{' '}
                      <span className="font-mono font-semibold">
                        {variableValidation.missing.map(v => `{{${v}}}`).join(', ')}
                      </span>
                    </p>
                    <p className="text-xs text-orange-300/60">
                      Please check your column names or remove these variables from your prompt.
                    </p>
                  </div>
                </div>
              )}

              {/* UNUSED VARIABLES INFO (subtle, informational only) */}
              {csvData && prompt && variableValidation.isValid && variableValidation.unused.length > 0 && (
                <div className="flex items-start gap-2 p-1.5 bg-zinc-800/30 border border-zinc-700/30 rounded-md">
                  <p className="text-xs text-zinc-500">
                    💡 FYI: You have {variableValidation.unused.length} unused column{variableValidation.unused.length > 1 ? 's' : ''} in your CSV ({variableValidation.unused.map(v => `{{${v}}}`).join(', ')}). This is fine - they&apos;ll just be ignored.
                  </p>
                </div>
              )}

            {/* WEBHOOK URL - Moved from Advanced modal */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Webhook className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                <label htmlFor="webhook" className="text-xs font-medium text-zinc-400">
                  Webhook URL
                </label>
                <span className="text-xs text-zinc-600">(optional)</span>
              </div>
              <input
                id="webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.n8n.cloud/..."
                className={`w-full px-3 py-1.5 bg-zinc-900/70 rounded-md text-sm text-zinc-300 font-mono focus:outline-none transition-all duration-150 ease-out ${
                  !webhookValidation.isValid
                    ? 'border border-orange-500/50 focus:ring-1 focus:ring-orange-500/40 focus:shadow-[0_0_4px_rgba(249,115,22,0.4)]'
                    : 'border border-white/5 focus:ring-1 focus:ring-white/10 focus:border-white/10'
                }`}
              />
              {!webhookValidation.isValid && webhookValidation.error && (
                <p className="text-xs text-orange-400 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {webhookValidation.error}
                </p>
              )}
              {webhookValidation.isValid && webhookUrl && (
                <p className="text-xs text-zinc-500">POST results to this URL when batch completes</p>
              )}
            </div>

            {/* ADVANCED SETTINGS (Modal) - Now only for API access */}
            <div className="flex items-center gap-2">
              <Code className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
              <label className="text-xs font-medium text-zinc-400">API Access</label>
              <span className="text-xs text-zinc-600">(optional)</span>
              <button
                onClick={() => setShowAdvancedSettingsModal(true)}
                className="ml-auto text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                Show curl command →
              </button>
            </div>

            {/* Hidden - Advanced Settings content (now in modal) */}
            {false && (
              <div className="space-y-2">
                <div className="space-y-4 px-3 py-2 border-l-2 border-zinc-800">
                  {/* OUTPUT FIELDS */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Table2 className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                      <label className="text-xs font-medium text-zinc-300">Output Column Names</label>
                      <div className="group relative">
                        <HelpCircle className="h-3 w-3 text-zinc-600 cursor-help" />
                        <div className="hidden group-hover:block absolute left-0 top-5 z-50 w-64 p-2 bg-zinc-800 border border-white/10 rounded-md text-xs text-zinc-300">
                          By default, results go into a column called &quot;bio&quot;. Only change this if you need multiple output columns.
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">
                      These will be the column headers in your results CSV (default: &quot;bio&quot;)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {outputFields.map(field => (
                        <div key={field} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-white/5 rounded text-sm text-zinc-300 font-mono">
                          {field}
                          <button
                            onClick={() => removeOutputField(field)}
                            className="hover:text-red-400 transition-colors"
                            aria-label={`Remove ${field} output field`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <div className="inline-flex gap-1">
                        <input
                          value={newField}
                          onChange={(e) => setNewField(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addOutputField()}
                          placeholder="field..."
                          className="w-24 px-2 py-1 bg-zinc-900/70 border border-white/5 rounded text-sm text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-white/10 focus:border-white/10 transition-all duration-150 ease-out"
                        />
                        <button
                          onClick={addOutputField}
                          className="p-1 hover:bg-zinc-800 rounded transition-colors"
                          aria-label="Add output field"
                        >
                          <Plus className="h-3 w-3 text-zinc-500" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* WEBHOOK */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                      <label htmlFor="webhook" className="text-xs font-medium text-zinc-300">
                        Webhook URL
                      </label>
                      <span className="text-xs text-zinc-600">(optional)</span>
                    </div>
                    <input
                      id="webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://hooks.n8n.cloud/..."
                      className={`w-full px-3 py-1.5 bg-zinc-900/70 rounded-md text-sm text-zinc-300 font-mono focus:outline-none transition-all duration-150 ease-out ${
                        !webhookValidation.isValid
                          ? 'border border-orange-500/50 focus:ring-1 focus:ring-orange-500/40 focus:shadow-[0_0_4px_rgba(249,115,22,0.4)]'
                          : 'border border-white/5 focus:ring-1 focus:ring-white/10 focus:border-white/10'
                      }`}
                    />
                    {!webhookValidation.isValid && webhookValidation.error && (
                      <p className="text-xs text-orange-400 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {webhookValidation.error}
                      </p>
                    )}
                    {webhookValidation.isValid && (
                      <p className="text-xs text-zinc-500">POST results to this URL when batch completes</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Hidden - API ACCESS moved to Advanced Settings modal */}
            {false && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Code className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                  <label className="text-xs font-medium text-zinc-400">API Access</label>
                </div>
                {!showApiAccess ? (
                  <button
                    onClick={handleFetchToken}
                    disabled={isFetchingToken}
                    className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isFetchingToken && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span>{isFetchingToken ? 'Loading...' : 'Show curl command →'}</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <pre className="p-3 bg-zinc-900 border border-white/5 rounded-lg text-xs text-zinc-400 font-mono overflow-x-auto">
{`curl -X POST ${window.location.origin}/api/process \\
  -H "Authorization: Bearer ${apiToken?.slice(0, 20)}..." \\
  -H "Content-Type: application/json" \\
  -d '{"csvFilename":"data.csv","rows":[...]}'`}
                    </pre>
                    <p className="text-xs text-zinc-400">Use in n8n, Zapier, Postman</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACTIONS - Fixed Bottom */}
          <div className="flex-shrink-0 p-2 border-t border-white/5 bg-zinc-950/95 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row gap-1.5">
              <button
                onClick={handleTest}
                disabled={!csvData || !prompt || isTesting || !variableValidation.isValid || !webhookValidation.isValid}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-white/5 rounded-md text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px] sm:min-h-0"
                title="Test with first row (⌘T)"
              >
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span>Test (1 row)</span>
              </button>
              <button
                onClick={handleProcess}
                disabled={!csvData || !prompt || currentIsProcessing || !variableValidation.isValid || !webhookValidation.isValid}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 hover:shadow-[inset_0_1px_0_rgba(96,165,250,0.2)] transition-all duration-150 ease-out rounded-md text-sm text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] sm:min-h-0"
                title="Run all rows (⌘Enter)"
                data-testid="run-button"
              >
                {currentIsProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span>Run All {csvData ? `(${csvData.totalRows})` : ''}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Results */}
        <div className="h-full overflow-hidden flex flex-col">
          {currentResults.length > 0 ? (
            <ResultsTable
              results={currentResults}
              columns={currentCsvData?.columns || []}
              progress={currentProgress}
              processingStartTime={processingStartTime}
              onExport={handleExport}
            />
          ) : currentCsvData ? (
            // Show CSV preview when CSV is uploaded but no results yet
            <CSVPreviewTable csvData={currentCsvData} />
          ) : (
            // Empty state - no CSV uploaded
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-4 max-w-md">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 border-2 border-blue-500/20 flex items-center justify-center">
                  <FileText className="h-7 w-7 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-medium text-zinc-200">No results yet</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Upload a CSV, configure your prompt, and click Run to see results here
                  </p>
                </div>
                <div className="pt-2 space-y-2 text-xs text-zinc-500">
                  <p>Your results will appear as:</p>
                  <div className="flex items-center justify-center gap-2 p-3 bg-zinc-900/50 border border-white/5 rounded-lg">
                    <div className="flex-1 text-left">
                      <div className="text-zinc-400 font-mono text-xs">Input</div>
                      <div className="text-zinc-300 text-xs">Row data</div>
                    </div>
                    <div className="text-zinc-600">→</div>
                    <div className="flex-1 text-left">
                      <div className="text-zinc-400 font-mono text-xs">Output</div>
                      <div className="text-zinc-300 text-xs">AI result</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>


      {/* TEMPLATE GALLERY MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowTemplateModal(false)} tabIndex={-1}>
          <div
            ref={templateModalRef}
            className="bg-zinc-900 border border-white/10 rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="template-gallery-title"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-zinc-400" />
                <h2 id="template-gallery-title" className="text-lg font-medium text-zinc-100">Template Gallery</h2>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Close template gallery"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Search and Filter */}
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      placeholder="Search templates..."
                      className="w-full pl-10 pr-3 py-2.5 bg-zinc-900/70 border border-white/5 rounded-md text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/10 focus:border-white/10 transition-all"
                    />
                  </div>

                  {/* Category Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-zinc-500 flex-shrink-0" />
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
                                ? 'bg-zinc-700 text-zinc-200 border border-white/10'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                            }`}
                          >
                            {Icon && <Icon className="h-3.5 w-3.5" />}
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
                        className="text-left p-4 bg-zinc-900/70 hover:bg-zinc-800/70 border border-white/5 hover:border-white/10 rounded-md transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                                {template.name}
                              </h4>
                              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs font-mono">
                                {template.category}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 mb-2 leading-relaxed">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                              <span>Uses:</span>
                              <span className="font-mono">
                                {template.exampleVariables.map(v => `{{${v}}}`).join(', ')}
                              </span>
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 rotate-[-90deg] transition-colors flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <Search className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
                      <p className="text-sm text-zinc-500 mb-1">No templates match your search</p>
                      <p className="text-xs text-zinc-600 mb-4">Try a different search term or category</p>
                      <button
                        onClick={() => {
                          setTemplateSearchQuery('')
                          setTemplateCategoryFilter('all')
                        }}
                        className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API ACCESS MODAL - Simplified (output columns & webhook moved to main UI) */}
      {showAdvancedSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAdvancedSettingsModal(false)} tabIndex={-1}>
          <div
            ref={advancedSettingsModalRef}
            className="bg-zinc-900 border border-white/10 rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="api-access-title"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Code className="h-5 w-5 text-zinc-400" />
                <h2 id="api-access-title" className="text-lg font-medium text-zinc-100">API Access</h2>
              </div>
              <button
                onClick={() => setShowAdvancedSettingsModal(false)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Close API access"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <p className="text-sm text-zinc-500">Use the API to integrate bulk processing with your tools</p>

                {!showApiAccess ? (
                  <button
                    onClick={handleFetchToken}
                    disabled={isFetchingToken}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFetchingToken && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{isFetchingToken ? 'Loading...' : 'Generate curl command'}</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <pre className="p-4 bg-zinc-900 border border-white/5 rounded-lg text-xs text-zinc-400 font-mono overflow-x-auto">
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : ''}/api/process \\
  -H "Authorization: Bearer ${apiToken?.slice(0, 20)}..." \\
  -H "Content-Type: application/json" \\
  -d '{"csvFilename":"data.csv","rows":[...],"prompt":"..."}'`}
                    </pre>
                    <p className="text-xs text-zinc-500">Use in n8n, Zapier, Postman, or any HTTP client to automate batch processing</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 border-t border-white/5 bg-zinc-900/50 flex-shrink-0">
              <button onClick={() => setShowAdvancedSettingsModal(false)} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-md transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KEYBOARD SHORTCUTS HELP MODAL */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowKeyboardHelp(false)} tabIndex={-1}>
          <div
            ref={keyboardHelpModalRef}
            className="bg-zinc-900 border border-white/10 rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="keyboard-shortcuts-title"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-blue-400" />
                <h2 id="keyboard-shortcuts-title" className="text-lg font-medium text-zinc-100">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Close keyboard shortcuts help"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <p className="text-sm text-zinc-400">Speed up your workflow with these keyboard shortcuts</p>

              <div className="space-y-4">
                {/* File Operations */}
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">File Operations</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-zinc-950/50 border border-white/5 rounded-md">
                      <div className="flex items-center gap-3">
                        <Upload className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-300">Open file picker</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <kbd className="px-2 py-1 bg-zinc-900 border border-white/10 rounded text-xs text-zinc-400 font-mono">⌘</kbd>
                        <span className="text-zinc-600">+</span>
                        <kbd className="px-2 py-1 bg-zinc-900 border border-white/10 rounded text-xs text-zinc-400 font-mono">O</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Processing */}
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Processing</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-zinc-950/50 border border-white/5 rounded-md">
                      <div className="flex items-center gap-3">
                        <Play className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-300">Test with first row</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <kbd className="px-2 py-1 bg-zinc-900 border border-white/10 rounded text-xs text-zinc-400 font-mono">⌘</kbd>
                        <span className="text-zinc-600">+</span>
                        <kbd className="px-2 py-1 bg-zinc-900 border border-white/10 rounded text-xs text-zinc-400 font-mono">T</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-950/50 border border-white/5 rounded-md">
                      <div className="flex items-center gap-3">
                        <Play className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-zinc-300">Run all rows</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <kbd className="px-2 py-1 bg-zinc-900 border border-white/10 rounded text-xs text-zinc-400 font-mono">⌘</kbd>
                        <span className="text-zinc-600">+</span>
                        <kbd className="px-2 py-1 bg-zinc-900 border border-white/10 rounded text-xs text-zinc-400 font-mono">↵</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-blue-300">Pro Tip</p>
                      <p className="text-xs text-blue-200/80 leading-relaxed">
                        Use ⌘T to test your prompt with the first row before running the full batch. This helps you verify the output format and catch any issues early.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 border-t border-white/5 bg-zinc-900/50">
              <button onClick={() => setShowKeyboardHelp(false)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE OUTPUT FIELD CONFIRMATION MODAL */}
      {fieldToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setFieldToDelete(null)} tabIndex={-1}>
          <div
            ref={deleteConfirmationModalRef}
            className="bg-zinc-900 border border-white/10 rounded-lg shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="delete-field-title"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <h2 id="delete-field-title" className="text-lg font-medium text-zinc-100">Delete Output Field?</h2>
              </div>
              <button
                onClick={() => setFieldToDelete(null)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-300">
                Are you sure you want to delete the output field <span className="font-mono text-blue-400">{fieldToDelete}</span>?
              </p>
              <p className="text-xs text-zinc-500">
                This action cannot be undone. You&apos;ll need to manually add it back if you change your mind.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5 bg-zinc-900/50">
              <button
                onClick={() => setFieldToDelete(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-md transition-colors"
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
          </div>
        </div>
      )}
    </div>
  )
}
