import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

/**
 * POST /api/analyse-website
 * Analyzes a website URL and extracts company context information
 * 
 * This endpoint calls the Python website analyzer service directly (no Modal).
 * Uses the same Python code that was designed for Modal, but runs it locally.
 * 
 * Request body:
 * {
 *   url: string (required)
 *   mode?: "business_context" | "seo" | "competitor" | "company_intelligence" | "full" | "custom" (default: "business_context")
 *   customFields?: string[] (required if mode="custom")
 *   useGoogleSearch?: boolean (default: true)
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
      useGoogleSearch = true,
      maxContentLength = 50000,
    } = body

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate mode
    const validModes = [
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

    // Call Python website analyzer script
    try {
      const scriptPath = path.join(process.cwd(), 'services', 'website_analyzer.py')
      const tempScriptPath = path.join(tmpdir(), `analyze_${Date.now()}.py`)
      
      // Create a temporary script that calls the analyzer function
      const scriptContent = `
import asyncio
import json
import sys
import os
sys.path.insert(0, '${path.join(process.cwd(), 'services')}')
from website_analyzer import analyze_website

async def main():
    args = json.loads(sys.stdin.read())
    try:
        result = await analyze_website(
            url=args['url'],
            mode=args.get('mode', 'business_context'),
            custom_fields=args.get('customFields'),
            use_google_search=args.get('useGoogleSearch', True),
            max_content_length=args.get('maxContentLength', 50000),
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())
`
      
      await writeFile(tempScriptPath, scriptContent)
      
      const inputData = JSON.stringify({
        url,
        mode,
        customFields,
        useGoogleSearch,
        maxContentLength,
      })
      
      const env = {
        ...process.env,
        GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY || '',
      }
      
      const { stdout, stderr } = await execAsync(
        `python3 "${tempScriptPath}"`,
        {
          input: inputData,
          env,
          timeout: 28000, // 28s timeout
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      )
      
      // Clean up temp script
      await unlink(tempScriptPath).catch(() => {})
      
      if (stderr) {
        try {
          const errorResult = JSON.parse(stderr)
          if (errorResult.error) {
            throw new Error(errorResult.error)
          }
        } catch {
          // stderr might not be JSON, ignore
        }
      }
      
      const result = JSON.parse(stdout)
      
      if (result.error) {
        throw new Error(result.error)
      }
      
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

