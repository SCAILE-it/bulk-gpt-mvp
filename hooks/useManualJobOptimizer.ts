/**
 * ABOUTME: Manual AI job optimizer - user triggers optimization with a button
 * ABOUTME: Allows editing optimized prompts and explicit acceptance before use
 */

import { useState, useCallback } from 'react'

/**
 * Output column structure from API
 */
export interface OutputColumn {
  name: string
  description: string
}

/**
 * Optimization result from API
 */
export interface OptimizationResult {
  optimizedPrompt: string
  outputColumns: OutputColumn[]
  reasoning: string
}

/**
 * Hook return type
 */
export interface UseManualJobOptimizerResult {
  optimizedPrompt: string | null
  setOptimizedPrompt: (prompt: string | null) => void
  outputColumns: OutputColumn[]
  reasoning: string | null
  isOptimizing: boolean
  error: string | null
  triggerOptimization: () => void
  clearOptimization: () => void
}

/**
 * Manual job optimizer - user controls when optimization happens
 *
 * @param prompt - User's raw prompt with {{variables}}
 * @param csvColumns - Available CSV column names
 * @returns Optimization controls and results
 */
export function useManualJobOptimizer(
  prompt: string,
  csvColumns: string[]
): UseManualJobOptimizerResult {
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null)
  const [outputColumns, setOutputColumns] = useState<OutputColumn[]>([])
  const [reasoning, setReasoning] = useState<string | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const triggerOptimization = useCallback(async () => {
    // Skip if no prompt or no CSV columns available
    if (!prompt || !csvColumns || csvColumns.length === 0) {
      setError('Please enter a prompt and upload a CSV file first')
      return
    }

    // Skip if prompt is too short (less than 5 characters)
    if (prompt.trim().length < 5) {
      setError('Prompt is too short. Please enter a more detailed prompt.')
      return
    }

    setIsOptimizing(true)
    setError(null)

    try {
      const response = await fetch('/api/optimize-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          csvColumns,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // If API returns fallback flag, silently fail (don't show error to user)
        if (errorData.fallback) {
          setOptimizedPrompt(null)
          setOutputColumns([])
          setReasoning(null)
          return
        }

        throw new Error(errorData.message || 'Optimization failed')
      }

      const result: OptimizationResult = await response.json()

      setOptimizedPrompt(result.optimizedPrompt)
      setOutputColumns(result.outputColumns)
      setReasoning(result.reasoning)
    } catch (err) {
      console.error('Optimization error:', err)
      setError(err instanceof Error ? err.message : 'Optimization failed')
      setOptimizedPrompt(null)
      setOutputColumns([])
      setReasoning(null)
    } finally {
      setIsOptimizing(false)
    }
  }, [prompt, csvColumns])

  const clearOptimization = useCallback(() => {
    setOptimizedPrompt(null)
    setOutputColumns([])
    setReasoning(null)
    setError(null)
  }, [])

  return {
    optimizedPrompt,
    setOptimizedPrompt,
    outputColumns,
    reasoning,
    isOptimizing,
    error,
    triggerOptimization,
    clearOptimization,
  }
}
