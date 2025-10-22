'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import StepUpload from '@/components/wizard/StepUpload'
import StepConfigure from '@/components/wizard/StepConfigure'
import StepResults from '@/components/wizard/StepResults'
import WizardNav from '@/components/wizard/WizardNav'
import { parseCSV } from '@/lib/csv-parser'
import type { ParsedCSV } from '@/lib/types'

// === TYPES ===
interface CSVDataFromUpload {
  file: File
  headers: string[]
  rowCount: number
  preview: string[][]
}

interface ConfigData {
  promptTemplate: string
  processingMode: 'test' | 'full'
  context?: string
  outputColumns?: string[]
}

interface Result {
  id: string
  input: Record<string, string>
  output: string
  status: string
  error?: string
}

interface APIResult {
  id: string
  input: unknown
  output: string
  status: string
  error?: string
}

interface Summary {
  total: number
  completed: number
  failed: number
}

export default function WizardPage() {
  // === STATE ===
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Ref for scrolling to top on step change
  const mainContentRef = useRef<HTMLElement>(null)

  // Step 1 data
  const [uploadedData, setUploadedData] = useState<CSVDataFromUpload | null>(null)

  // Step 2 data
  const [config, setConfig] = useState<ConfigData | null>(null)

  // Processing state
  const [batchId, setBatchId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 3 data
  const [results, setResults] = useState<Result[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, completed: 0, failed: 0 })

  // Polling
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // === NAVIGATION HANDLERS ===

  // Step 1 → Step 2
  const handleUploadNext = useCallback((data: CSVDataFromUpload) => {
    setUploadedData(data)
    setCurrentStep(2)
  }, [])

  // Step 2 → Step 3 + Start Processing
  const handleConfigureNext = useCallback(async (configData: ConfigData) => {
    if (!uploadedData) {
      setError('No CSV data found')
      return
    }

    setConfig(configData)
    setCurrentStep(3)
    setIsProcessing(true)
    setError(null)

    try {
      // STEP 1: Parse full CSV (StepUpload only gave us preview)
      const fullCSV: ParsedCSV = await parseCSV(uploadedData.file)

      // STEP 2: Create batch via API
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvFilename: fullCSV.filename,
          rows: fullCSV.rows.map(r => r.data),
          prompt: configData.promptTemplate,
          context: '',
          outputColumns: [],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create batch')
      }

      const data = await response.json()

      if (!data.batchId) {
        throw new Error('No batch ID received from API')
      }

      setBatchId(data.batchId)
      setSummary({ total: fullCSV.totalRows, completed: 0, failed: 0 })

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start processing'
      console.error('Processing error:', err)
      setError(message)
      setIsProcessing(false)
    }
  }, [uploadedData])

  // Back navigation
  const handleBackToUpload = useCallback(() => {
    setCurrentStep(1)
  }, [])

  const handleBackToConfigure = useCallback(() => {
    setCurrentStep(2)
  }, [])

  // Step navigation handler for WizardNav
  const handleStepClick = useCallback((step: number) => {
    // Only allow navigation to steps that have been visited
    if (step === 1) {
      setCurrentStep(1)
    } else if (step === 2 && uploadedData) {
      setCurrentStep(2)
    } else if (step === 3 && config) {
      setCurrentStep(3)
    }
  }, [uploadedData, config])

  // Restart wizard
  const handleRestart = useCallback(() => {
    setCurrentStep(1)
    setUploadedData(null)
    setConfig(null)
    setBatchId(null)
    setResults([])
    setSummary({ total: 0, completed: 0, failed: 0 })
    setIsProcessing(false)
    setError(null)

    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
  }, [pollingInterval])

  // === POLLING LOGIC ===

  const pollBatchStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/batch/${id}/status`)

      if (!response.ok) {
        console.error('Failed to fetch batch status')
        return
      }

      const data = await response.json()

      // Transform API results to StepResults format
      const transformedResults: Result[] = (data.results || []).map((r: APIResult) => ({
        id: r.id,
        // Keep input as object - no need to stringify
        input: typeof r.input === 'object' && r.input !== null 
          ? r.input as Record<string, string>
          : {},
        output: r.output || '',
        // Transform database status ('success', 'error') to UI status ('completed', 'failed')
        status: r.status === 'success' ? 'completed' : r.status === 'error' ? 'failed' : r.status,
        error: r.error,
      }))

      setResults(transformedResults)

      // Update summary (now using transformed status: 'completed' and 'failed')
      const completed = transformedResults.filter(r => r.status === 'completed').length
      const failed = transformedResults.filter(r => r.status === 'failed').length
      setSummary({
        total: data.totalRows || 0,
        completed,
        failed,
      })

      // Stop polling when complete
      if (data.status === 'completed' || data.status === 'completed_with_errors' || data.status === 'failed') {
        setIsProcessing(false)

        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
        }
      }
    } catch (err) {
      console.error('Error polling batch status:', err)
    }
  }, [pollingInterval])

  // Start polling when batchId is set
  useEffect(() => {
    if (!batchId || !isProcessing) return

    // Poll immediately
    pollBatchStatus(batchId)

    // Then poll every 2 seconds
    const interval = setInterval(() => {
      pollBatchStatus(batchId)
    }, 2000)

    setPollingInterval(interval)

    // Cleanup
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [batchId, isProcessing, pollBatchStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // Scroll to top on step change (smooth UX for step transitions)
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  // === RENDER ===

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Bulk GPT - Wizard</h1>
          <p className="text-sm text-muted-foreground">AI-powered batch processing in 3 easy steps</p>
        </div>
      </header>

      {/* Wizard Navigation */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto py-4">
          <WizardNav currentStep={currentStep} onStepClick={handleStepClick} />
        </div>
      </div>

      {/* Main Content */}
      <main
        ref={mainContentRef}
        className="relative h-[calc(100dvh-140px)] overflow-y-auto container mx-auto px-4 max-w-5xl pt-8"
      >
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
            <strong>Error:</strong> {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <StepUpload onNext={handleUploadNext} />
            </motion.div>
          )}

          {/* Step 2: Configure */}
          {currentStep === 2 && uploadedData && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <StepConfigure
                csvData={uploadedData}
                onNext={handleConfigureNext}
                onBack={handleBackToUpload}
              />
            </motion.div>
          )}

          {/* Step 3: Results */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
          {/* Results */}
          <StepResults
            results={results}
            summary={summary}
            onRestart={handleRestart}
            onBack={handleBackToConfigure}
            isProcessing={isProcessing}
          />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
