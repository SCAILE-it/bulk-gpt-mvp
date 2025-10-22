/**
 * Tests for useCSVParser hook
 */

import { renderHook, act } from '@testing-library/react'
import { useCSVParser } from '../useCSVParser'
import * as csvParser from '@/lib/csv-parser'
import * as analytics from '@/lib/analytics'

// Mock dependencies
jest.mock('@/lib/csv-parser')
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  ANALYTICS_EVENTS: {
    FILE_UPLOADED: 'file_uploaded',
    FILE_PARSE_ERROR: 'file_parse_error',
  },
}))

describe('useCSVParser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with null data and no error', () => {
      const { result } = renderHook(() => useCSVParser())
      
      expect(result.current.csvData).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.isParsing).toBe(false)
    })
  })

  describe('CSV Parsing', () => {
    it('should parse CSV file successfully', async () => {
      const mockParsedData = {
        filename: 'test.csv',
        rows: [
          { data: { name: 'John', email: 'john@test.com' }, rowIndex: 0 },
        ],
        columns: ['name', 'email'],
        totalRows: 1,
      }

      jest.spyOn(csvParser, 'parseCSV').mockResolvedValue(mockParsedData)

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['name,email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })

      await act(async () => {
        await result.current.parseFile(file)
      })

      expect(result.current.csvData).toEqual(mockParsedData)
      expect(result.current.error).toBeNull()
      expect(result.current.isParsing).toBe(false)
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'file_uploaded',
        expect.objectContaining({
          fileName: 'test.csv',
          rowCount: 1,
          columnCount: 2,
        })
      )
    })

    it('should handle parse errors', async () => {
      const error = new Error('Invalid CSV format')
      jest.spyOn(csvParser, 'parseCSV').mockRejectedValue(error)

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['invalid'], 'test.csv', { type: 'text/csv' })

      await act(async () => {
        try {
          await result.current.parseFile(file)
        } catch (err) {
          // Expected to throw
        }
      })

      expect(result.current.csvData).toBeNull()
      expect(result.current.error).toBe('Invalid CSV format')
      expect(result.current.isParsing).toBe(false)
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'file_parse_error',
        expect.objectContaining({
          error: 'Invalid CSV format',
          stage: 'parsing',
        })
      )
    })

    it('should set isParsing during parse operation', async () => {
      let resolvePromise: (value: unknown) => void
      const parsePromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      jest.spyOn(csvParser, 'parseCSV').mockReturnValue(parsePromise as Promise<never>)

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['test'], 'test.csv', { type: 'text/csv' })

      act(() => {
        result.current.parseFile(file)
      })

      // Should be parsing
      expect(result.current.isParsing).toBe(true)

      // Resolve and wait
      await act(async () => {
        resolvePromise({
          filename: 'test.csv',
          rows: [],
          columns: [],
          totalRows: 0,
        })
        await parsePromise
      })

      // Should be done
      expect(result.current.isParsing).toBe(false)
    })
  })

  describe('State Management', () => {
    it('should clear data and error', async () => {
      const mockParsedData = {
        filename: 'test.csv',
        rows: [],
        columns: ['name'],
        totalRows: 0,
      }

      jest.spyOn(csvParser, 'parseCSV').mockResolvedValue(mockParsedData)

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['name\nJohn'], 'test.csv', { type: 'text/csv' })

      await act(async () => {
        await result.current.parseFile(file)
      })

      expect(result.current.csvData).toEqual(mockParsedData)

      act(() => {
        result.current.clearData()
      })

      expect(result.current.csvData).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should clear error only', async () => {
      const error = new Error('Parse error')
      jest.spyOn(csvParser, 'parseCSV').mockRejectedValue(error)

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['invalid'], 'test.csv', { type: 'text/csv' })

      await act(async () => {
        try {
          await result.current.parseFile(file)
        } catch {
          // Expected
        }
      })

      expect(result.current.error).toBeTruthy()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle non-Error objects', async () => {
      jest.spyOn(csvParser, 'parseCSV').mockRejectedValue('String error')

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['test'], 'test.csv', { type: 'text/csv' })

      await act(async () => {
        try {
          await result.current.parseFile(file)
        } catch {
          // Expected
        }
      })

      expect(result.current.error).toBe('Failed to parse CSV')
    })

    it('should track analytics on error', async () => {
      const error = new Error('Corrupted file')
      jest.spyOn(csvParser, 'parseCSV').mockRejectedValue(error)

      const { result } = renderHook(() => useCSVParser())
      const file = new File(['bad'], 'corrupted.csv', { type: 'text/csv' })

      await act(async () => {
        try {
          await result.current.parseFile(file)
        } catch {
          // Expected
        }
      })

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'file_parse_error',
        expect.objectContaining({
          fileName: 'corrupted.csv',
          error: 'Corrupted file',
        })
      )
    })
  })
})
