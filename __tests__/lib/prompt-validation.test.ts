/**
 * TDD Tests for prompt validation utilities
 */

import { describe, it, expect } from 'vitest'
import { extractVariables, validatePrompt } from '@/lib/prompt-validation'

describe('extractVariables', () => {
  it('should extract single variable', () => {
    const result = extractVariables('Hello {{name}}')
    expect(result).toEqual(['name'])
  })

  it('should extract multiple variables', () => {
    const result = extractVariables('Hello {{name}}, you work at {{company}}')
    expect(result).toEqual(['name', 'company'])
  })

  it('should handle variables with spaces', () => {
    const result = extractVariables('Hello {{ name }} from {{ company }}')
    expect(result).toEqual(['name', 'company'])
  })

  it('should return empty array for no variables', () => {
    const result = extractVariables('Hello world')
    expect(result).toEqual([])
  })

  it('should handle duplicate variables', () => {
    const result = extractVariables('{{name}} and {{name}} again')
    expect(result).toEqual(['name', 'name'])
  })

  it('should handle empty string', () => {
    const result = extractVariables('')
    expect(result).toEqual([])
  })
})

describe('validatePrompt', () => {
  const headers = ['name', 'email', 'company']

  describe('Empty prompt validation', () => {
    it('should reject empty prompt', () => {
      const result = validatePrompt('', headers)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject whitespace-only prompt', () => {
      const result = validatePrompt('   ', headers)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('Variable presence validation', () => {
    it('should reject prompt without variables', () => {
      const result = validatePrompt('Hello world', headers)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('at least one variable')
    })

    it('should accept prompt with one variable', () => {
      const result = validatePrompt('Hello {{name}}', headers)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  describe('Variable matching validation', () => {
    it('should accept prompt with all valid variables', () => {
      const result = validatePrompt('Hello {{name}} from {{company}}', headers)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeNull()
      expect(result.foundVariables).toEqual(['name', 'company'])
      expect(result.missingVariables).toEqual([])
    })

    it('should reject prompt with invalid variable', () => {
      const result = validatePrompt('Hello {{invalid_column}}', headers)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('not found in CSV')
      expect(result.error).toContain('{{invalid_column}}')
      expect(result.missingVariables).toEqual(['invalid_column'])
    })

    it('should reject prompt with multiple invalid variables', () => {
      const result = validatePrompt('{{invalid1}} and {{invalid2}}', headers)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('not found in CSV')
      expect(result.missingVariables).toContain('invalid1')
      expect(result.missingVariables).toContain('invalid2')
    })

    it('should reject prompt with mix of valid and invalid variables', () => {
      const result = validatePrompt('Hello {{name}} at {{invalid}}', headers)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('{{invalid}}')
      expect(result.missingVariables).toEqual(['invalid'])
      expect(result.foundVariables).toEqual(['name', 'invalid'])
    })
  })

  describe('Edge cases', () => {
    it('should handle duplicate missing variables', () => {
      const result = validatePrompt('{{invalid}} and {{invalid}}', headers)
      expect(result.isValid).toBe(false)
      // Should only list "invalid" once in error message
      expect(result.missingVariables).toEqual(['invalid'])
    })

    it('should be case-sensitive', () => {
      const result = validatePrompt('Hello {{NAME}}', headers)
      expect(result.isValid).toBe(false)
      expect(result.missingVariables).toEqual(['NAME'])
    })

    it('should handle empty headers array', () => {
      const result = validatePrompt('Hello {{name}}', [])
      expect(result.isValid).toBe(false)
      expect(result.missingVariables).toEqual(['name'])
    })
  })
})



