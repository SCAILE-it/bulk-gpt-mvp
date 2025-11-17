import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'

/**
 * POST /api/analyse-website
 * Analyzes a website URL and extracts company context information
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

const SYSTEM_PROMPT = `You are an expert at analyzing company websites and extracting business context.

Given a website's HTML content, extract the following information:

**Context Variables:**
1. **Tone**: The communication style/tone used on the website (e.g., "Professional", "Friendly", "Technical", "Casual", "Formal")
2. **Target Countries**: Countries or regions the company targets (comma-separated string, e.g., "US, UK, Canada")
3. **Product Description**: A brief description of the main product or service (2-3 sentences max)
4. **Competitors**: Any competitors mentioned or implied (comma-separated string, e.g., "Salesforce, HubSpot")
5. **Target Industries**: Industries or sectors the company targets (comma-separated string, e.g., "SaaS, Technology, Sales")
6. **Compliance Flags**: Any compliance certifications or standards mentioned (comma-separated string, e.g., "SOC2, GDPR")

**Business Context:**
7. **ICP (Ideal Customer Profile)**: Describe the ideal customer based on website content - company size, industry, pain points, etc. (2-3 sentences)
8. **Countries**: Array of specific countries/regions mentioned (e.g., ["United States", "United Kingdom", "Canada"])
9. **Products**: Array of product names or service offerings mentioned (e.g., ["CRM", "Marketing Automation", "Sales Analytics"])
10. **Target Keywords**: Array of key terms/phrases the company seems to target (e.g., ["crm software", "sales automation", "lead management"])
11. **Competitor Keywords**: Array of competitor names or brands mentioned (e.g., ["Salesforce", "HubSpot", "Pipedrive"])

Return ONLY a valid JSON object with these fields. If a field cannot be determined, omit it or set arrays to empty arrays [].

Example output:
{
  "tone": "Professional",
  "targetCountries": "US, UK, Canada",
  "productDescription": "Cloud-based CRM platform for sales teams",
  "competitors": "Salesforce, HubSpot",
  "targetIndustries": "SaaS, Technology, Sales",
  "complianceFlags": "SOC2, GDPR",
  "icp": "B2B SaaS companies with 50-500 employees looking for sales automation and CRM solutions",
  "countries": ["United States", "United Kingdom", "Canada"],
  "products": ["CRM", "Sales Automation", "Lead Management"],
  "targetKeywords": ["crm software", "sales automation", "lead management"],
  "competitorKeywords": ["Salesforce", "HubSpot"]
}`

export const maxDuration = 30 // Max 30 seconds for website analysis

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    // Validate URL
    let validUrl = url.trim()
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = `https://${validUrl}`
    }

    // Validate URL format
    new URL(validUrl)
    
    // Fetch website content
    const response = await fetch(validUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BulkGPT/1.0; +https://bulkgpt.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    
    // Extract text content from HTML (simple approach - remove scripts, styles, etc.)
    const text = html
      // Remove script tags
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove style tags
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Extract text from common content tags
      .replace(/<[^>]+>/g, ' ')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim()
    
    // Limit to first 10000 characters to avoid token limits
    return text.substring(0, 10000)
  } catch (error) {
    throw new Error(`Failed to fetch website: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

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

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured')
      return NextResponse.json(
        { error: 'API not configured' },
        { status: 500 }
      )
    }

    // Fetch website content
    const websiteContent = await fetchWebsiteContent(url)

    if (!websiteContent || websiteContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract content from website' },
        { status: 400 }
      )
    }

    // Initialize Gemini client with Google Search Grounding
    // Uses web search to get more accurate and up-to-date information about the company
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      tools: [{ googleSearchRetrieval: {} }]
    })

    // Build prompt
    const fullPrompt = `${SYSTEM_PROMPT}

---

Website URL: ${url}

Website Content (first 10000 chars):
${websiteContent}

Extract the company context information and return JSON.`

    // Call Gemini with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000) // 25s timeout

    try {
      const result = await model.generateContent(fullPrompt)
      clearTimeout(timeoutId)

      const text = result.response.text()

      // Extract JSON from potential markdown code block
      let jsonText = text.trim()
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '')
      }

      const parsed = JSON.parse(jsonText)

      // Validate and clean response
      const response: Record<string, unknown> = {}
      
      // Context Variables (strings)
      const stringFields = ['tone', 'targetCountries', 'productDescription', 'competitors', 'targetIndustries', 'complianceFlags']
      for (const field of stringFields) {
        if (parsed[field] && typeof parsed[field] === 'string' && parsed[field].trim().length > 0) {
          response[field] = parsed[field].trim()
        }
      }
      
      // Business Context - ICP (string)
      if (parsed.icp && typeof parsed.icp === 'string' && parsed.icp.trim().length > 0) {
        response.icp = parsed.icp.trim()
      }
      
      // Business Context - Arrays
      const arrayFields = ['countries', 'products', 'targetKeywords', 'competitorKeywords']
      for (const field of arrayFields) {
        if (parsed[field] && Array.isArray(parsed[field])) {
          // Filter out empty strings and trim
          const cleaned = parsed[field]
            .filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
            .map((item: string) => item.trim())
          if (cleaned.length > 0) {
            response[field] = cleaned
          }
        }
      }

      return NextResponse.json(response)
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Analysis timeout - website took too long to analyze' },
          { status: 504 }
        )
      }

      console.error('Gemini analysis error:', error)
      throw error
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

