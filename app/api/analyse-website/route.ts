import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { analyzeWebsite, type AnalysisMode } from '@/lib/services/website-analyzer'

/**
 * POST /api/analyse-website
 * Analyzes a website URL and extracts company context information
 * 
 * This endpoint uses Google Gemini AI directly (no Modal dependency).
 * 
 * Request body:
 * {
 *   url: string (required)
 *   mode?: "business_context" | "seo" | "competitor" | "company_intelligence" | "full" | "custom" (default: "business_context")
 *   customFields?: string[] (required if mode="custom")
 *   useGoogleSearch?: boolean (default: false)
 *   maxContentLength?: number (default: 50000)
 * }
 * 
 * Returns:
 * {
 *   // Context Variables (for business_context mode)
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
 *   // Company Intelligence (for company_intelligence mode)
 *   companyName?: string
 *   legalName?: string
 *   teamMembers?: Array<{name: string, role: string}>
 *   imprint?: string
 *   // ... and more fields based on mode
 *   _metadata?: {
 *     mode: string
 *     url: string
 *   }
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
    const { 
      url, 
      mode = 'business_context',
      customFields,
      useGoogleSearch = false,
      maxContentLength = 50000,
    } = body

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate mode
    const validModes: AnalysisMode[] = [
      'business_context',
      'seo',
      'competitor',
      'full',
      'company_intelligence',
      'custom',
    ]
    if (mode && !validModes.includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode. Must be one of: ${validModes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate customFields for custom mode
    if (mode === 'custom' && (!customFields || !Array.isArray(customFields) || customFields.length === 0)) {
      return NextResponse.json(
        { error: 'customFields parameter is required when mode="custom"' },
        { status: 400 }
      )
    }

    // Analyze website using direct Gemini API
    try {
      const result = await analyzeWebsite({
        url,
        mode: mode as AnalysisMode,
        customFields,
        useGoogleSearch,
        maxContentLength,
      })

      return NextResponse.json(result)
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
          return NextResponse.json(
            { error: 'Analysis timeout - website took too long to analyze' },
            { status: 504 }
          )
        }
        if (error.message.includes('not found') || error.message.includes('ENOTFOUND')) {
          return NextResponse.json(
            { error: 'Domain not found. Please check the URL is correct.' },
            { status: 400 }
          )
        }
        if (error.message.includes('API key') || error.message.includes('GOOGLE_GENERATIVE_AI_API_KEY')) {
          return NextResponse.json(
            { error: 'API not configured - missing Google Gemini API key' },
            { status: 500 }
          )
        }
        
        console.error('Website analysis error:', error)
        return NextResponse.json(
          {
            error: 'Failed to analyze website',
            message: error.message,
          },
          { status: 500 }
        )
      }

      console.error('Website analysis error:', error)
      return NextResponse.json(
        {
          error: 'Failed to analyze website',
          message: 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Website analysis error:', error)

    return NextResponse.json(
      {
        error: 'Failed to analyze website',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

