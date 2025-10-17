'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Activity, Loader2, Download, Moon, Sun, X, Plus } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { AppState, ParsedCSV } from '@/lib/types'
import { CSVUpload } from '@/components/upload/csv-upload'
import { CSVPreview } from '@/components/upload/csv-preview'
import { ResultsTable } from '@/components/results/results-table'
import { ExportButton } from '@/components/export/export-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface BatchStatus {
  batchId: string
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  totalRows: number
  processedRows: number
  progressPercent: number
  results: Array<{ id: string; input: Record<string, string>; output: string; status: 'pending' | 'processing' | 'success' | 'error'; error?: string }>
  message: string
}

export default function HomePage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const [appState, setAppState] = useState<AppState>({
    currentFile: null,
    selectedTemplate: null,
    prompt: '',
    context: '',
    outputColumns: [],
    results: [],
    isProcessing: false,
    progress: {
      current: 0,
      total: 0,
      status: 'idle',
    },
  })

  const [batchId, setBatchId] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  const handleCSVUpload = (data: ParsedCSV) => {
    setAppState(prev => ({
      ...prev,
      currentFile: data,
    }))
  }

  const handlePromptChange = (prompt: string) => {
    setAppState(prev => ({
      ...prev,
      prompt,
    }))
  }

  const handleContextChange = (context: string) => {
    setAppState(prev => ({
      ...prev,
      context,
    }))
  }

  const handleClearFile = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      currentFile: null,
      prompt: '',
      context: '',
      outputColumns: [],
      results: [],
    }))
  }, [])

  const handleInsertColumn = useCallback((column: string) => {
    if (!promptRef.current) return
    
    const textarea = promptRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const before = text.substring(0, start)
    const after = text.substring(end)
    const newText = `${before}{{${column}}}${after}`
    
    // Update value
    handlePromptChange(newText)
    
    // Restore cursor position (after inserted text)
    const newCursorPos = start + column.length + 4 // {{}} = 4 chars
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [])

  const [outputColumnInput, setOutputColumnInput] = useState('')

  const handleAddOutputColumn = useCallback(() => {
    const trimmed = outputColumnInput.trim()
    if (trimmed && !appState.outputColumns.includes(trimmed)) {
      setAppState(prev => ({
        ...prev,
        outputColumns: [...prev.outputColumns, trimmed],
      }))
      setOutputColumnInput('')
    }
  }, [outputColumnInput, appState.outputColumns])

  const handleRemoveOutputColumn = useCallback((columnToRemove: string) => {
    setAppState(prev => ({
      ...prev,
      outputColumns: prev.outputColumns.filter(col => col !== columnToRemove),
    }))
  }, [])

  // Poll batch status
  const pollBatchStatus = useCallback(async (currentBatchId: string) => {
    try {
      const response = await fetch(`/api/batch/${currentBatchId}/status`)
      
      if (!response.ok) {
        console.error('Failed to fetch batch status')
        return
      }

      const data: BatchStatus = await response.json()

      setAppState(prev => ({
        ...prev,
        progress: {
          current: data.processedRows,
          total: data.totalRows,
          status: data.status,
          message: data.message,
        },
        results: data.results || [],
      }))

      // Stop polling when complete
      if (data.status === 'completed' || data.status === 'completed_with_errors' || data.status === 'failed') {
        setAppState(prev => ({
          ...prev,
          isProcessing: false,
        }))
        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
        }
      }
    } catch (error) {
      console.error('Error polling batch status:', error)
    }
  }, [pollingInterval])

  // Start polling when batch is created
  useEffect(() => {
    if (!batchId || !appState.isProcessing) return

    // Poll immediately
    pollBatchStatus(batchId)

    // Then poll every 2 seconds
    const interval = setInterval(() => {
      pollBatchStatus(batchId)
    }, 2000)

    setPollingInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [batchId, appState.isProcessing, pollBatchStatus])

  const handleProcess = async () => {
    if (!appState.currentFile || !appState.prompt) {
      return
    }

    setAppState(prev => ({
      ...prev,
      isProcessing: true,
      progress: { current: 0, total: appState.currentFile?.rows.length || 0, status: 'pending' },
      results: [],
    }))

    try {
      // Convert CSV rows to plain objects
      const csvRows = appState.currentFile.rows.map(row => row.data)

      // Call POST /api/process to create batch and start processing
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvFilename: appState.currentFile.filename,
          rows: csvRows,
          prompt: appState.prompt,
          context: appState.context,
          outputColumns: appState.outputColumns,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start batch processing')
      }

      const data = await response.json()
      
      if (data.batchId) {
        setBatchId(data.batchId)
        // Polling will start automatically via useEffect
      } else {
        throw new Error('No batch ID received')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed'
      console.error('Processing error:', errorMessage)
      setAppState(prev => ({
        ...prev,
        isProcessing: false,
      }))
    }
  }

  const progressPercent = appState.progress.total > 0 
    ? Math.round((appState.progress.current / appState.progress.total) * 100)
    : 0

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Bulk GPT</h1>
          </div>
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="rounded-lg p-2 hover:bg-muted transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Moon className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Batch process CSV data through Gemini AI (async, fire-and-forget)</p>
      </header>

      {/* Main Content - 50/50 Split with Active State Highlighting */}
      <main className="flex flex-1 overflow-hidden gap-6 p-6">
        {/* Left Panel - Inputs (Active when user is interacting) */}
        <section className={`flex w-full md:w-1/2 flex-col transition-all duration-200 rounded-lg p-4 ${
          appState.prompt || appState.currentFile 
            ? 'bg-secondary/30 border-2 border-primary/40 shadow-sm' 
            : 'bg-muted/20 border-2 border-transparent'
        }`}>
          <div className="space-y-6 overflow-y-auto">
            {/* Status Badge */}
            {(appState.prompt || appState.currentFile) && (
              <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                INPUT ACTIVE
              </div>
            )}

            {/* CSV Upload Card - Only show if no file loaded */}
            {!appState.currentFile && (
              <Card className="transition-all hover:shadow-md">
                <CardHeader>
                  <CardTitle>CSV Upload</CardTitle>
                  <CardDescription>Upload your CSV file to process</CardDescription>
                </CardHeader>
                <CardContent>
                  <CSVUpload onComplete={handleCSVUpload} />
                </CardContent>
              </Card>
            )}

            {/* CSV Loaded - Show when file exists */}
            {appState.currentFile && (
              <Card className="transition-all hover:shadow-md bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-200">
                    <div className="h-5 w-5 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
                      ✓
                    </div>
                    CSV Loaded
                  </CardTitle>
                  <CardDescription>{appState.currentFile.totalRows} rows, {appState.currentFile.columns.length} columns</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CSVPreview data={appState.currentFile} />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearFile}
                    className="w-full"
                  >
                    Upload Different File
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Prompt Input Card */}
            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle>Prompt</CardTitle>
                <CardDescription>Enter your prompt with {'{{column}}'} template variables</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt Template</Label>
                  <textarea
                    ref={promptRef}
                    id="prompt"
                    placeholder="Enter your prompt with {{column}} template variables"
                    className="w-full rounded-lg border-2 border-input bg-background p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    rows={4}
                    value={appState.prompt}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    disabled={appState.isProcessing}
                  />
                  {appState.currentFile && appState.currentFile.columns.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-xs text-muted-foreground mr-1">Available columns:</span>
                      {appState.currentFile.columns.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => handleInsertColumn(col)}
                          className="px-2 py-1 text-xs rounded-md bg-muted hover:bg-primary/10 text-foreground transition-colors border border-border"
                          title={`Click to insert {{${col}}}`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="context">Context (Optional)</Label>
                  <textarea
                    id="context"
                    placeholder="Optional context to guide the AI"
                    className="w-full rounded-lg border-2 border-input bg-background p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    rows={3}
                    value={appState.context}
                    onChange={(e) => handleContextChange(e.target.value)}
                    disabled={appState.isProcessing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="output-columns">Output Columns (Optional)</Label>
                  <div className="flex gap-2">
                    <input
                      id="output-columns"
                      type="text"
                      placeholder="e.g. summary, sentiment, keywords"
                      className="flex-1 rounded-lg border-2 border-input bg-background p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      value={outputColumnInput}
                      onChange={(e) => setOutputColumnInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddOutputColumn()
                        }
                      }}
                      disabled={appState.isProcessing}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddOutputColumn}
                      disabled={appState.isProcessing || !outputColumnInput.trim()}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {appState.outputColumns.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {appState.outputColumns.map((col) => (
                        <div
                          key={col}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20"
                        >
                          <span>{col}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOutputColumn(col)}
                            className="hover:bg-primary/20 rounded-sm transition-colors"
                            disabled={appState.isProcessing}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleProcess}
                  disabled={!appState.currentFile || !appState.prompt || appState.isProcessing}
                  className="w-full transition-all hover:shadow-lg shadow-xl ring-2 ring-primary/20"
                  size="lg"
                >
                  {appState.isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing... (you can leave this tab)
                    </>
                  ) : (
                    <>
                      <Activity className="mr-2 h-4 w-4" />
                      Start Processing
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Right Panel - Results (Active when processing/results available) */}
        <section className={`hidden md:flex w-1/2 flex-col transition-all duration-200 rounded-lg p-4 ${
          appState.isProcessing || appState.results.length > 0
            ? 'bg-secondary/30 border-2 border-primary/40 shadow-sm'
            : 'bg-muted/20 border-2 border-transparent'
        }`}>
          <div className="space-y-6 overflow-y-auto">
            {/* Status Badge */}
            {(appState.isProcessing || appState.results.length > 0) && (
              <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                RESULTS {appState.isProcessing ? 'PROCESSING' : 'READY'}
              </div>
            )}

            {/* Progress Display */}
            {appState.isProcessing && (
              <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing
                  </CardTitle>
                  <CardDescription>
                    {appState.progress.current} / {appState.progress.total} rows ({progressPercent}%)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{
                        width: `${progressPercent}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {appState.progress.message || 'Processing in the cloud...'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Results Card - Only show when NOT processing */}
            {!appState.isProcessing && (
              <Card className={appState.results.length > 0 ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : ''}>
                <CardHeader>
                  <CardTitle className={appState.results.length > 0 ? 'text-green-900 dark:text-green-200' : ''}>
                    {appState.results.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
                          ✓
                        </div>
                        Results
                      </div>
                    ) : (
                      'Results'
                    )}
                  </CardTitle>
                  <CardDescription>
                    {appState.results.length > 0 
                      ? `${appState.results.length} results available` 
                      : 'No results yet. Upload a CSV and start processing.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResultsTable results={appState.results} />
                </CardContent>
              </Card>
            )}

            {/* Export Section */}
            {appState.results.length > 0 && !appState.isProcessing && (
              <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <Download className="h-5 w-5" />
                    Download Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ExportButton results={appState.results} batchId={batchId || undefined} />
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}







