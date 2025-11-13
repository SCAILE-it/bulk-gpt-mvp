/**
 * ABOUTME: Custom hook for validating prompt variables against CSV columns
 * ABOUTME: Checks that all {{variable}} placeholders in prompt exist in CSV headers
 */

import { useMemo } from 'react'
import type { ParsedCSV } from '@/lib/types'

export interface VariableValidationResult {
  /** Variables used in prompt but missing from CSV columns */
  missing: string[]
  /** CSV columns not used in the prompt */
  unused: string[]
  /** True if prompt has at least one variable AND all variables exist in CSV */
  isValid: boolean
}

/**
 * Validates that prompt variables match CSV columns
 *
 * Extracts variables from prompt ({{variable}} syntax) and compares
 * with CSV column names to identify missing or unused variables.
 *
 * @param prompt - The prompt template with {{variable}} placeholders
 * @param csvData - Parsed CSV data with column names
 * @returns Validation result with missing/unused variables and validity flag
 *
 * @example
 * const validation = useVariableValidation(prompt, csvData)
 * if (!validation.isValid) {
 *   console.log('Missing variables:', validation.missing)
 * }
 */
export function useVariableValidation(
  prompt: string,
  csvData: ParsedCSV | null,
  selectedInputColumns?: string[]
): VariableValidationResult {
  return useMemo(() => {
    if (!csvData || !prompt) {
      return { missing: [], unused: [], isValid: true }
    }

    // Extract variables from prompt ({{variable}} syntax)
    const variablePattern = /\{\{([^}]+)\}\}/g
    const matches = Array.from(prompt.matchAll(variablePattern))
    const promptVars = new Set<string>()
    for (const match of matches) {
      promptVars.add(match[1].trim())
    }

    // Use selectedInputColumns if provided, otherwise use all CSV columns
    const availableCols = selectedInputColumns && selectedInputColumns.length > 0
      ? new Set(selectedInputColumns)
      : new Set(csvData.columns)
    
    // Compare with available columns
    const missing = Array.from(promptVars).filter(v => !availableCols.has(v))
    const unused = Array.from(availableCols).filter(c => !promptVars.has(c))

    return {
      missing,
      unused,
      isValid: promptVars.size > 0 && missing.length === 0 // Require at least one variable AND all variables must exist in CSV
    }
  }, [csvData, prompt, selectedInputColumns])
}
