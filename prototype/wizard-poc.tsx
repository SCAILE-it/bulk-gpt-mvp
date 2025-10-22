'use client'

/**
 * THROWAWAY PROTOTYPE - NOT PRODUCTION CODE
 *
 * Quick & dirty wizard to validate UX before full implementation
 * - No tests
 * - No database (just localStorage)
 * - No auto-columns
 * - Ugly but functional
 *
 * Purpose: Prove the 3-step flow is better than 50:50 split
 * Delete this file after validation
 */

import { useState } from 'react'
import { Upload, ArrowRight, ArrowLeft } from 'lucide-react'

type WizardStep = 1 | 2 | 3

export default function WizardPrototype() {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [csvData, setCSVData] = useState<any>(null)
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<'test' | 'full'>('test')
  const [results, setResults] = useState<any[]>([])

  // Simple CSV parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n')
      const headers = lines[0].split(',')
      const rows = lines.slice(1).map(line => {
        const values = line.split(',')
        return headers.reduce((obj: any, header, i) => {
          obj[header] = values[i]
          return obj
        }, {})
      })

      setCSVData({ headers, rows, filename: file.name })
      localStorage.setItem('wizard-csv', JSON.stringify({ headers, rows, filename: file.name }))
    }
    reader.readAsText(file)
  }

  const handleStartProcessing = () => {
    // Mock processing
    setTimeout(() => {
      const mockResults = csvData.rows.slice(0, mode === 'test' ? 5 : csvData.rows.length).map((row: any) => ({
        ...row,
        ai_output: `Mock AI analysis for ${row[csvData.headers[0]]}`
      }))
      setResults(mockResults)
      localStorage.setItem('wizard-results', JSON.stringify(mockResults))
    }, 2000)
    setCurrentStep(3)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="border-b p-4">
        <div className="flex items-center justify-center gap-8">
          <StepIndicator num={1} label="Upload" active={currentStep === 1} completed={currentStep > 1} />
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator num={2} label="Configure" active={currentStep === 2} completed={currentStep > 2} />
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator num={3} label="Results" active={currentStep === 3} completed={false} />
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto p-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Upload CSV File</h1>

            {!csvData ? (
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block mx-auto"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="font-semibold">✓ {csvData.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {csvData.rows.length} rows • {csvData.headers.length} columns
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-2">Preview (first 5 rows):</p>
                  <div className="border rounded-lg overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {csvData.headers.map((h: string) => (
                            <th key={h} className="p-2 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.rows.slice(0, 5).map((row: any, i: number) => (
                          <tr key={i} className="border-t">
                            {csvData.headers.map((h: string) => (
                              <td key={h} className="p-2">{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Continue →
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Configure Prompt</h1>

            <div>
              <label className="block font-semibold mb-2">Your Prompt:</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-3 border rounded-lg"
                rows={6}
                placeholder="Enter your prompt here..."
              />
            </div>

            <div>
              <p className="font-semibold mb-2">Available columns:</p>
              <div className="flex flex-wrap gap-2">
                {csvData?.headers.map((col: string) => (
                  <button
                    key={col}
                    onClick={() => setPrompt(prompt + `{{${col}}}`)}
                    className="px-3 py-1 bg-muted rounded-md text-sm hover:bg-muted/80"
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Processing mode:</p>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg max-w-md">
                <button
                  onClick={() => setMode('test')}
                  className={`px-4 py-2 rounded-md ${mode === 'test' ? 'bg-primary text-primary-foreground' : 'bg-transparent'}`}
                >
                  Test (5 rows)
                </button>
                <button
                  onClick={() => setMode('full')}
                  className={`px-4 py-2 rounded-md ${mode === 'full' ? 'bg-primary text-primary-foreground' : 'bg-transparent'}`}
                >
                  Full ({csvData?.rows.length} rows)
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 border rounded-lg hover:bg-muted"
              >
                ← Back
              </button>
              <button
                onClick={handleStartProcessing}
                disabled={!prompt}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                Start Processing →
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Results</h1>

            {results.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Processing...</p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="font-semibold">✓ Completed</p>
                  <p className="text-sm text-muted-foreground">{results.length} rows processed</p>
                </div>

                <div className="border rounded-lg overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {csvData.headers.map((h: string) => (
                          <th key={h} className="p-2 text-left">{h}</th>
                        ))}
                        <th className="p-2 text-left">AI Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row: any, i: number) => (
                        <tr key={i} className="border-t">
                          {csvData.headers.map((h: string) => (
                            <td key={h} className="p-2">{row[h]}</td>
                          ))}
                          <td className="p-2 font-semibold text-primary">{row.ai_output}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-2 border rounded-lg hover:bg-muted"
                  >
                    ← Back to Edit
                  </button>
                  <button
                    onClick={() => {
                      const csv = [csvData.headers.concat(['AI Output']).join(',')]
                        .concat(results.map((r: any) => csvData.headers.map((h: string) => r[h]).concat([r.ai_output]).join(',')))
                        .join('\n')
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'results.csv'
                      a.click()
                    }}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Download CSV
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StepIndicator({ num, label, active, completed }: { num: number, label: string, active: boolean, completed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center font-semibold
        ${active ? 'bg-primary text-primary-foreground' : ''}
        ${completed ? 'bg-green-500 text-white' : ''}
        ${!active && !completed ? 'bg-muted text-muted-foreground' : ''}
      `}>
        {completed ? '✓' : num}
      </div>
      <span className={`text-sm ${active ? 'font-semibold' : ''}`}>{label}</span>
    </div>
  )
}
