import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

// ABOUTME: Server-side API route for AI-powered job optimization
// ABOUTME: Analyzes user prompts and suggests improvements + output columns

const SYSTEM_PROMPT = `You are a bulk data processing expert. Analyze the user's prompt and optimize it for structured AI output.

Given:
- User's raw prompt (may be vague or unclear)
- Available CSV columns

Your task:
1. Improve the prompt for clarity and effectiveness
2. Suggest 2-5 output columns based on what the prompt naturally produces
3. Explain your reasoning briefly

Return JSON:
{
  "optimizedPrompt": "clear, specific, actionable prompt with {{variables}} preserved",
  "outputColumns": [
    {"name": "column_name", "description": "what this contains"}
  ],
  "reasoning": "1-sentence explanation of changes"
}

Guidelines:
- Preserve ALL {{variable}} placeholders exactly
- Make prompts specific and structured
- Suggest columns that match the prompt's natural outputs
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

    // Combine system prompt + user prompt into single text (no systemInstruction support)
    const fullPrompt = `${SYSTEM_PROMPT}

---

User prompt: "${prompt}"
CSV columns: ${csvColumns.join(', ')}

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
