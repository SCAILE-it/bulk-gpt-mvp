/**
 * MSW handlers for mocking API requests in tests
 *
 * These handlers intercept HTTP requests and return mock responses,
 * allowing us to test components without hitting real APIs.
 */

import { http, HttpResponse } from 'msw'

const MODAL_API_URL = 'https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run'

export const handlers = [
  // Auto-column generation endpoint
  http.post(`${MODAL_API_URL}/generate-columns`, async ({ request }) => {
    const body = await request.json()
    const prompt = (body as any).prompt as string

    if (!prompt) {
      return HttpResponse.json(
        {
          columns: [],
          status: 'error',
          error: 'Missing prompt parameter',
        },
        { status: 400 }
      )
    }

    // Mock intelligent column generation based on prompt
    const columns = generateMockColumns(prompt)

    return HttpResponse.json({
      columns,
      status: 'success',
      error: null,
    })
  }),

  // Batch processing endpoint
  http.post(`${MODAL_API_URL}/`, async ({ request }) => {
    const body = await request.json()
    const { batch_id, rows, prompt } = body as any

    if (!batch_id || !rows || !prompt) {
      return HttpResponse.json(
        {
          error: 'Missing required parameters',
        },
        { status: 400 }
      )
    }

    // Mock batch processing response
    return HttpResponse.json({
      batch_id,
      total_rows: rows.length,
      successful: rows.length,
      failed: 0,
      processing_time_seconds: 1.5,
      avg_time_per_row: 0.05,
      status: 'completed',
      results: rows.map((row: any, index: number) => ({
        id: `${batch_id}-row-${index}`,
        output: `Mock AI output for ${JSON.stringify(row)}`,
        status: 'success',
        error: null,
      })),
    })
  }),
]

/**
 * Generate mock columns based on prompt content
 * Mimics the real Gemini API behavior
 */
function generateMockColumns(prompt: string): Array<{ name: string; description: string }> {
  const lowerPrompt = prompt.toLowerCase()

  // Sentiment analysis
  if (lowerPrompt.includes('sentiment')) {
    return [
      { name: 'sentiment_score', description: 'Sentiment score (-1 to 1)' },
      { name: 'sentiment_label', description: 'Categorical sentiment (positive/negative/neutral)' },
    ]
  }

  // Classification
  if (lowerPrompt.includes('classify') || lowerPrompt.includes('category')) {
    return [
      { name: 'primary_category', description: 'Main classification category' },
      { name: 'confidence', description: 'Classification confidence score' },
    ]
  }

  // Scoring/Rating
  if (lowerPrompt.includes('rate') || lowerPrompt.includes('score')) {
    return [
      { name: 'innovation_score', description: 'Innovation rating (1-10)' },
      { name: 'growth_score', description: 'Growth rating (1-10)' },
      { name: 'market_score', description: 'Market position rating (1-10)' },
    ]
  }

  // Email generation
  if (lowerPrompt.includes('email')) {
    return [
      { name: 'email_subject', description: 'Email subject line' },
      { name: 'email_body', description: 'Email body content' },
    ]
  }

  // Summarization
  if (lowerPrompt.includes('summarize') || lowerPrompt.includes('summary')) {
    return [{ name: 'summary', description: 'Concise summary of the content' }]
  }

  // Translation
  if (lowerPrompt.includes('translate')) {
    return [{ name: 'translation', description: 'Translated text' }]
  }

  // Default
  return [{ name: 'ai_output', description: 'AI-generated result' }]
}

/**
 * Error handlers for testing error scenarios
 */
export const errorHandlers = {
  // Network error
  networkError: http.post(`${MODAL_API_URL}/generate-columns`, () => {
    return HttpResponse.error()
  }),

  // 500 Server error
  serverError: http.post(`${MODAL_API_URL}/generate-columns`, () => {
    return HttpResponse.json(
      {
        columns: [],
        status: 'error',
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }),

  // Rate limit error
  rateLimitError: http.post(`${MODAL_API_URL}/generate-columns`, () => {
    return HttpResponse.json(
      {
        columns: [],
        status: 'error',
        error: 'Rate limit exceeded',
      },
      { status: 429 }
    )
  }),

  // Empty response
  emptyResponse: http.post(`${MODAL_API_URL}/generate-columns`, () => {
    return HttpResponse.json({
      columns: [],
      status: 'success',
      error: null,
    })
  }),
}
