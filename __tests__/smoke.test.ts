/**
 * Smoke test to verify test infrastructure works
 *
 * This test ensures that:
 * - Vitest is configured correctly
 * - MSW is intercepting API calls
 * - Test fixtures are accessible
 * - Test utilities work
 */

import { describe, it, expect } from 'vitest'
import { SAMPLE_CSV_HEADERS, SAMPLE_CSV_ROWS, createCSVFile } from './fixtures/csv-data'
import { server } from './mocks/server'
import { handlers } from './mocks/handlers'

describe('Test Infrastructure', () => {
  it('should load test fixtures correctly', () => {
    expect(SAMPLE_CSV_HEADERS).toHaveLength(4)
    expect(SAMPLE_CSV_ROWS).toHaveLength(3)
    expect(SAMPLE_CSV_ROWS[0].name).toBe('John Smith')
  })

  it('should create CSV files from fixtures', () => {
    const file = createCSVFile('test,data\n1,2')
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('test-data.csv')
    expect(file.type).toBe('text/csv')
  })

  it('should have MSW server configured', () => {
    expect(server).toBeDefined()
    expect(server.listHandlers()).toHaveLength(handlers.length)
  })

  it('should mock Modal API endpoints', async () => {
    const response = await fetch(
      'https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run/generate-columns',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Test prompt' }),
      }
    )

    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.status).toBe('success')
    expect(data.columns).toBeInstanceOf(Array)
  })

  it('should handle different prompt types with mock responses', async () => {
    const prompts = [
      { prompt: 'Analyze sentiment', expectedColumn: 'sentiment_score' },
      { prompt: 'Classify this product', expectedColumn: 'primary_category' },
      { prompt: 'Rate the company', expectedColumn: 'innovation_score' },
    ]

    for (const { prompt, expectedColumn } of prompts) {
      const response = await fetch(
        'https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run/generate-columns',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        }
      )

      const data = await response.json()
      expect(data.status).toBe('success')
      expect(data.columns.some((col: any) => col.name === expectedColumn)).toBe(true)
    }
  })
})
