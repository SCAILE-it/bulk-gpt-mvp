/**
 * Tests for useWizardSession hook (TDD Red Phase)
 *
 * Session Persistence:
 * - Auto-save wizard state to localStorage
 * - Restore wizard state on mount
 * - Clear session after completion
 * - Handle partial completion
 * - Multi-step state synchronization
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWizardSession } from '@/hooks/useWizardSession'

// Sample test data
const SAMPLE_STEP1_DATA = {
  file: new File(['name,email\nJohn,john@example.com'], 'test.csv', { type: 'text/csv' }),
  csvData: {
    headers: ['name', 'email'],
    rowCount: 1,
    preview: [['John', 'john@example.com']],
  },
}

const SAMPLE_STEP2_DATA = {
  mode: 'custom' as const,
  promptTemplate: 'Hello {{name}}!',
  columnMapping: { name: 'name', email: 'email' },
}

const SAMPLE_STEP3_DATA = {
  results: [
    { id: '1', input: 'John', output: 'Hello John!', status: 'completed' },
  ],
  summary: {
    total: 1,
    completed: 1,
    failed: 0,
  },
}

describe('useWizardSession', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('State Persistence', () => {
    it('should initialize with empty state when no saved session exists', () => {
      const { result } = renderHook(() => useWizardSession())

      expect(result.current.currentStep).toBe(1)
      expect(result.current.step1Data).toBeNull()
      expect(result.current.step2Data).toBeNull()
      expect(result.current.step3Data).toBeNull()
    })

    it('should save wizard state to localStorage when state changes', async () => {
      const { result } = renderHook(() => useWizardSession())

      act(() => {
        result.current.saveStep1Data(SAMPLE_STEP1_DATA)
      })

      // Wait for debounced save
      await waitFor(() => {
        const savedData = localStorage.getItem('wizard-session')
        expect(savedData).toBeTruthy()
      })

      const savedData = localStorage.getItem('wizard-session')
      const parsed = JSON.parse(savedData!)
      expect(parsed.step1Data).toMatchObject({
        csvData: SAMPLE_STEP1_DATA.csvData,
      })
    })

    it('should restore wizard state from localStorage on mount', () => {
      // Pre-populate localStorage
      const sessionData = {
        currentStep: 2,
        step1Data: SAMPLE_STEP1_DATA,
        step2Data: SAMPLE_STEP2_DATA,
        step3Data: null,
        timestamp: Date.now(),
      }
      localStorage.setItem('wizard-session', JSON.stringify(sessionData))

      const { result } = renderHook(() => useWizardSession())

      expect(result.current.currentStep).toBe(2)
      expect(result.current.step2Data).toMatchObject(SAMPLE_STEP2_DATA)
    })

    it('should clear localStorage after wizard completion', async () => {
      const { result } = renderHook(() => useWizardSession())

      act(() => {
        result.current.saveStep1Data(SAMPLE_STEP1_DATA)
        result.current.saveStep2Data(SAMPLE_STEP2_DATA)
      })

      // Wait for debounced save
      await waitFor(() => {
        expect(localStorage.getItem('wizard-session')).toBeTruthy()
      })

      act(() => {
        result.current.clearSession()
      })

      expect(localStorage.getItem('wizard-session')).toBeNull()
    })

    it('should handle missing localStorage data gracefully', () => {
      // Simulate localStorage being unavailable
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage is not available')
      })

      const { result } = renderHook(() => useWizardSession())

      expect(result.current.currentStep).toBe(1)
      expect(result.current.step1Data).toBeNull()

      getItemSpy.mockRestore()
    })
  })

  describe('Multi-Step State Management', () => {
    it('should persist Step 1 (upload) state independently', () => {
      const { result } = renderHook(() => useWizardSession())

      act(() => {
        result.current.saveStep1Data(SAMPLE_STEP1_DATA)
      })

      expect(result.current.step1Data).toMatchObject({
        csvData: SAMPLE_STEP1_DATA.csvData,
      })
      expect(result.current.step2Data).toBeNull()
      expect(result.current.step3Data).toBeNull()
    })

    it('should persist Step 2 (configure) state independently', () => {
      const { result } = renderHook(() => useWizardSession())

      act(() => {
        result.current.saveStep2Data(SAMPLE_STEP2_DATA)
      })

      expect(result.current.step2Data).toEqual(SAMPLE_STEP2_DATA)
      expect(result.current.step1Data).toBeNull()
      expect(result.current.step3Data).toBeNull()
    })

    it('should persist Step 3 (results) state independently', () => {
      const { result } = renderHook(() => useWizardSession())

      act(() => {
        result.current.saveStep3Data(SAMPLE_STEP3_DATA)
      })

      expect(result.current.step3Data).toEqual(SAMPLE_STEP3_DATA)
      expect(result.current.step1Data).toBeNull()
      expect(result.current.step2Data).toBeNull()
    })

    it('should maintain current step index', async () => {
      const { result } = renderHook(() => useWizardSession())

      expect(result.current.currentStep).toBe(1)

      act(() => {
        result.current.setCurrentStep(2)
      })

      expect(result.current.currentStep).toBe(2)

      // Wait for debounced save, then verify persistence
      await waitFor(() => {
        const savedData = localStorage.getItem('wizard-session')
        expect(savedData).toBeTruthy()
      })

      const savedData = JSON.parse(localStorage.getItem('wizard-session')!)
      expect(savedData.currentStep).toBe(2)
    })

    it('should allow navigation between steps with preserved state', () => {
      const { result } = renderHook(() => useWizardSession())

      // Save all steps
      act(() => {
        result.current.saveStep1Data(SAMPLE_STEP1_DATA)
        result.current.saveStep2Data(SAMPLE_STEP2_DATA)
        result.current.setCurrentStep(3)
      })

      // Navigate back to step 2
      act(() => {
        result.current.setCurrentStep(2)
      })

      expect(result.current.currentStep).toBe(2)
      expect(result.current.step1Data).toBeTruthy()
      expect(result.current.step2Data).toEqual(SAMPLE_STEP2_DATA)
    })
  })

  describe('Data Validation', () => {
    it('should validate restored data structure', () => {
      // Save valid data with all required fields
      const validData = {
        currentStep: 2,
        step1Data: SAMPLE_STEP1_DATA,
        step2Data: SAMPLE_STEP2_DATA,
        step3Data: null,
        timestamp: Date.now(),
      }
      localStorage.setItem('wizard-session', JSON.stringify(validData))

      const { result } = renderHook(() => useWizardSession())

      expect(result.current.currentStep).toBe(2)
      expect(result.current.step1Data).toBeTruthy()
    })

    it('should reject corrupted localStorage data', () => {
      // Save corrupted JSON
      localStorage.setItem('wizard-session', '{invalid json}')

      const { result } = renderHook(() => useWizardSession())

      // Should fall back to initial state
      expect(result.current.currentStep).toBe(1)
      expect(result.current.step1Data).toBeNull()
    })

    it('should handle version mismatches gracefully', () => {
      // Save data with future version
      const futureVersionData = {
        version: '99.0.0',
        currentStep: 2,
        step1Data: SAMPLE_STEP1_DATA,
        someNewField: 'future data',
        timestamp: Date.now(),
      }
      localStorage.setItem('wizard-session', JSON.stringify(futureVersionData))

      const { result } = renderHook(() => useWizardSession())

      // Should either gracefully handle or reset
      expect(result.current.currentStep).toBeGreaterThanOrEqual(1)
    })

    it('should sanitize invalid step data', () => {
      // Save data with invalid step number
      const invalidStepData = {
        currentStep: 99, // Invalid step
        step1Data: SAMPLE_STEP1_DATA,
        step2Data: null,
        step3Data: null,
        timestamp: Date.now(),
      }
      localStorage.setItem('wizard-session', JSON.stringify(invalidStepData))

      const { result } = renderHook(() => useWizardSession())

      // Should clamp to valid range (1-3)
      expect(result.current.currentStep).toBeGreaterThanOrEqual(1)
      expect(result.current.currentStep).toBeLessThanOrEqual(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle localStorage quota exceeded', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      const { result } = renderHook(() => useWizardSession())

      // Should not throw, but gracefully handle
      act(() => {
        result.current.saveStep1Data(SAMPLE_STEP1_DATA)
      })

      expect(result.current.step1Data).toBeTruthy() // State still updated in memory

      setItemSpy.mockRestore()
    })

    it('should expire old sessions (7 days)', () => {
      const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days ago
      const expiredSession = {
        currentStep: 2,
        step1Data: SAMPLE_STEP1_DATA,
        step2Data: SAMPLE_STEP2_DATA,
        step3Data: null,
        timestamp: oldTimestamp,
      }
      localStorage.setItem('wizard-session', JSON.stringify(expiredSession))

      const { result } = renderHook(() => useWizardSession())

      // Should not restore expired session
      expect(result.current.currentStep).toBe(1)
      expect(result.current.step1Data).toBeNull()
    })

    it('should handle concurrent tab updates', async () => {
      const { result: result1 } = renderHook(() => useWizardSession())
      const { result: result2 } = renderHook(() => useWizardSession())

      // Simulate concurrent updates from different tabs
      act(() => {
        result1.current.saveStep1Data(SAMPLE_STEP1_DATA)
      })

      // Simulate storage event from another tab
      const storageEvent = new StorageEvent('storage', {
        key: 'wizard-session',
        newValue: JSON.stringify({
          currentStep: 2,
          step1Data: SAMPLE_STEP1_DATA,
          step2Data: SAMPLE_STEP2_DATA,
          step3Data: null,
          timestamp: Date.now(),
        }),
      })

      act(() => {
        window.dispatchEvent(storageEvent)
      })

      // Both hooks should sync to latest state
      await waitFor(() => {
        expect(result2.current.currentStep).toBe(2)
      })
    })

    it('should handle browser back/forward navigation', async () => {
      const { result } = renderHook(() => useWizardSession())

      act(() => {
        result.current.saveStep1Data(SAMPLE_STEP1_DATA)
        result.current.setCurrentStep(2)
      })

      expect(result.current.currentStep).toBe(2)

      // Wait for debounced save
      await waitFor(() => {
        const savedData = localStorage.getItem('wizard-session')
        expect(savedData).toBeTruthy()
      })

      // Simulate browser back navigation restoring from localStorage
      const { result: restoredResult } = renderHook(() => useWizardSession())

      expect(restoredResult.current.currentStep).toBe(2)
      expect(restoredResult.current.step1Data).toBeTruthy()
    })
  })

  describe('Auto-save Behavior', () => {
    it('should debounce rapid state changes', async () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useWizardSession())

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      // Rapid updates
      act(() => {
        result.current.saveStep1Data(SAMPLE_STEP1_DATA)
        result.current.saveStep1Data({ ...SAMPLE_STEP1_DATA, csvData: { ...SAMPLE_STEP1_DATA.csvData, rowCount: 2 } })
        result.current.saveStep1Data({ ...SAMPLE_STEP1_DATA, csvData: { ...SAMPLE_STEP1_DATA.csvData, rowCount: 3 } })
      })

      // Should debounce (not call setItem 3 times immediately)
      const immediateCallCount = setItemSpy.mock.calls.length

      act(() => {
        vi.advanceTimersByTime(1000) // Advance 1 second
      })

      // After debounce delay, should have saved
      expect(setItemSpy).toHaveBeenCalled()

      vi.useRealTimers()
      setItemSpy.mockRestore()
    })

    it('should save on window beforeunload', () => {
      const { result } = renderHook(() => useWizardSession())

      act(() => {
        result.current.saveStep1Data(SAMPLE_STEP1_DATA)
      })

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      // Simulate window beforeunload
      const beforeUnloadEvent = new Event('beforeunload')
      window.dispatchEvent(beforeUnloadEvent)

      expect(setItemSpy).toHaveBeenCalled()

      setItemSpy.mockRestore()
    })
  })
})
