/**
 * ABOUTME: Single-page bulk processor - power-user optimized interface
 * ABOUTME: Full-width layout, keyboard shortcuts, inline results, no wizard steps
 */

'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  Upload, FileText, Play, CheckCircle,
  X, ChevronDown, HelpCircle,
  Search, Filter, AlertTriangle, Sparkles, RotateCcw, Save
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
import { useContextStorage } from '@/hooks/useContextStorage'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logError } from '@/lib/errors'
import { generateExportFilename } from '@/lib/export-filename'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { TEMPLATE_CATEGORIES, type PromptTemplate } from '@/lib/constants/promptTemplates'
import { EmptyState } from '@/components/ui/empty-state'
import { useSavedPrompts, type SavedPrompt } from '@/hooks/useSavedPrompts'
import { saveCSVFile, restoreCSVFile, clearCSVFile } from '@/lib/storage/csv-storage'
import { useContextFiles } from '@/hooks/useContextFiles'
import { getGoogleAccessToken, getStoredGoogleToken, storeGoogleToken, isGoogleTokenValid, clearGoogleToken } from '@/lib/auth/google-sheets'
import { flattenBatchResultsForExport } from '@/lib/export'
import { ScheduleWidget } from '@/components/schedules/ScheduleWidget'
import { DisabledButtonTooltip } from '@/components/ui/disabled-button-tooltip'
import { getProcessAllDisabledReason, getTestDisabledReason } from '@/lib/validation-helpers'
import { ValidationSummary } from '@/components/ui/validation-summary'
import { useMobile } from '@/hooks/useMobile'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function BulkProcessor() {
  // === FILE STATE ===
  const fileUpload = useFileUpload()
  const csvParser = useCSVParser()
  const batchProcessor = useBatchProcessor()


  // === JOB CONTEXT PERSISTENCE ===
  const { saveContext, restoreContext, clearContext, loadContext } = useJobContext()
  const [hasRestoredContext, setHasRestoredContext] = useState(false)

  // === COMPANY CONTEXT ===
  const { context: contextVariables } = useContextStorage()
  const { uploadFile: uploadContextFile } = useContextFiles()

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
  const [templateTab, setTemplateTab] = useState<'templates' | 'saved'>('templates')
  const { prompts: savedPrompts, recordUsage } = useSavedPrompts()


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
  
  // Mobile detection
  const { isMobile } = useMobile()
  
  // Task and Output don't persist state - always start closed
  // On mobile, start with sections open for better UX
  const [promptSectionOpen, setPromptSectionOpen] = useState(isMobile)
  const [outputSettingsSectionOpen, setOutputSettingsSectionOpen] = useState(isMobile)
  
  // Auto-expand Prompt section when CSV is uploaded (all devices)
  useEffect(() => {
    if (csvParser.csvData && !promptSectionOpen) {
      // Small delay to ensure smooth UX - let user see CSV upload success first
      const timer = setTimeout(() => {
        setPromptSectionOpen(true)
      }, 300)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [csvParser.csvData, promptSectionOpen])
  
  // Auto-expand Output section when prompt is set (mobile only for better UX)
  useEffect(() => {
    if (isMobile && prompt && !outputSettingsSectionOpen) {
      const timer = setTimeout(() => {
        setOutputSettingsSectionOpen(true)
      }, 500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isMobile, prompt, outputSettingsSectionOpen])
  
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
      // First, try to restore input file (CSV or Google Sheets)
      const savedContext = loadContext()
      const inputSource = savedContext?.inputSource || 'csv'
      
      if (inputSource === 'google_sheets' && savedContext?.googleSheetsId) {
        // Restore Google Sheets
        try {
          setIsUploading(true)
          const sheetId = savedContext.googleSheetsId
          const url = savedContext.googleSheetsUrl || `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
          
          // Fetch sheet data from API
          const response = await fetch('/api/google-sheets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'fetch',
              spreadsheetId: sheetId,
              range: 'A1:Z1000',
            }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.values && data.values.length > 0) {
              // Get sheet name from metadata if available
              let sheetName = `google-sheet-${sheetId.substring(0, 8)}`
              try {
                const metadataResponse = await fetch('/api/google-sheets', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'getMetadata',
                    spreadsheetId: sheetId,
                  }),
                })
                
                if (metadataResponse.ok) {
                  const metadata = await metadataResponse.json()
                  if (metadata.title) {
                    sheetName = metadata.title
                  }
                }
              } catch {
                // Ignore metadata fetch errors
              }

              // Convert to ParsedCSV format
              const { convertSheetsToCSV } = await import('@/lib/google-sheets-utils')
              const parsedCSV = convertSheetsToCSV(data.values, sheetName)
              parsedCSV.googleSheetsUrl = url
              parsedCSV.googleSheetsId = sheetId
              
              // Set parsed data
              csvParser.setParsedData(parsedCSV)
            }
          }
        } catch (err) {
          // Silent failure - restore failed
        } finally {
          setIsUploading(false)
        }
      } else {
        // Restore CSV file from IndexedDB
        const csvFilename = savedContext?.csvFilename
        const restoredFile = await restoreCSVFile(csvFilename)
        
        if (restoredFile) {
          // File found - upload and parse it
          try {
            await fileUpload.uploadFile(restoredFile)
            await csvParser.parseFile(restoredFile)
          } catch (err) {
            // Silent failure - restore failed
          }
        }
      }

      // Now restore job context (after file is loaded if it exists)
      const currentCsvFilename = fileUpload.file?.name || csvParser.csvData?.filename || savedContext?.csvFilename
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

  // Check if user needs onboarding on mount (only once)
  useEffect(() => {
    // Only check on initial mount, not on every state change
    if (typeof window === 'undefined') return undefined
    
    const hasSeenOnboarding = localStorage.getItem('bulk-gpt-onboarding-seen')
    const defaultPrompt = 'Write a bio for {{name}} at {{company}}'
    const isDefaultPrompt = prompt === defaultPrompt || !prompt.trim()
    
    // Show onboarding for new users: no CSV uploaded, default/empty prompt, and haven't seen onboarding
    if (!hasSeenOnboarding && !csvParser.csvData && isDefaultPrompt) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        setShowOnboarding(true)
      }, 500)
      return () => clearTimeout(timer)
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount - prompt and csvParser.csvData checked inside

  // === PROCESSING STATE ===
  const [isTesting, setIsTesting] = useState(false)
  const [testStartTime, setTestStartTime] = useState<number | undefined>(undefined)
  const [processingStartTime, setProcessingStartTime] = useState<number | undefined>(undefined)
  const [isUploading, setIsUploading] = useState(false)
  const [exportStartTime, setExportStartTime] = useState<number | undefined>(undefined)
  void exportStartTime // Prevent unused variable error (used for future timing analytics)

  /**
   * Error Display Strategy (P1 UX Issue #5 - Error Redundancy):
   * - Critical/blocking errors (user cannot proceed): Use setError() for persistent banner
   * - Transient/non-blocking errors (can retry): Use toast.error() for temporary notification
   * - Never show the same error in both banner AND toast
   *
   * Critical errors: File upload failures, CSV parsing errors, Google Sheets loading errors,
   *                  variable validation errors, test/process failures
   * Transient errors: Export failures, retry failures, save context failures
   */
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

        const { data, error } = await supabase
          .from('batch_results')
          .select('input_tokens, output_tokens')
          .eq('batch_id', batchProcessor.batchId!)

        if (error) {
          console.error('Error fetching tokens:', error)
          return
        }

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
        console.error('Error fetching token totals:', err)
        // Silent failure - tokens will just not show
      }
    }

    // Fetch immediately
    fetchTokenTotals()
    
    // Poll for updates while processing (every 2 seconds)
    // Also poll when not processing but batchId exists (every 5 seconds) to catch updates
    const pollInterval = batchProcessor.isProcessing ? 2000 : 5000
    const interval = setInterval(fetchTokenTotals, pollInterval)
    return () => clearInterval(interval)
  }, [batchProcessor.batchId, batchProcessor.isProcessing])

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
  const variableValidation = useVariableValidation(prompt, csvParser.csvData, selectedInputColumns, contextVariables)

  // === FORMAT CONTEXT FOR API ===
  const formatContextString = useCallback((): string => {
    const parts: string[] = []
    
    // Core Business Context
    if (contextVariables.tone) parts.push(`Tone: ${contextVariables.tone}`)
    if (contextVariables.valueProposition) parts.push(`Value Proposition: ${contextVariables.valueProposition}`)
    if (contextVariables.icp) parts.push(`ICP: ${contextVariables.icp}`)
    if (contextVariables.productDescription) parts.push(`Product Description: ${contextVariables.productDescription}`)
    if (contextVariables.products && contextVariables.products.length > 0) {
      parts.push(`Products: ${Array.isArray(contextVariables.products) ? contextVariables.products.join(', ') : contextVariables.products}`)
    }
    if (contextVariables.targetCountries) parts.push(`Target Countries: ${contextVariables.targetCountries}`)
    if (contextVariables.targetIndustries) parts.push(`Target Industries: ${contextVariables.targetIndustries}`)
    if (contextVariables.competitors) parts.push(`Competitors: ${contextVariables.competitors}`)
    if (contextVariables.complianceFlags) parts.push(`Compliance: ${contextVariables.complianceFlags}`)
    if (contextVariables.marketingGoals && Array.isArray(contextVariables.marketingGoals) && contextVariables.marketingGoals.length > 0) {
      parts.push(`Marketing Goals: ${contextVariables.marketingGoals.join(', ')}`)
    }
    
    // Company Information
    if (contextVariables.companyName) parts.push(`Company Name: ${contextVariables.companyName}`)
    if (contextVariables.companyWebsite) parts.push(`Company Website: ${contextVariables.companyWebsite}`)
    
    // Contact & Social
    if (contextVariables.contactEmail) parts.push(`Contact Email: ${contextVariables.contactEmail}`)
    if (contextVariables.contactPhone) parts.push(`Contact Phone: ${contextVariables.contactPhone}`)
    if (contextVariables.linkedInUrl) parts.push(`LinkedIn: ${contextVariables.linkedInUrl}`)
    if (contextVariables.twitterUrl) parts.push(`Twitter: ${contextVariables.twitterUrl}`)
    if (contextVariables.githubUrl) parts.push(`GitHub: ${contextVariables.githubUrl}`)
    
    // GTM Classification
    if (contextVariables.gtmPlaybook) parts.push(`GTM Playbook: ${contextVariables.gtmPlaybook}`)
    if (contextVariables.productType) parts.push(`Product Type: ${contextVariables.productType}`)
    
    return parts.join('\n')
  }, [contextVariables])

  // === REPLACE CONTEXT VARIABLES IN PROMPT ===
  const replaceContextVariables = useCallback((promptText: string): string => {
    let replacedPrompt = promptText
    
    // Replace {{context.variableName}} with actual values
    // Core Business Context
    if (contextVariables.tone) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.tone\}\}/g, contextVariables.tone)
    }
    if (contextVariables.valueProposition) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.valueProposition\}\}/g, contextVariables.valueProposition)
    }
    if (contextVariables.icp) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.icp\}\}/g, contextVariables.icp)
    }
    if (contextVariables.productDescription) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.productDescription\}\}/g, contextVariables.productDescription)
    }
    if (contextVariables.products) {
      const productsStr = Array.isArray(contextVariables.products) 
        ? contextVariables.products.join(', ') 
        : contextVariables.products
      replacedPrompt = replacedPrompt.replace(/\{\{context\.products\}\}/g, productsStr)
    }
    if (contextVariables.targetCountries) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.targetCountries\}\}/g, contextVariables.targetCountries)
    }
    if (contextVariables.targetIndustries) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.targetIndustries\}\}/g, contextVariables.targetIndustries)
    }
    if (contextVariables.competitors) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.competitors\}\}/g, contextVariables.competitors)
    }
    if (contextVariables.complianceFlags) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.complianceFlags\}\}/g, contextVariables.complianceFlags)
    }
    if (contextVariables.marketingGoals && Array.isArray(contextVariables.marketingGoals)) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.marketingGoals\}\}/g, contextVariables.marketingGoals.join(', '))
    }
    
    // Company Information
    if (contextVariables.companyName) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.companyName\}\}/g, contextVariables.companyName)
    }
    if (contextVariables.companyWebsite) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.companyWebsite\}\}/g, contextVariables.companyWebsite)
    }
    
    // Contact & Social
    if (contextVariables.contactEmail) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.contactEmail\}\}/g, contextVariables.contactEmail)
    }
    if (contextVariables.contactPhone) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.contactPhone\}\}/g, contextVariables.contactPhone)
    }
    if (contextVariables.linkedInUrl) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.linkedInUrl\}\}/g, contextVariables.linkedInUrl)
    }
    if (contextVariables.twitterUrl) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.twitterUrl\}\}/g, contextVariables.twitterUrl)
    }
    if (contextVariables.githubUrl) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.githubUrl\}\}/g, contextVariables.githubUrl)
    }
    
    // GTM Classification
    if (contextVariables.gtmPlaybook) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.gtmPlaybook\}\}/g, contextVariables.gtmPlaybook)
    }
    if (contextVariables.productType) {
      replacedPrompt = replacedPrompt.replace(/\{\{context\.productType\}\}/g, contextVariables.productType)
    }
    
    return replacedPrompt
  }, [contextVariables])

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
        csvFilename: fileUpload.file?.name || csvParser.csvData?.filename,
        csvColumnCount: csvParser.csvData?.columns.length,
        googleSheetsUrl: csvParser.csvData?.googleSheetsUrl,
        googleSheetsId: csvParser.csvData?.googleSheetsId,
        inputSource: csvParser.csvData?.googleSheetsId ? 'google_sheets' : 'csv',
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
    csvParser.csvData?.filename,
    csvParser.csvData?.googleSheetsId,
    csvParser.csvData?.googleSheetsUrl,
    saveContext,
  ])

  // === BATCH COMPLETION HANDLER ===
  // Clear test state when batch completes and show success feedback
  const [previousProcessingState, setPreviousProcessingState] = useState(false)
  
  useEffect(() => {
    // Track when processing completes
    if (previousProcessingState && !batchProcessor.isProcessing && displayResults.length > 0) {
      const successCount = displayResults.filter(r => r.status === 'completed').length
      const errorCount = displayResults.filter(r => r.status === 'failed').length
      const totalCount = displayResults.length
      
      if (isTesting) {
        // Test completed
        setIsTesting(false)
        setTestStartTime(undefined)
        if (successCount > 0) {
          toast.success('Test completed', {
            description: 'Review the result below. Click "Process All" to process all rows.',
            id: 'test-complete'
          })
        }
      } else if (successCount === totalCount) {
        // All rows succeeded - celebrate!
        toast.success('🎉 Batch completed successfully!', {
          description: `All ${totalCount} rows processed successfully. Ready to export.`,
          id: 'batch-complete-success',
          duration: 6000,
        })
        // Trigger success animation
        document.body.classList.add('batch-success-celebration')
        setTimeout(() => {
          document.body.classList.remove('batch-success-celebration')
        }, 2000)
      } else if (successCount > 0) {
        // Partial success
        toast.success('Batch completed', {
          description: `${successCount} succeeded, ${errorCount} failed out of ${totalCount} rows`,
          id: 'batch-complete-partial',
          duration: 5000,
        })
      }
    }
    
    setPreviousProcessingState(batchProcessor.isProcessing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchProcessor.isProcessing, displayResults, isTesting, previousProcessingState])

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

      // Save CSV file to IndexedDB and update context (always save, not just after restoration)
      if (parsed) {
        // Save file to IndexedDB for persistence
        await saveCSVFile(uploadedFile)
        
        // Save CSV filename to context
        saveContext({
          csvFilename: uploadedFile.name,
          csvColumnCount: parsed.columns.length,
          inputSource: 'csv',
          googleSheetsUrl: undefined,
          googleSheetsId: undefined,
        })
        
        // Success feedback
        toast.success('CSV uploaded successfully', {
          description: `${parsed.totalRows} rows • ${parsed.columns.length} columns ready to process`,
          duration: 4000,
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
  }, [csvParser, fileUpload, saveContext])

  // === GOOGLE SHEETS DATA LOADED ===
  const handleGoogleSheetsDataLoaded = useCallback((parsedCSV: ParsedCSV) => {
    setIsUploading(true) // Set loading state while processing
    setError(null)
    
    try {
      // Set parsed data directly (bypassing file upload)
      csvParser.setParsedData(parsedCSV)
      
      // Save Google Sheets metadata to context for persistence
      saveContext({
        googleSheetsUrl: parsedCSV.googleSheetsUrl,
        googleSheetsId: parsedCSV.googleSheetsId,
        csvFilename: parsedCSV.filename,
        csvColumnCount: parsedCSV.columns.length,
        inputSource: 'google_sheets',
      })
      
      // Track analytics
      trackEvent(ANALYTICS_EVENTS.FILE_UPLOADED, {
        fileName: parsedCSV.filename,
        fileSize: 0, // Google Sheets don't have file size
        source: 'google_sheets',
      })

      toast.success(`Imported "${parsedCSV.filename}" from Google Sheets`)
    } catch (err) {
      const baseMessage = err instanceof Error ? err.message : 'Failed to process Google Sheet data'
      // Provide more actionable error messages
      let actionableMessage = baseMessage
      if (baseMessage.includes('permission') || baseMessage.includes('access')) {
        actionableMessage = `${baseMessage} Please ensure the Google Sheet is shared with your account and try again.`
      } else if (baseMessage.includes('not found') || baseMessage.includes('invalid')) {
        actionableMessage = `${baseMessage} Please check the Google Sheets URL and ensure it's correct.`
      } else if (baseMessage.includes('network') || baseMessage.includes('fetch')) {
        actionableMessage = `${baseMessage} Check your internet connection and try again.`
      }
      // Critical blocking error - show in banner only (persistent)
      setError(actionableMessage)
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: 'googleSheetsDataLoaded',
      })
      // Note: Not showing toast for critical errors - banner provides persistent feedback
    } finally {
      setIsUploading(false)
    }
  }, [csvParser, saveContext])

  // === CLEAR DATA HANDLER ===
  const handleClearData = useCallback(() => {
    csvParser.clearData()
    fileUpload.clearFile()
    setSelectedInputColumns([])
    // Clear any stored CSV file from IndexedDB
    const csvFilename = fileUpload.file?.name || csvParser.csvData?.filename
    if (csvFilename) {
      clearCSVFile(csvFilename).catch(() => {
        // Silent failure - clear failed
      })
    }
    // Clear Google Sheets metadata from context
    saveContext({
      googleSheetsUrl: undefined,
      googleSheetsId: undefined,
      inputSource: 'csv',
    })
  }, [csvParser, fileUpload, saveContext])

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

  // Keyboard shortcut for help: Cmd+Shift+? (which is mod+shift+/)
  // Also handle mod+? as fallback
  useHotkeys('mod+shift+/', (e) => {
    e.preventDefault()
    setShowKeyboardHelp(true)
  }, { enableOnFormTags: true, enableOnContentEditable: true })
  
  // Alternative: mod+? (Cmd+? on Mac, Ctrl+? on Windows)
  useHotkeys('mod+/', (e) => {
    // Only trigger if shift is not pressed (to avoid conflict with mod+shift+/)
    if (!e.shiftKey) {
      e.preventDefault()
      setShowKeyboardHelp(true)
    }
  }, { enableOnFormTags: true, enableOnContentEditable: true })

  // Keyboard shortcut for prompt templates: Cmd+B
  useHotkeys('mod+b', (e) => {
    e.preventDefault()
    setShowTemplateModal(true)
  }, { enableOnFormTags: true, enableOnContentEditable: true })

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
      setError(`Cannot test: Your prompt uses ${variableValidation.missing.join(', ')}, but these columns don't exist in your CSV. Either remove these variables from your prompt or add these columns to your CSV file.`)
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

      // Replace context variables in prompt before sending
      const processedPrompt = replaceContextVariables(prompt)

      // Use unified batch processor with testMode flag
      await batchProcessor.startBatch({
        csvData: testCSVData,
          prompt: processedPrompt,
          context: formatContextString(),
        outputColumns: outputFields,
          tools: selectedTools.length > 0 ? selectedTools : undefined,
        testMode: true, // Enable test mode to bypass batch limit
        selectedInputColumns: selectedInputColumns.length > 0 ? selectedInputColumns : undefined,
      })

      // Note: batchId is set synchronously by startBatch after API call
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      // Provide more actionable error messages
      let actionableMessage = message
      if (message.includes('variable') || message.includes('column')) {
        actionableMessage = `Test failed: ${message}. Check that all variables in your prompt ({{variable}}) match column names in your CSV.`
      } else if (message.includes('token') || message.includes('limit')) {
        actionableMessage = `Test failed: ${message}. Try reducing the prompt length or wait a moment and try again.`
      } else if (message.includes('network') || message.includes('fetch')) {
        actionableMessage = `Test failed: Connection error. Check your internet connection and try again.`
      } else {
        actionableMessage = `Test failed: ${message}. Please check your prompt and CSV data, then try again.`
      }
      setError(actionableMessage)
      setIsTesting(false)
      setTestStartTime(undefined)
    }
  }, [csvParser.csvData, prompt, outputFields, variableValidation, batchProcessor, selectedTools, selectedInputColumns, formatContextString, replaceContextVariables])

  // === PROCESS ALL ===
  const handleProcess = useCallback(async () => {
    if (!csvParser.csvData || !prompt) return

    // Variable validation check
    if (!variableValidation.isValid) {
      setError(`Cannot process: Your prompt uses ${variableValidation.missing.join(', ')}, but these columns don't exist in your CSV. Either remove these variables from your prompt or add these columns to your CSV file.`)
      return
    }

    // Clear test state when starting full batch
    setIsTesting(false)
    setTestStartTime(undefined)

    // Replace context variables in prompt before sending
    const processedPrompt = replaceContextVariables(prompt)

    // Start batch processing using hook
    await batchProcessor.startBatch({
      csvData: csvParser.csvData,
      prompt: processedPrompt,
      context: formatContextString(),
      outputColumns: outputFields, // Always use JSON mode for structured output
      tools: selectedTools.length > 0 ? selectedTools : undefined,
      testMode: false, // Full batch
      selectedInputColumns: selectedInputColumns.length > 0 ? selectedInputColumns : undefined,
    })
  }, [csvParser.csvData, prompt, outputFields, batchProcessor, variableValidation, selectedTools, selectedInputColumns, formatContextString, replaceContextVariables])

  // Track which rows have been auto-retried to prevent infinite loops
  const [autoRetriedRows, setAutoRetriedRows] = useState<Set<string>>(new Set())
  const retryingRowsRef = useRef<Set<string>>(new Set())

  // === RETRY FAILED ROW ===
  const handleRetryRow = useCallback(async (failedResult: { id: string; input: Record<string, string>; output: string; status: string; error?: string }, isAutoRetry = false) => {
    if (!csvParser.csvData || !prompt) {
      if (!isAutoRetry) {
        toast.error('Cannot retry', {
          description: 'Missing CSV data or prompt'
        })
      }
      return
    }

    // Prevent duplicate retries
    if (retryingRowsRef.current.has(failedResult.id)) {
      return
    }

    retryingRowsRef.current.add(failedResult.id)

    // Replace context variables in prompt before sending
    const processedPrompt = replaceContextVariables(prompt)

    // Create a single-row CSV for retry
    const retryCSVData = {
      ...csvParser.csvData,
      rows: [{ data: failedResult.input, rowIndex: 0 }],
      totalRows: 1,
    }

    try {
      // Use batch processor with testMode to bypass batch limit
      await batchProcessor.startBatch({
        csvData: retryCSVData,
        prompt: processedPrompt,
        context: formatContextString(),
        outputColumns: outputFields,
        tools: selectedTools.length > 0 ? selectedTools : undefined,
        testMode: true, // Use test mode to bypass batch limit for retries
        selectedInputColumns: selectedInputColumns.length > 0 ? selectedInputColumns : undefined,
      })

      if (!isAutoRetry) {
        toast.success('Retrying row', {
          description: 'Processing failed row again...'
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (!isAutoRetry) {
        // Provide more actionable error messages
        let actionableMessage = message
        if (message.includes('variable') || message.includes('column')) {
          actionableMessage = `${message} Check that all variables match your CSV columns.`
        } else if (message.includes('token') || message.includes('limit')) {
          actionableMessage = `${message} Try reducing your prompt length or wait a moment.`
        }
        toast.error('Retry failed', {
          description: actionableMessage
        })
      }
    } finally {
      retryingRowsRef.current.delete(failedResult.id)
    }
  }, [csvParser.csvData, prompt, outputFields, batchProcessor, selectedTools, selectedInputColumns, formatContextString, replaceContextVariables])

  // === AUTO-RETRY FAILED ROWS ===
  useEffect(() => {
    // Only auto-retry during active batch processing
    if (!batchProcessor.isProcessing || !batchProcessor.batchId) {
      return
    }

    // Find failed rows that haven't been retried yet
    const failedRows = displayResults.filter(
      result => result.status === 'failed' && 
      !autoRetriedRows.has(result.id) &&
      !retryingRowsRef.current.has(result.id)
    )

    // Auto-retry each failed row once (with small delay between retries)
    failedRows.forEach(async (failedRow, index) => {
      setAutoRetriedRows(prev => new Set(prev).add(failedRow.id))
      // Stagger retries to avoid overwhelming the API (1 second delay per row)
      await new Promise(resolve => setTimeout(resolve, (index + 1) * 1000))
      await handleRetryRow(failedRow, true) // true = isAutoRetry
    })
  }, [displayResults, batchProcessor.isProcessing, batchProcessor.batchId, autoRetriedRows, handleRetryRow])

  // Clear auto-retried tracking when starting a new batch
  useEffect(() => {
    if (batchProcessor.isProcessing && batchProcessor.batchId) {
      // Keep tracking during processing
    } else if (!batchProcessor.batchId) {
      // Clear tracking when batch is cleared
      setAutoRetriedRows(new Set())
      retryingRowsRef.current.clear()
    }
  }, [batchProcessor.batchId, batchProcessor.isProcessing])

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
      const startTime = Date.now()
      setExportStartTime(startTime)
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
      } catch (fetchError) {
        // Fallback to database
        const supabase = createClient()
        if (supabase) {
          try {
            const { data: dbResults } = await supabase
              .from('batch_results')
              .select('input_data, output_data, status, error_message, input_tokens, output_tokens, model')
              .eq('batch_id', currentBatchId)
              .order('id', { ascending: true })
            
            results = dbResults || []
          } catch {
            // Silent failure - will show error toast below
          }
        }
      }

      if (!results || results.length === 0) {
        // Check if batch actually exists and its status
        try {
          const batchStatusUrl = `/api/batch/${currentBatchId}-status/status`
          const batchStatusResponse = await fetch(batchStatusUrl)
          
          if (batchStatusResponse.ok) {
            const batchStatus = await batchStatusResponse.json()
            const isComplete = batchStatus.status === 'completed' || batchStatus.status === 'failed' || batchStatus.status === 'completed_with_errors'
            
            if (isComplete) {
              toast.error('Export Failed', {
                description: `Batch completed (status: ${batchStatus.status}) but no results were found. The batch may have failed or produced no output.`,
                id: `export-gsheets-${currentBatchId}`
              })
            } else {
              toast.warning('No Results Available', {
                description: `The batch is still processing (status: ${batchStatus.status}). Please wait a few moments and try again.`,
                id: `export-gsheets-${currentBatchId}`
              })
            }
          } else {
            toast.error('Export Failed', {
              description: `Unable to fetch batch status (HTTP ${batchStatusResponse.status}).`,
              id: `export-gsheets-${currentBatchId}`
            })
          }
        } catch (statusError) {
          toast.error('Export Failed', {
            description: `Unable to fetch batch results. Error: ${statusError instanceof Error ? statusError.message : 'Unknown error'}.`,
            id: `export-gsheets-${currentBatchId}`
          })
        }
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
        const errorMessage = errorData.error || errorData.message || 'Failed to create Google Sheet'
        const errorCode = errorData.code
        const enableUrl = errorData.enableUrl
        const projectId = errorData.projectId
        
        if (createResponse.status === 401) {
          // Token expired, clear and retry
          clearGoogleToken()
          throw new Error('Google authentication expired. Please try again to re-authenticate.')
        }
        
        if (createResponse.status === 403) {
          // Check if it's specifically about API not being enabled
          if (errorCode === 'API_NOT_ENABLED' || enableUrl) {
            const enableMessage = enableUrl 
              ? `Google Drive API is not enabled for project ${projectId || 'your project'}. Enable it here: ${enableUrl}`
              : 'Google Drive API is not enabled. Please enable it in Google Cloud Console.'
            throw new Error(enableMessage)
          }
          
          throw new Error('Permission denied. Please ensure Google Drive API is enabled and you have granted the necessary permissions.')
        }
        
        if (createResponse.status === 400) {
          throw new Error(`Invalid request: ${errorMessage}`)
        }
        
        throw new Error(errorMessage)
      }

      const responseData = await createResponse.json()
      const spreadsheetUrl = responseData.spreadsheetUrl || responseData.url

      if (!spreadsheetUrl) {
        throw new Error('Google Sheet was created but no URL was returned. Please check your Google Drive.')
      }

      // Open Google Sheet in new tab
      window.open(spreadsheetUrl, '_blank')

      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1)
      toast.success('Google Sheet Created!', {
        description: `Opened in new tab (${responseData.rowsWritten || sheetData.length - 1} rows) in ${elapsedSeconds}s`,
        id: `export-gsheets-${currentBatchId}`
      })
      setExportStartTime(undefined)
    } catch (err) {
      setExportStartTime(undefined)
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
      const startTime = Date.now()
      setExportStartTime(startTime)
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
      } catch {
        // Silent failure - fallback to database
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

      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1)
      toast.success('Download Complete', {
        description: `Successfully downloaded ${results.length} result rows in ${elapsedSeconds}s.`,
        id: `export-${currentBatchId}`
      })
      setExportStartTime(undefined)
    } catch (err) {
      setExportStartTime(undefined)
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

  const applyTemplate = useCallback((template: PromptTemplate | SavedPrompt) => {
    setPrompt(template.prompt)
    setShowTemplateModal(false)

    // Track usage for saved prompts
    if ('usage_count' in template) {
      recordUsage(template.id)
    }

    // Track template usage (only for built-in templates)
    if ('category' in template) {
    trackEvent(ANALYTICS_EVENTS.BULK_TEMPLATE_USED, {
      templateId: template.id,
      templateName: template.name,
      category: template.category
    })
    }
    
    // Success feedback
    toast.success('Template applied', {
      description: `"${template.name}" loaded into prompt editor`,
      duration: 3000,
    })
  }, [recordUsage])

  // === SAVE FILES TO CONTEXT ===
  const handleSaveInputToContext = useCallback(async () => {
    if (!fileUpload.file) {
      toast.error('No file to save')
      return
    }

    try {
      await uploadContextFile(fileUpload.file, 'input')
      toast.success('File saved to context', {
        description: `${fileUpload.file.name} is now available for use in prompts`,
        id: 'save-input-context'
      })
    } catch (error) {
      logError(error instanceof Error ? error : new Error('Failed to save input file to context'), {
        source: 'BulkProcessor/handleSaveInputToContext'
      })
      toast.error('Failed to save file', {
        description: 'Could not save file to context. Please try again.',
        id: 'save-input-context'
      })
    }
  }, [fileUpload.file, uploadContextFile])

  const handleSaveOutputToContext = useCallback(async () => {
    const results = displayResults
    if (!results || results.length === 0) {
      toast.warning('No results to save')
      return
    }

    try {
      // Convert results to CSV format
      const csvRows: string[] = []
      
      // Get all unique keys from results
      const allKeys = new Set<string>()
      results.forEach(row => {
        if (row.output) {
          try {
            const output = typeof row.output === 'string' 
              ? JSON.parse(row.output) 
              : row.output
            if (typeof output === 'object' && output !== null) {
              Object.keys(output).forEach(key => allKeys.add(key))
            }
          } catch {
            // If output is not JSON, treat as plain text
            allKeys.add('output')
          }
        }
        if (row.input) {
          Object.keys(row.input).forEach(key => allKeys.add(key))
        }
      })

      const headers = Array.from(allKeys)
      csvRows.push(headers.join(','))

      // Add data rows
      results.forEach(row => {
        const values = headers.map(header => {
          if (row.output) {
            try {
              const output = typeof row.output === 'string'
                ? JSON.parse(row.output)
                : row.output
              if (typeof output === 'object' && output !== null && output[header] !== undefined) {
                return `"${String(output[header]).replace(/"/g, '""')}"`
              } else if (header === 'output') {
                return `"${String(row.output).replace(/"/g, '""')}"`
              }
            } catch {
              // If output is not JSON, treat as plain text
              if (header === 'output') {
                return `"${String(row.output).replace(/"/g, '""')}"`
              }
            }
          }
          if (row.input && row.input[header] !== undefined) {
            return `"${String(row.input[header]).replace(/"/g, '""')}"`
          }
          return ''
        })
        csvRows.push(values.join(','))
      })

      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const file = new File([blob], `output-${batchProcessor.batchId || Date.now()}.csv`, { type: 'text/csv' })
      
      await uploadContextFile(file, 'output')
      toast.success('Results saved to context', {
        description: `${results.length} rows saved and available for use in prompts`,
        id: 'save-output-context'
      })
    } catch (error) {
      logError(error instanceof Error ? error : new Error('Failed to save output file to context'), {
        source: 'BulkProcessor/handleSaveOutputToContext'
      })
      toast.error('Failed to save results', {
        description: 'Could not save results to context. Please try again.',
        id: 'save-output-context'
      })
    }
  }, [displayResults, batchProcessor.batchId, uploadContextFile])

  // === KEYBOARD NAVIGATION: ESC TO CLOSE MODALS & CLEAR ERRORS ===
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
        } else if (error || fileUpload.error || csvParser.error || batchProcessor.error) {
          // Clear errors on ESC if no modals are open
          setError(null)
          fileUpload.clearError?.()
          csvParser.clearError?.()
          // batchProcessor doesn't have clearError, errors are managed via state
        }
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleEscapeKey)

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [fieldToDelete, showKeyboardHelp, showAdvancedSettingsModal, showTemplateModal, error, fileUpload, csvParser, batchProcessor])

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
        <div className="flex-shrink-0 border-b border-border bg-muted/20 px-3 xs:px-4 sm:px-5 md:px-6 lg:px-7 xl:px-8 py-2 xs:py-2.5 sm:py-1.5 md:py-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex flex-col xs:flex-row items-start xs:items-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 flex-1 min-w-0">
              {usage && (
                <>
                  <span className="text-muted-foreground">
                    {/* Mobile: Stack on separate lines for clarity */}
                    <span className="sm:hidden flex flex-col gap-0.5">
                      <span>{usage.batchesToday}/{usage.dailyBatchLimit} batches today</span>
                    </span>
                    {/* Desktop: Single line */}
                    <span className="hidden sm:flex items-center gap-1.5">
                      <span>{usage.batchesToday}/{usage.dailyBatchLimit} batches today</span>
                    </span>
                  </span>
                  {usage.batchesToday >= usage.dailyBatchLimit && (
                    <>
                      <span className="hidden sm:inline text-muted-foreground"> • </span>
                      <span className="text-muted-foreground/80">
                        Resets {(() => {
                          const now = new Date()
                          const tomorrow = new Date(now)
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          tomorrow.setHours(0, 0, 0, 0)
                          const hoursUntilReset = Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60))
                          return hoursUntilReset === 24 ? 'tomorrow' : `in ${hoursUntilReset}h`
                        })()}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-2 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center -mr-1 touch-manipulation"
              onClick={dismissBetaBanner}
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Main Content */}
      <div className="h-full flex-1 overflow-hidden min-h-0">
        <div className="h-full border border-border overflow-hidden bg-card">
          {/* Mobile: Tabs layout */}
          <div className="md:hidden h-full flex flex-col">
            <Tabs defaultValue="configure" className="h-full flex flex-col">
              <TabsList className="w-full rounded-none border-b border-border bg-secondary/50">
                <TabsTrigger value="configure" className="flex-1">
                  Configure
                </TabsTrigger>
                <TabsTrigger value="results" className="flex-1 flex items-center gap-2">
                  Results
                  {displayResults.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                      {displayResults.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="configure" className="flex-1 overflow-y-auto mt-0 p-4 space-y-4 bg-secondary">
                {/* Error Banner */}
                {(fileUpload.error || csvParser.error || batchProcessor.error || error) && (
                  <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400 font-medium break-words flex-1">
                        {fileUpload.error || csvParser.error || batchProcessor.error || error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Simplified mobile message */}
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md border border-border">
                  💡 For full configuration options, use desktop view. Mobile view shows essential controls only.
                </div>

                {/* CSV Upload */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Upload CSV</h3>
                  <DataInputTabs
                    isParsing={csvParser.isParsing}
                    csvData={csvParser.csvData}
                    fileName={fileUpload.file?.name}
                    isUploading={isUploading}
                    onFileUpload={handleFileUpload}
                    onGoogleSheetsDataLoaded={handleGoogleSheetsDataLoaded}
                    onClearData={handleClearData}
                    selectedInputColumns={selectedInputColumns}
                    onInputColumnsChange={setSelectedInputColumns}
                  />
                </div>

                {/* Basic Prompt Input */}
                {csvParser.csvData && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Prompt</h3>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Enter your prompt here..."
                      className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground resize-y"
                    />
                    {!variableValidation.isValid && (
                      <p className="text-xs text-red-400">Missing columns: {variableValidation.missing.join(', ')}</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {csvParser.csvData && (
                  <div className="flex gap-2 pt-2">
                    <button
                      disabled={!prompt || isTesting || !variableValidation.isValid}
                      onClick={handleTest}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-secondary hover:bg-secondary/80 transition-colors rounded-md text-sm font-medium text-foreground border border-border disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isTesting ? <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Play className="h-4 w-4" />}
                      <span>Test</span>
                    </button>
                    <button
                      disabled={!prompt || batchProcessor.isProcessing || !variableValidation.isValid}
                      onClick={handleProcess}
                      className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-primary hover:bg-primary/90 transition-colors rounded-md text-sm font-medium text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {batchProcessor.isProcessing ? <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Play className="h-4 w-4" />}
                      <span>Process All ({csvParser.csvData.totalRows})</span>
                    </button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="results" className="flex-1 overflow-hidden mt-0 bg-muted/20">
                {displayResults.length > 0 || batchProcessor.isProcessing || isTesting ? (
                  <ResultsTable
                    results={displayResults}
                    columns={selectedInputColumns.length > 0 ? selectedInputColumns : (csvParser.csvData?.columns || [])}
                    outputColumns={outputFields}
                    progress={batchProcessor.progress ?? undefined}
                    processingStartTime={processingStartTime}
                    onExport={handleExport}
                    onExportToGoogleSheets={handleExportToGoogleSheets}
                    onSaveToContext={handleSaveOutputToContext}
                    onRetry={handleRetryRow}
                    isTesting={isTesting}
                    testStartTime={testStartTime}
                    testEstimatedSeconds={isTesting && prompt ? getTimeEstimate(1, prompt.length, selectedTools.length).seconds : undefined}
                    totalInputTokens={tokenTotals.input}
                    totalOutputTokens={tokenTotals.output}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full p-6">
                    <EmptyState
                      icon={csvParser.csvData ? Play : FileText}
                      title={csvParser.csvData ? 'Ready to process' : 'No results yet'}
                      description={
                        csvParser.csvData
                          ? `Click "Test" to try with the first row, or "Process All" to process all ${csvParser.csvData.totalRows} rows`
                          : 'Upload a CSV file and configure your prompt to get started. Results will appear here after processing.'
                      }
                      size="sm"
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop: Side-by-side panels */}
          <div className="hidden md:grid h-full md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 overflow-hidden">
            {/* LEFT PANEL - Configuration */}
            <div className="h-full border-r border-border bg-secondary flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-3 xs:p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8 space-y-3 xs:space-y-3.5 sm:space-y-4 md:space-y-5 lg:space-y-6 min-h-0">
                {/* Error - Use V2 error if available */}
                {(fileUpload.error || csvParser.error || batchProcessor.error || error) && (
                  <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md space-y-2 animate-slide-in-up">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="text-xs sm:text-sm text-red-400 font-medium break-words">
                          {fileUpload.error || csvParser.error || batchProcessor.error || error}
                        </p>
                        {/* Enhanced error recovery suggestions */}
                        {(() => {
                          const errorLower = (fileUpload.error || csvParser.error || batchProcessor.error || error || '').toLowerCase()
                          
                          if (errorLower.includes('limit reached') || errorLower.includes('limit resets') || errorLower.includes('daily limit')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">What you can do:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Wait for the limit to reset (shown in banner above)</li>
                                  <li>Review and delete old batches in Dashboard</li>
                                  <li>Contact support to upgrade your plan</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('variable') || errorLower.includes('column') || errorLower.includes('missing')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Check that all variables in your prompt match CSV column names exactly</li>
                                  <li>Use the &quot;Quick fix&quot; button in the prompt section to remove missing variables</li>
                                  <li>Or add the missing columns to your CSV file</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('file type') || errorLower.includes('not supported') || (errorLower.includes('file') && errorLower.includes('csv'))) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Export your spreadsheet as CSV format</li>
                                  <li>In Excel: File → Save As → CSV (Comma delimited)</li>
                                  <li>In Google Sheets: File → Download → CSV</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('too large') || errorLower.includes('size') || errorLower.includes('10mb')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Split your CSV into smaller files (max 10MB each)</li>
                                  <li>Remove unnecessary columns to reduce file size</li>
                                  <li>Process files separately and combine results</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('empty') || errorLower.includes('0 bytes') || errorLower.includes('no data')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Check that your CSV file contains data rows</li>
                                  <li>Ensure the file wasn&apos;t corrupted during download</li>
                                  <li>Try re-exporting from your spreadsheet application</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          if (errorLower.includes('google sheets') || errorLower.includes('spreadsheet') || errorLower.includes('permission')) {
                            return (
                              <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                                <p className="font-medium mb-1.5">How to fix:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                  <li>Ensure the Google Sheet is publicly accessible (View access)</li>
                                  <li>Or share it with the service account email</li>
                                  <li>Try downloading as CSV and uploading directly</li>
                                </ul>
                              </div>
                            )
                          }
                          
                          // Generic recovery for unknown errors
                          return (
                            <div className="text-xs text-red-300/80 mt-2 pt-2 border-t border-red-500/20">
                              <p className="font-medium mb-1.5">Try these steps:</p>
                              <ul className="list-disc list-inside space-y-1 ml-1">
                                <li>Refresh the page and try again</li>
                                <li>Check your internet connection</li>
                                <li>If the problem persists, contact support</li>
                              </ul>
                            </div>
                          )
                        })()}
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
                        className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-red-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        aria-label="Reset stuck batch to allow new processing"
                      >
                        Reset Stuck Batch
                      </button>
                    )}
                  </div>
                )}

                {/* Validation Summary - Shows all validation errors at once */}
                {/* Only show validation errors when CSV is uploaded - don't show errors for template prompt before user uploads CSV */}
                {csvParser.csvData && prompt && !variableValidation.isValid && variableValidation.missing.length > 0 && (
                  <ValidationSummary
                    errors={[
                      {
                        field: 'prompt',
                        message: `Prompt uses ${variableValidation.missing.map(v => `{{${v}}}`).join(', ')} but these columns don't exist in your CSV. Remove these variables or add these columns.`,
                        scrollToField: () => {
                          setPromptSectionOpen(true)
                          setTimeout(() => {
                            const textarea = document.querySelector('[data-testid="prompt-textarea"]') as HTMLTextAreaElement
                            textarea?.focus()
                            textarea?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }, 100)
                        },
                      },
                    ]}
                    title="Fix these issues to continue"
                    dismissible={false}
                    className="mb-4"
                  />
                )}

                {/* Unused columns warning - Hidden to reduce noise */}

                {/* WORKFLOW STEPS - Hidden to reduce visual noise, onboarding handles guidance */}

                {/* INPUT SECTION */}
                <CollapsibleSection
                  title="Input"
                  open={dataInputSection.isOpen}
                  onOpenChange={dataInputSection.setIsOpen}
                  className="border border-border rounded-md bg-card"
                  triggerClassName="hover:bg-accent/20"
                  contentClassName="px-0 pb-0"
                  status={csvParser.csvData ? 'ready' : undefined}
                  statusMessage={csvParser.csvData ? 'Ready' : undefined}
                >
                  <div className="space-y-3">
                    <DataInputTabs
                isParsing={csvParser.isParsing}
                csvData={csvParser.csvData}
                fileName={fileUpload.file?.name}
                isUploading={isUploading}
                onFileUpload={handleFileUpload}
                onGoogleSheetsDataLoaded={handleGoogleSheetsDataLoaded}
                onClearData={handleClearData}
                selectedInputColumns={selectedInputColumns}
                    onInputColumnsChange={setSelectedInputColumns}
                  />
                    {fileUpload.file && csvParser.csvData && (
                    <div className="px-4 pb-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSaveInputToContext}
                        className="w-full text-xs"
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        Save Input File to Context
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleSection>

              {/* TASK SECTION */}
              <CollapsibleSection
                title="Task"
                open={promptSectionOpen}
                onOpenChange={setPromptSectionOpen}
                className="border border-border rounded-md bg-card"
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
                className="border border-border rounded-md bg-card"
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
            </div>

          {/* AI OPTIMIZATION - Global, above actions */}
          {csvParser.csvData && prompt && (
            <div className="flex-shrink-0 border-t border-border bg-background/50">
              <CollapsibleSection
                title="AI Optimization"
                open={aiAssistantSection.isOpen}
                onOpenChange={aiAssistantSection.setIsOpen}
                className="border-0 bg-transparent"
                triggerClassName="hover:bg-accent/20 px-4 py-2"
                contentClassName="px-4 pb-3"
              >
                <div className="space-y-3">
                  {/* Optimization selector - Toggle switches */}
                  <div className="flex items-center gap-4">
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
                    className="w-full px-3 py-2 h-9 bg-primary/10 hover:bg-primary/15 border border-primary/20 hover:border-primary/30 rounded-md text-xs font-medium text-foreground transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={
                      !csvParser.csvData 
                        ? 'Upload a CSV file to enable AI optimization' 
                        : !prompt 
                          ? 'Enter a prompt to enable AI optimization'
                          : isOptimizing
                            ? 'AI optimization in progress'
                            : 'Optimize configuration with AI'
                    }
                    aria-busy={isOptimizing}
                  >
                    {isOptimizing ? (
                      <>
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
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
          <div className="flex-shrink-0 p-3 xs:p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8 pb-safe xs:pb-3 sm:pb-3.5 md:pb-4 lg:pb-5 border-t border-border/50 bg-background/80 backdrop-blur-sm sticky bottom-0 z-10">
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between max-w-4xl mx-auto gap-2.5 xs:gap-3 sm:gap-3.5 md:gap-4 lg:gap-5">
              {/* Left side - Reset and Keyboard Help */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowResetConfirmation(true)}
                        className="flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded transition-colors touch-manipulation"
                        aria-label="Reset configuration"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Reset configuration
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowKeyboardHelp(true)}
                        className="flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded transition-colors touch-manipulation"
                        aria-label="View keyboard shortcuts"
                        title="Keyboard shortcuts (⌘?)"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6} collisionPadding={8}>
                      Keyboard shortcuts (⌘?)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* Primary action buttons */}
              <div className="flex flex-col xs:flex-row gap-2.5 xs:gap-3 sm:gap-3.5 md:gap-4 items-stretch flex-1 justify-end">
                <TooltipProvider delayDuration={0}>
                  <DisabledButtonTooltip
                    reason={getTestDisabledReason({
                      hasCSV: !!csvParser.csvData,
                      hasPrompt: !!prompt,
                      variableValidation,
                      isProcessing: isTesting,
                    }) || 'Test with first row (⌘T)'}
                  >
                    <button
                      disabled={!csvParser.csvData || !prompt || isTesting || !variableValidation.isValid}
                      onClick={handleTest}
                      className="flex-1 flex items-center justify-center gap-2 px-3 xs:px-4 sm:px-5 py-2.5 xs:py-2.5 sm:py-2 md:py-2.5 min-h-[44px] xs:min-h-[42px] sm:min-h-[40px] md:min-h-[38px] bg-secondary/50 border border-border/50 rounded-md text-xs xs:text-sm sm:text-sm md:text-base font-medium text-foreground/80 hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
                      aria-label="Test prompt with first CSV row"
                    >
                      {isTesting ? <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
                      <span className="whitespace-nowrap">Test</span>
                    </button>
                  </DisabledButtonTooltip>
                  <DisabledButtonTooltip
                    reason={getProcessAllDisabledReason({
                      hasCSV: !!csvParser.csvData,
                      hasPrompt: !!prompt,
                      variableValidation,
                      isProcessing: batchProcessor.isProcessing,
                    }) || `Process all ${csvParser.csvData?.totalRows || 0} rows${timeEstimate ? ` (~${timeEstimate.formatted})` : ''} (⌘Enter)`}
                  >
                    <button
                      disabled={!csvParser.csvData || !prompt || batchProcessor.isProcessing || !variableValidation.isValid}
                      onClick={handleProcess}
                      className="flex-[2] flex items-center justify-center gap-2 px-3 xs:px-4 sm:px-5 md:px-6 py-2.5 xs:py-2.5 sm:py-2 md:py-2.5 min-h-[44px] xs:min-h-[42px] sm:min-h-[40px] md:min-h-[38px] bg-primary hover:bg-primary/90 active:bg-primary/95 transition-colors duration-150 rounded-md text-xs xs:text-sm sm:text-sm md:text-base text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                      data-testid="run-button"
                      aria-label={`Process all ${csvParser.csvData?.totalRows || 0} rows with AI${timeEstimate ? ` (estimated ${timeEstimate.formatted})` : ''}`}
                    >
                      {batchProcessor.isProcessing ? <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
                      <span className="whitespace-nowrap flex items-center gap-1.5">
                        <span>Process All</span>
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
                  </DisabledButtonTooltip>
                  <ScheduleWidget
                    onScheduleCreated={() => {
                      toast.success('Schedule created successfully')
                    }}
                    prompt={prompt}
                    outputFields={outputFields.map(name => ({ name }))}
                    selectedTools={selectedTools}
                    selectedInputColumns={selectedInputColumns}
                    csvData={csvParser.csvData ? {
                      columns: csvParser.csvData.columns,
                      rows: csvParser.csvData.rows.map(r => r.data),
                      filename: csvParser.csvData.filename,
                    } : undefined}
                    csvFilename={csvParser.csvData?.filename}
                    disabled={false}
                  />
                </TooltipProvider>
              </div>
            </div>
            </div>

            {/* RIGHT PANEL - Results */}
            <div className="h-full overflow-hidden flex flex-col bg-muted/20">
              {displayResults.length > 0 || batchProcessor.isProcessing || isTesting ? (
            <ResultsTable
              results={displayResults}
              columns={selectedInputColumns.length > 0 ? selectedInputColumns : (csvParser.csvData?.columns || [])}
              outputColumns={outputFields}
              progress={batchProcessor.progress ?? undefined}
              processingStartTime={processingStartTime}
              onExport={handleExport}
              onExportToGoogleSheets={handleExportToGoogleSheets}
              onSaveToContext={handleSaveOutputToContext}
              onRetry={handleRetryRow}
              isTesting={isTesting}
              testStartTime={testStartTime}
              testEstimatedSeconds={isTesting && prompt ? getTimeEstimate(1, prompt.length, selectedTools.length).seconds : undefined}
              totalInputTokens={tokenTotals.input}
              totalOutputTokens={tokenTotals.output}
            />
          ) : (
            <EmptyState
              icon={csvParser.csvData ? Play : FileText}
              title={csvParser.csvData ? 'Ready to process' : 'No results yet'}
              description={
                csvParser.csvData
                  ? `Click "Test" to try with the first row, or "Process All" to process all ${csvParser.csvData.totalRows} rows`
                  : 'Upload a CSV file and configure your prompt to get started. Results will appear here after processing.'
              }
              size="sm"
            >
              {csvParser.csvData && (
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>💡 Tip: Use &quot;Test&quot; to verify your prompt before processing all rows</p>
                </div>
              )}
            </EmptyState>
          )}
          </div>
          </div>
        </div>
      </div>


      {/* TEMPLATE GALLERY MODAL */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false)
          setTemplateTab('templates')
          setTemplateSearchQuery('')
          setTemplateCategoryFilter('all')
        }}
        title="Template Gallery"
        titleIcon={FileText}
        size="lg"
        ariaLabelledBy="template-gallery-title"
      >
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setTemplateTab('templates')}
              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
                templateTab === 'templates'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setTemplateTab('saved')}
              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
                templateTab === 'saved'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Saved ({savedPrompts.length})
            </button>
          </div>

          {/* Templates Tab */}
          {templateTab === 'templates' && (
            <>
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
                className="w-full pl-10 pr-3 py-2 bg-secondary/50 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-border transition-all"
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
                  className="text-left p-4 bg-secondary/50 hover:bg-accent/50 border border-border hover:border-border rounded-md transition-all group"
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
            </>
          )}

          {/* Saved Prompts Tab */}
          {templateTab === 'saved' && (
            <div className="grid grid-cols-1 gap-3">
              {savedPrompts.length > 0 ? (
                savedPrompts
                  .filter((p) => {
                    if (!templateSearchQuery) return true
                    const query = templateSearchQuery.toLowerCase()
                    return (
                      p.name.toLowerCase().includes(query) ||
                      p.prompt.toLowerCase().includes(query) ||
                      (p.description && p.description.toLowerCase().includes(query)) ||
                      (p.tags && p.tags.some((tag) => tag.toLowerCase().includes(query)))
                    )
                  })
                  .map((savedPrompt) => (
                    <button
                      key={savedPrompt.id}
                      onClick={() => applyTemplate(savedPrompt)}
                      className="text-left p-4 bg-secondary/50 hover:bg-accent/50 border border-border hover:border-border rounded-md transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
                              {savedPrompt.name}
                            </h4>
                            {savedPrompt.tags && savedPrompt.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {savedPrompt.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-accent text-muted-foreground rounded text-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {savedPrompt.description && (
                            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                              {savedPrompt.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Used {savedPrompt.usage_count} time{savedPrompt.usage_count !== 1 ? 's' : ''}</span>
                            {savedPrompt.last_used_at && (
                              <>
                                <span>•</span>
                                <span>
                                  Last used {new Date(savedPrompt.last_used_at).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground rotate-[-90deg] transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  ))
              ) : (
                <div className="p-12 text-center">
                  <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">No saved prompts yet</p>
                  <p className="text-xs text-muted-foreground">
                    Save prompts from the prompt editor to use them here
                  </p>
                </div>
              )}
            </div>
          )}
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

            {/* Prompt & Templates */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prompt & Templates</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-md">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Browse prompt templates</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">⌘</kbd>
                    <span className="text-muted-foreground">+</span>
                    <kbd className="px-2 py-1 bg-secondary border border-border rounded text-xs text-muted-foreground font-mono">B</kbd>
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
                    <span className="text-sm text-foreground">Process All ({csvParser.csvData?.totalRows || 0} rows)</span>
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


    </div>
  )
}
