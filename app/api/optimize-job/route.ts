import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { ALL_GTM_TOOLS } from '@/lib/types/gtm-types'

// ABOUTME: Server-side API route for AI-powered job optimization
// ABOUTME: Analyzes user prompts and suggests improvements + output columns + tool suggestions

const SYSTEM_PROMPT = `You are a bulk data processing expert. Analyze the user's prompt and optimize it for structured AI output.

Given:
- User's raw prompt (may be vague or unclear)
- Available CSV columns
- Available GTM enrichment tools (for data enrichment, web research, email/phone validation, company research, etc.)

Your task:
1. Improve the prompt for clarity and effectiveness
2. Suggest 2-5 output columns based on what the prompt naturally produces
3. Suggest 0-3 GTM tools that would help complete this task (ONLY if truly beneficial - do not suggest tools unnecessarily)
4. Explain your reasoning briefly

Return JSON:
{
  "optimizedPrompt": "clear, specific, actionable prompt with {{variables}} preserved",
  "outputColumns": [
    {"name": "column_name", "description": "what this contains"}
  ],
  "suggestedTools": ["tool-name-1", "tool-name-2"],
  "reasoning": "1-sentence explanation of changes and why tools were suggested"
}

Guidelines:
- Preserve ALL {{variable}} placeholders exactly
- Make prompts specific and structured
- Suggest columns that match the prompt's natural outputs
- ONLY suggest tools if they would significantly improve the task (e.g., web-search for bio generation, email-validate for contact verification, company-data for company research)
- If no tools are beneficial, return empty array for suggestedTools
- Optimize for Gemini's structured output capabilities`

export async function POST(req: Request) {
  try {
    const { prompt, csvColumns } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid prompt provided' },
        { status: 400 }
      )
    }

    if (!csvColumns || !Array.isArray(csvColumns)) {
      return NextResponse.json(
        { error: 'Invalid csvColumns provided' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured')
      return NextResponse.json(
        { error: 'API not configured', fallback: true },
        { status: 500 }
      )
    }

    // Initialize Gemini client (using model name from Gemini API list)
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Prepare GTM tools list for AI context
    const toolsList = ALL_GTM_TOOLS.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')

    // Combine system prompt + user prompt into single text (no systemInstruction support)
    const fullPrompt = `${SYSTEM_PROMPT}

---

User prompt: "${prompt}"
CSV columns: ${csvColumns.join(', ')}

Available GTM Tools:
${toolsList}

Optimize this job and return JSON.`

    // Call Gemini with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

    try {
      const result = await model.generateContent(fullPrompt)

      clearTimeout(timeoutId)

      const text = result.response.text()

      // Extract JSON from potential markdown code block
      let jsonText = text.trim()
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '')
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '')
      }

      const parsed = JSON.parse(jsonText)

      // Validate response structure
      if (!parsed.optimizedPrompt || !parsed.outputColumns || !Array.isArray(parsed.outputColumns)) {
        throw new Error('Invalid response structure from Gemini')
      }

      // Ensure suggestedTools is an array (default to empty if not provided)
      if (!parsed.suggestedTools || !Array.isArray(parsed.suggestedTools)) {
        parsed.suggestedTools = []
      }

      // Validate that suggested tools exist in ALL_GTM_TOOLS
      const validToolNames = ALL_GTM_TOOLS.map(t => t.name)
      parsed.suggestedTools = parsed.suggestedTools.filter((tool: string) =>
        validToolNames.includes(tool)
      )

      return NextResponse.json(parsed)
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  } catch (error) {
    console.error('Optimization error:', error)

    // Return fallback indicating optimization failed
    return NextResponse.json(
      {
        error: 'Optimization failed',
        fallback: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
