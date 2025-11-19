import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'

/**
 * POST /api/analyse-website
 * Analyzes a website URL and extracts company context information
 * 
 * This endpoint forwards requests to the Modal backend for processing.
 * 
 * Request body:
 * {
 *   url: string
 * }
 * 
 * Returns:
 * {
 *   // Context Variables
 *   tone?: string
 *   targetCountries?: string
 *   productDescription?: string
 *   competitors?: string
 *   targetIndustries?: string
 *   complianceFlags?: string
 *   // Business Context
 *   icp?: string
 *   countries?: string[]
 *   products?: string[]
 *   targetKeywords?: string[]
 *   competitorKeywords?: string[]
 * }
 */

export const maxDuration = 30 // Max 30 seconds for website analysis

export async function POST(request: NextRequest): Promise<Response> {
  let userId: string | null = null

  try {
    // Authenticate request
    userId = await authenticateRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in or provide valid Bearer token/API key' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      const testUrl = url.startsWith('http') ? url : `https://${url}`
      new URL(testUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Get Modal endpoint URL from environment
    const modalEndpoint = process.env.MODAL_WEBSITE_ANALYZER_ENDPOINT
    if (!modalEndpoint) {
      console.error('MODAL_WEBSITE_ANALYZER_ENDPOINT not configured')
      return NextResponse.json(
        { error: 'API not configured' },
        { status: 500 }
      )
    }

    // Call Modal backend endpoint
    try {
      const modalResponse = await fetch(modalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, user_id: userId }),
        signal: AbortSignal.timeout(28000), // 28s timeout (slightly less than Modal's 30s)
      })

      if (!modalResponse.ok) {
        const errorData = await modalResponse.json().catch(() => ({ error: 'Modal endpoint error' }))
        return NextResponse.json(
          { error: errorData.error || 'Failed to analyze website' },
          { status: modalResponse.status }
        )
      }

      const result = await modalResponse.json()

      // Check if Modal returned an error
      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }

      // Return the result directly (same structure)
      return NextResponse.json(result)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Analysis timeout - website took too long to analyze' },
          { status: 504 }
        )
      }

      console.error('Modal endpoint error:', error)
      return NextResponse.json(
        {
          error: 'Failed to analyze website',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Website analysis error:', error)

    return NextResponse.json(
      {
        error: 'Failed to analyze website',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

