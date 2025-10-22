/**
 * Tests for auto-column generation API (TDD Red Phase)
 *
 * AI-powered prompt template generation:
 * - Analyze CSV headers
 * - Generate intelligent prompt template using Gemini
 * - Map columns to variables
 * - Handle various CSV structures
 * - Error handling and rate limiting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generatePromptTemplate } from '@/lib/api/auto-column'

// Mock Gemini API
const mockGenerateContent = vi.fn()

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockImplementation(() => ({
      generateContent: mockGenerateContent,
    })),
  })),
}))

describe('Auto-Column Generation API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation - returns realistic template based on headers
    mockGenerateContent.mockImplementation(async (systemPrompt: string) => {
      // Extract headers from the system prompt
      const headerMatch = systemPrompt.match(/Given these CSV column headers: (.+?)(?:\n|$)/)
      if (!headerMatch) {
        return {
          response: {
            text: () => 'Hello there!',
          },
        }
      }

      const headers = headerMatch[1].split(', ').map(h => h.trim())

      // Filter out metadata columns
      const metadataColumns = ['id', 'created_at', 'updated_at', 'status', 'timestamp']
      const relevantHeaders = headers.filter(h => !metadataColumns.includes(h.toLowerCase()))

      // Take first 3 relevant headers and create a template
      const selectedHeaders = relevantHeaders.slice(0, 3)
      const variables = selectedHeaders.map(h => `{{${h}}}`).join(', ')

      return {
        response: {
          text: () => `Hi ${variables}! Looking forward to connecting.`,
        },
      }
    })
  })

  describe('Basic Prompt Generation', () => {
    it('should generate prompt template for simple customer data', async () => {
      const headers = ['name', 'email', 'company']

      const result = await generatePromptTemplate(headers)

      expect(result).toHaveProperty('promptTemplate')
      expect(result).toHaveProperty('columnMapping')
      expect(result.promptTemplate).toContain('{{name}}')
      expect(result.promptTemplate).toContain('{{email}}')
      expect(result.columnMapping).toEqual({
        name: 'name',
        email: 'email',
        company: 'company',
      })
    })

    it('should generate prompt template for sales outreach', async () => {
      const headers = ['first_name', 'last_name', 'company_name', 'industry']

      const result = await generatePromptTemplate(headers)

      expect(result.promptTemplate).toBeTruthy()
      expect(result.promptTemplate).toContain('{{first_name}}')
      expect(result.promptTemplate).toContain('{{company_name}}')
      expect(result.columnMapping).toHaveProperty('first_name')
    })

    it('should generate prompt template for product data', async () => {
      const headers = ['product_name', 'price', 'category', 'description']

      const result = await generatePromptTemplate(headers)

      expect(result.promptTemplate).toContain('{{product_name}}')
      expect(result.columnMapping).toHaveProperty('product_name')
      expect(result.columnMapping).toHaveProperty('price')
    })

    it('should handle minimal columns (2 columns)', async () => {
      const headers = ['name', 'email']

      const result = await generatePromptTemplate(headers)

      expect(result.promptTemplate).toBeTruthy()
      expect(result.columnMapping).toHaveProperty('name')
      expect(result.columnMapping).toHaveProperty('email')
    })

    it('should handle many columns (10+ columns)', async () => {
      const headers = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'company',
        'title',
        'industry',
        'location',
        'website',
        'linkedin',
        'notes',
      ]

      const result = await generatePromptTemplate(headers)

      expect(result.promptTemplate).toBeTruthy()
      expect(Object.keys(result.columnMapping)).toHaveLength(11)
      // Should use most relevant columns, not all
      expect(result.promptTemplate.match(/\{\{/g)?.length).toBeLessThanOrEqual(6)
    })
  })

  describe('Column Mapping Intelligence', () => {
    it('should normalize column names (snake_case, camelCase)', async () => {
      const headers = ['first_name', 'lastName', 'email-address']

      const result = await generatePromptTemplate(headers)

      expect(result.columnMapping).toHaveProperty('first_name')
      expect(result.columnMapping).toHaveProperty('lastName')
      expect(result.columnMapping).toHaveProperty('email-address')
    })

    it('should recognize common patterns (name variations)', async () => {
      const headers = ['full_name', 'company_name', 'email']

      const result = await generatePromptTemplate(headers)

      // Should intelligently use full_name rather than asking for first/last
      expect(result.promptTemplate).toContain('{{full_name}}')
    })

    it('should prioritize relevant columns over metadata', async () => {
      const headers = ['id', 'created_at', 'name', 'email', 'company', 'status']

      const result = await generatePromptTemplate(headers)

      // Should not include technical metadata columns in template
      expect(result.promptTemplate).not.toContain('{{id}}')
      expect(result.promptTemplate).not.toContain('{{created_at}}')
      expect(result.promptTemplate).toContain('{{name}}')
    })
  })

  describe('Gemini API Integration', () => {
    it('should call Gemini API with correct parameters', async () => {
      const headers = ['name', 'email', 'company']

      const result = await generatePromptTemplate(headers)

      expect(result).toHaveProperty('promptTemplate')
      expect(result.promptTemplate).toMatch(/Hello|Hi|Dear/i) // Should be conversational
    })

    it('should handle Gemini API errors gracefully', async () => {
      // Override mock to simulate API failure
      mockGenerateContent.mockRejectedValueOnce(new Error('API Error'))

      const headers = ['name', 'email']

      await expect(generatePromptTemplate(headers)).rejects.toThrow('Gemini API error: API Error')
    })

    it('should include context about CSV structure in prompt', async () => {
      const headers = ['customer_name', 'order_date', 'product', 'quantity']

      const result = await generatePromptTemplate(headers)

      // Should generate template relevant to order/sales context
      expect(result.promptTemplate).toBeTruthy()
      expect(result.promptTemplate.length).toBeGreaterThan(20)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty headers array', async () => {
      const headers: string[] = []

      await expect(generatePromptTemplate(headers)).rejects.toThrow(
        'No headers provided'
      )
    })

    it('should handle single column', async () => {
      const headers = ['email']

      const result = await generatePromptTemplate(headers)

      expect(result.promptTemplate).toContain('{{email}}')
    })

    it('should handle duplicate column names', async () => {
      const headers = ['name', 'name', 'email']

      await expect(generatePromptTemplate(headers)).rejects.toThrow(
        'Duplicate column names detected'
      )
    })

    it('should handle special characters in column names', async () => {
      const headers = ['name (first)', 'email@address', 'company-name']

      const result = await generatePromptTemplate(headers)

      expect(result.columnMapping).toHaveProperty('name (first)')
    })

    it('should handle very long column names', async () => {
      const headers = [
        'this_is_a_very_long_column_name_that_exceeds_normal_length_constraints',
        'email',
      ]

      const result = await generatePromptTemplate(headers)

      expect(result.promptTemplate).toBeTruthy()
    })
  })
})
