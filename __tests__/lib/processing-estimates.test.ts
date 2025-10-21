/**
 * TDD Tests for processing estimation utilities
 */

import { describe, it, expect } from 'vitest'
import { estimateProcessing, getRecommendedMode } from '@/lib/processing-estimates'

describe('estimateProcessing', () => {
  describe('Time estimation', () => {
    it('should estimate time for small batch', () => {
      const result = estimateProcessing(5)
      expect(result.timeSeconds).toBe(15) // 5 * 2 + 5 overhead
      expect(result.timeFormatted).toBe('~15 sec')
    })

    it('should estimate time for medium batch', () => {
      const result = estimateProcessing(50)
      expect(result.timeSeconds).toBe(105) // 50 * 2 + 5
      expect(result.timeFormatted).toBe('~2 min')
    })

    it('should format minutes correctly', () => {
      const result = estimateProcessing(100)
      expect(result.timeFormatted).toContain('min')
    })

    it('should format hours for large batches', () => {
      const result = estimateProcessing(2000)
      expect(result.timeFormatted).toContain('hr')
    })

    it('should handle single row', () => {
      const result = estimateProcessing(1)
      expect(result.timeSeconds).toBe(7) // 1 * 2 + 5
      expect(result.timeFormatted).toBe('~7 sec')
    })
  })

  describe('Cost estimation', () => {
    it('should estimate cost for small batch', () => {
      const result = estimateProcessing(5)
      expect(result.costUSD).toBe(0.0001) // 5 * 0.00002
      expect(result.costFormatted).toBe('<$0.01')
    })

    it('should estimate cost for medium batch', () => {
      const result = estimateProcessing(500)
      expect(result.costUSD).toBe(0.01) // 500 * 0.00002
      expect(result.costFormatted).toBe('$0.01')
    })

    it('should estimate cost for large batch', () => {
      const result = estimateProcessing(100000)
      expect(result.costUSD).toBe(2.00) // 100000 * 0.00002
      expect(result.costFormatted).toBe('$2.00')
    })

    it('should show <$0.01 for very small costs', () => {
      const result = estimateProcessing(1)
      expect(result.costFormatted).toBe('<$0.01')
    })
  })

  describe('Return structure', () => {
    it('should return all required fields', () => {
      const result = estimateProcessing(10)
      expect(result).toHaveProperty('timeSeconds')
      expect(result).toHaveProperty('timeFormatted')
      expect(result).toHaveProperty('costUSD')
      expect(result).toHaveProperty('costFormatted')
      expect(result).toHaveProperty('rowCount')
      expect(result.rowCount).toBe(10)
    })
  })

  describe('Edge cases', () => {
    it('should handle zero rows', () => {
      const result = estimateProcessing(0)
      expect(result.timeSeconds).toBe(5) // Just overhead
      expect(result.costUSD).toBe(0)
      expect(result.costFormatted).toBe('<$0.01')
    })

    it('should handle very large batches', () => {
      const result = estimateProcessing(1000000)
      expect(result.timeSeconds).toBeGreaterThan(0)
      expect(result.costUSD).toBeGreaterThan(0)
    })
  })
})

describe('getRecommendedMode', () => {
  it('should recommend test mode for large datasets', () => {
    expect(getRecommendedMode(100)).toBe('test')
    expect(getRecommendedMode(50)).toBe('test')
    expect(getRecommendedMode(11)).toBe('test')
  })

  it('should recommend full mode for small datasets', () => {
    expect(getRecommendedMode(10)).toBe('full')
    expect(getRecommendedMode(5)).toBe('full')
    expect(getRecommendedMode(1)).toBe('full')
  })

  it('should handle boundary case', () => {
    expect(getRecommendedMode(10)).toBe('full')
    expect(getRecommendedMode(11)).toBe('test')
  })
})



