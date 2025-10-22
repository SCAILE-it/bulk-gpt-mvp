/**
 * ABOUTME: Single-page bulk processor - power-user optimized interface
 * ABOUTME: Full-width layout, keyboard shortcuts, inline results, no wizard steps
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  Upload, FileText, Play, CheckCircle, XCircle,
  Loader2, Download, Plus, X
} from 'lucide-react'
import { parseCSV } from '@/lib/csv-parser'
import type { ParsedCSV } from '@/lib/types'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { features } from '@/lib/features'
import { useFileUpload, type RecentFile } from '@/hooks/useFileUpload'
import { useCSVParser } from '@/hooks/useCSVParser'
import { useBatchProcessor } from '@/hooks/useBatchProcessor'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const RECENT_FILES_KEY = 'bulk-gpt-recent-files'

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
  const currentRecentFiles = useV2FileUpload ? v2FileUpload.recentFiles : recentFiles
  const currentError = useV2FileUpload ? v2FileUpload.error : (useV2CSVParser ? v2CSVParser.error : (useV2BatchProcessor ? v2BatchProcessor.error : null))

  // === CONFIG STATE ===
  const [prompt, setPrompt] = useState('Write a bio for {{name}} at {{company}}')
  const [outputFields, setOutputFields] = useState<string[]>(['bio'])
  const [newField, setNewField] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')

  // === API ACCESS ===
  const [apiToken, setApiToken] = useState<string | null>(null)
  const [showApiAccess, setShowApiAccess] = useState(false)

  // === PROCESSING STATE ===
  const [batchId, setBatchId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Use V2 or V1 processing state
  // const currentBatchId = useV2BatchProcessor ? v2BatchProcessor.batchId : batchId
  // const currentIsProcessing = useV2BatchProcessor ? v2BatchProcessor.isProcessing : isProcessing
  // const currentIsTesting = useV2BatchProcessor ? v2BatchProcessor.isTesting : isTesting
  // const currentResults = useV2BatchProcessor ? v2BatchProcessor.results : results
  // const currentProgress = useV2BatchProcessor ? v2BatchProcessor.progress : null

  // === LOAD RECENT FILES ===
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_FILES_KEY)
    if (stored) {
      try {
        setRecentFiles(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to load recent files:', e)
      }
    }
  }, [])

  // === FILE UPLOAD ===
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    // V2: Use new hooks if feature flags enabled
    if (useV2FileUpload && useV2CSVParser) {
      await v2FileUpload.uploadFile(uploadedFile)
      
      // If successful, parse CSV
      if (!v2FileUpload.error && v2FileUpload.file) {
        await v2CSVParser.parseFile(uploadedFile)
        
        // Add to recent if parse succeeded
        if (!v2CSVParser.error && v2CSVParser.csvData) {
          v2FileUpload.addToRecent(uploadedFile, v2CSVParser.csvData.totalRows)
        }
      }
      return
    }
    
    // V1: Legacy implementation
    setError(null)

    // Validate
    if (!uploadedFile.name.endsWith('.csv')) {
      setError('Only CSV files are accepted')
      return
    }
    if (uploadedFile.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum 10MB')
      return
    }
    if (uploadedFile.size === 0) {
      setError('File is empty')
      return
    }

    try {
      // Parse CSV
      const parsed = await parseCSV(uploadedFile)
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

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse CSV'
      setError(errorMessage)
      
      // Track parse error
      trackEvent(ANALYTICS_EVENTS.FILE_PARSE_ERROR, {
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        error: errorMessage,
      })
    }
  }, [recentFiles, useV2FileUpload, useV2CSVParser, v2FileUpload, v2CSVParser])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) handleFileUpload(acceptedFiles[0])
    },
    multiple: false,
    accept: { 'text/csv': ['.csv'] },
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
    setOutputFields(outputFields.filter(f => f !== field))
  }, [outputFields])

  // === TEST (1 ROW) ===
  const handleTest = useCallback(async () => {
    if (!currentCsvData || !prompt) return

    setIsTesting(true)
    setError(null)

    try {
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
      // eslint-disable-next-line no-console
      console.log('Test result:', data)
      alert('Test successful! Check console for output.')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setIsTesting(false)
    }
  }, [currentCsvData, prompt, outputFields, webhookUrl])

  // === PROCESS ALL ===
  const handleProcess = useCallback(async () => {
    if (!currentCsvData || !prompt) return

    setIsProcessing(true)
    setError(null)
    setResults([])

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

      // Initialize results
      const initialResults: Result[] = currentCsvData.rows.map((row, index) => ({
        id: `${data.batchId}-${index}`,
        input: row.data,
        output: '',
        status: 'pending' as const,
      }))
      setResults(initialResults)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed')
      setIsProcessing(false)
    }
  }, [currentCsvData, prompt, outputFields, webhookUrl])

  // === STREAMING (EventSource) ===
  useEffect(() => {
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
      const { completed, total } = JSON.parse(e.data)
      // Progress tracking (can be displayed in UI)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`Progress: ${completed}/${total}`)
      }
    })

    // Handle completion
    eventSource.addEventListener('complete', (e) => {
      const { status } = JSON.parse(e.data)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('Batch complete:', status)
      }
      setIsProcessing(false)
      eventSource.close()
    })

    // Handle errors
    eventSource.addEventListener('error', (e) => {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Stream error:', e)
      }
      setError('Stream connection failed')
      setIsProcessing(false)
      eventSource.close()
    })

    // Cleanup on unmount
    return () => {
      eventSource.close()
    }
  }, [batchId, isProcessing])

  // === EXPORT ===
  const handleExport = useCallback(() => {
    if (results.length === 0) return

    const csv = [
      // Header
      [...Object.keys(results[0].input), ...outputFields, 'status'].join(','),
      // Rows
      ...results.map(r => [
        ...Object.values(r.input).map(v => `"${v}"`),
        ...outputFields.map(() => `"${r.output}"`),
        r.status,
      ].join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `results-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [results, outputFields])

  // === FETCH API TOKEN ===
  const handleFetchToken = useCallback(async () => {
    try {
      const response = await fetch('/api/tokens')
      if (!response.ok) throw new Error('Failed to fetch token')
      const data = await response.json()
      setApiToken(data.token)
      setShowApiAccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API token')
    }
  }, [])

  // === RENDER ===
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Beta Banner */}
      <div className="bg-blue-600/10 border-b border-blue-500/20 px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[11px] font-medium rounded">BETA</span>
            <p className="text-xs text-blue-300">
              Limited to 1,000 rows per batch • 5 batches per day • 
              <a href="#" className="ml-1 underline hover:text-blue-200">Request full access →</a>
            </p>
          </div>
          <button className="text-blue-400 hover:text-blue-300" onClick={() => {}}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/95 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-950/60">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <h1 className="text-[15px] font-medium tracking-tight">Bulk Processor</h1>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-white/5 rounded text-[11px]">⌘O</kbd>
                <span>Upload</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-white/5 rounded text-[11px]">⌘T</kbd>
                <span>Test</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-white/5 rounded text-[11px]">⌘↵</kbd>
                <span>Run</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentCsvData && (
              <div className="text-xs text-zinc-500">
                {currentCsvData.totalRows} rows • {currentCsvData.columns.length} cols
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="grid grid-cols-[400px_1fr] h-[calc(100vh-49px)]">
        {/* LEFT SIDEBAR - Configuration */}
        <div className="border-r border-white/5 overflow-y-auto bg-zinc-900">
          <div className="p-6 space-y-6">
            {/* Error - Use V2 error if available */}
            {(currentError || error) && (
              <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                {currentError || error}
              </div>
            )}

            {/* FILE UPLOAD */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">Dataset</label>
              <div
                {...getRootProps()}
                className={`border border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-500/5'
                    : currentFile
                    ? 'border-white/10 bg-zinc-900/70'
                    : 'border-white/5 hover:border-white/10 hover:bg-zinc-900/30'
                }`}
              >
                <input {...getInputProps()} ref={fileInputRef} />
                <Upload className="h-5 w-5 mx-auto mb-2 text-zinc-600" />
                <p className="text-sm text-zinc-400">
                  {isDragActive ? 'Drop here' : currentFile ? currentFile.name : 'Drop CSV file'}
                </p>
              </div>
            </div>

            {/* RECENT */}
            {currentRecentFiles.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">Recent</label>
                <div className="space-y-1">
                  {currentRecentFiles.slice(0, 3).map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-900/70 rounded cursor-pointer group"
                      onClick={() => {
                        // TODO: Implement recent file loading
                        if (process.env.NODE_ENV === 'development') {
                          // eslint-disable-next-line no-console
                          console.log('Recent file:', f.name)
                        }
                      }}
                    >
                      <FileText className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-400 truncate font-mono">{f.name}</p>
                        <p className="text-[11px] text-zinc-600">{f.rowCount} rows</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="h-px bg-zinc-800/50" />

            {/* PROMPT */}
            <div className="space-y-2">
              <label htmlFor="prompt" className="text-xs font-medium text-zinc-400">
                Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full min-h-[120px] px-3 py-2 bg-zinc-900/70 border border-white/5 rounded-md text-sm text-zinc-300 font-mono resize-y focus:outline-none focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:shadow-[0_0_4px_rgba(59,130,246,0.4)] focus:border-blue-500/50 transition-all duration-150 ease-out"
                placeholder="Write a bio for {{name}} at {{company}}"
              />
              {csvData && (
                <p className="text-[11px] text-zinc-600">
                  Variables: {csvData.columns.map(h => `{{${h}}}`).join(', ')}
                </p>
              )}
            </div>

            {/* OUTPUT SCHEMA */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">Output Fields</label>
              <div className="flex flex-wrap gap-1.5">
                {outputFields.map(field => (
                  <div key={field} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-white/5 rounded text-sm text-zinc-300 font-mono">
                    {field}
                    <button
                      onClick={() => removeOutputField(field)}
                      className="hover:text-red-400 transition-colors"
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
                    className="w-24 px-2 py-1 bg-zinc-900/70 border border-white/5 rounded text-sm text-zinc-300 font-mono focus:outline-none focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:shadow-[0_0_4px_rgba(59,130,246,0.4)] focus:border-blue-500/50 transition-all duration-150 ease-out"
                  />
                  <button
                    onClick={addOutputField}
                    className="p-1 hover:bg-zinc-800 rounded transition-colors"
                  >
                    <Plus className="h-3 w-3 text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>

            <div className="h-px bg-zinc-800/50" />

            {/* WEBHOOK */}
            <div className="space-y-2">
              <label htmlFor="webhook" className="text-xs font-medium text-zinc-400">
                Webhook <span className="text-zinc-600">(optional)</span>
              </label>
              <input
                id="webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.n8n.cloud/..."
                className="w-full px-3 py-1.5 bg-zinc-900/70 border border-white/5 rounded-md text-sm text-zinc-300 font-mono focus:outline-none focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:shadow-[0_0_4px_rgba(59,130,246,0.4)] focus:border-blue-500/50 transition-all duration-150 ease-out"
              />
              <p className="text-[11px] text-zinc-600">POST results on completion</p>
            </div>

            {/* API ACCESS */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">API Access</label>
              {!showApiAccess ? (
                <button
                  onClick={handleFetchToken}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Show curl command →
                </button>
              ) : (
                <div className="space-y-2">
                  <pre className="p-3 bg-zinc-900 border border-white/5 rounded-lg text-[11px] text-zinc-400 font-mono overflow-x-auto">
{`curl -X POST ${window.location.origin}/api/process \\
  -H "Authorization: Bearer ${apiToken?.slice(0, 20)}..." \\
  -H "Content-Type: application/json" \\
  -d '{"csvFilename":"data.csv","rows":[...]}'`}
                  </pre>
                  <p className="text-[11px] text-zinc-600">Use in n8n, Zapier, Postman</p>
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS - Fixed Bottom */}
          <div className="sticky bottom-0 p-6 border-t border-white/5 bg-zinc-950/95 backdrop-blur-md">
            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={!csvData || !prompt || isTesting}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 border border-white/5 rounded-md text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                <span>Test</span>
              </button>
              <button
                onClick={handleProcess}
                disabled={!csvData || !prompt || isProcessing}
                className="flex-[2] flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 hover:shadow-[inset_0_1px_0_rgba(96,165,250,0.2)] transition-all duration-150 ease-out rounded-md text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                <span>Run {csvData ? `(${csvData.totalRows})` : ''}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Results */}
        <div className="overflow-hidden flex flex-col">
          {results.length > 0 ? (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-zinc-400">Results</span>
                  <span className="text-[11px] text-zinc-600">
                    {results.filter(r => r.status === 'completed').length}/{results.length} completed
                  </span>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-white/5 rounded-md text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export</span>
                </button>
              </div>

              {/* Results Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-md border-b border-white/5">
                    <tr>
                      <th className="px-4 py-2 text-left w-8"></th>
                      {csvData?.columns.map(h => (
                        <th key={h} className="px-4 py-2 text-left font-medium text-zinc-500">{h}</th>
                      ))}
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, i) => (
                      <tr
                        key={result.id}
                        className={`
                          relative border-b border-white/5
                          hover:bg-zinc-800/40
                          transition-colors duration-150
                          cursor-pointer
                          ${i % 2 === 0 ? 'bg-zinc-900/40' : 'bg-transparent'}
                        `}
                      >
                        {/* Processing accent bar */}
                        {result.status === 'processing' && (
                          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500/50" />
                        )}

                        <td className="px-4 py-3">
                          {result.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {result.status === 'failed' && <XCircle className="h-4 w-4 text-red-400" />}
                          {result.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                          {result.status === 'pending' && <div className="h-4 w-4 rounded-full border border-zinc-700" />}
                        </td>
                        {csvData?.columns.map(h => (
                          <td key={h} className="px-4 py-3 text-zinc-400 font-mono text-xs">
                            {result.input[h] || '—'}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-zinc-300">
                          {result.error ? (
                            <span className="text-red-400 text-[11px]">{result.error}</span>
                          ) : result.output ? (
                            <span className="line-clamp-2 text-[11px] leading-relaxed">{result.output}</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3 max-w-sm">
                <div className="mx-auto w-12 h-12 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-zinc-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-1">No results yet</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    Upload a CSV, configure your prompt, and click Run to start processing
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
