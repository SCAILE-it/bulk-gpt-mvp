import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { ALL_GTM_TOOLS } from '@/lib/types/gtm-types'

// ABOUTME: Server-side API route for AI-powered job optimization
// ABOUTME: Analyzes user prompts and suggests improvements + output columns + tool suggestions

const SYSTEM_PROMPT = `You are a bulk data processing expert. Analyze the user's job and optimize it holistically.

Given:
- User's raw prompt (may be vague or unclear)
- Available CSV columns
- Currently selected input columns (which columns user wants in output)
- Available GTM enrichment tools

Your task (based on what user wants optimized):
1. If optimizing INPUT: Suggest which input columns to include/exclude (some may be redundant like IDs, timestamps, or not needed for the task)
2. If optimizing TASK: Improve the prompt for clarity and effectiveness
3. If optimizing OUTPUT: Suggest 2-5 output columns and 0-3 GTM tools

Return JSON (only include fields that were optimized):
{
  "suggestedInputColumns": ["name", "email", "company"], // if optimizing input
  "optimizedPrompt": "clear, specific, actionable prompt with {{variables}} preserved", // if optimizing task
  "outputColumns": [ // if optimizing output
    {"name": "column_name", "description": "what this contains"}
  ],
  "suggestedTools": ["tool-name-1"], // if optimizing output
  "reasoning": "Brief explanation of all optimizations made"
}

Guidelines:
- Preserve ALL {{variable}} placeholders exactly in prompts
- For input columns: Exclude redundant/internal columns (IDs, timestamps, metadata) unless needed
- For output columns: Match the prompt's natural outputs
- ONLY suggest tools if truly beneficial (e.g., web-search for bio generation, email-validate for contact verification)
- If no tools are beneficial, return empty array for suggestedTools
- Optimize for Gemini's structured output capabilities`

export async function POST(req: Request) {
  try {
    const { 
      prompt, 
      csvColumns, 
      optimizeInput = false,
      optimizeTask = false,
      optimizeOutput = false,
      selectedInputColumns = []
    } = await req.json()

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

    // At least one optimization must be requested
    if (!optimizeInput && !optimizeTask && !optimizeOutput) {
      return NextResponse.json(
        { error: 'At least one optimization option must be selected' },
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

    // Build optimization context
    const optimizationContext = []
    if (optimizeInput) {
      optimizationContext.push(`- Optimize INPUT columns (currently selected: ${selectedInputColumns.join(', ') || 'all'})`)
    }
    if (optimizeTask) {
      optimizationContext.push(`- Optimize TASK prompt: "${prompt}"`)
    }
    if (optimizeOutput) {
      optimizationContext.push(`- Optimize OUTPUT columns and tools`)
    }

    // Combine system prompt + user prompt into single text (no systemInstruction support)
    const fullPrompt = `${SYSTEM_PROMPT}

---

Optimization requested:
${optimizationContext.join('\n')}

User prompt: "${prompt}"
All CSV columns: ${csvColumns.join(', ')}
Currently selected input columns: ${selectedInputColumns.length > 0 ? selectedInputColumns.join(', ') : 'all'}

Available GTM Tools:
${toolsList}

Optimize the requested aspects and return JSON.`

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

      // Validate response structure - must have reasoning
      if (!parsed.reasoning) {
        throw new Error('Invalid response structure from Gemini - missing reasoning')
      }

      // Validate optimized prompt if task optimization was requested
      if (optimizeTask && parsed.optimizedPrompt && typeof parsed.optimizedPrompt !== 'string') {
        throw new Error('Invalid optimizedPrompt in response')
      }

      // Validate output columns if output optimization was requested
      if (optimizeOutput && parsed.outputColumns && !Array.isArray(parsed.outputColumns)) {
        throw new Error('Invalid outputColumns in response')
      }

      // Validate suggested input columns if input optimization was requested
      if (optimizeInput && parsed.suggestedInputColumns && !Array.isArray(parsed.suggestedInputColumns)) {
        throw new Error('Invalid suggestedInputColumns in response')
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

      // Validate that suggested input columns exist in csvColumns
      if (parsed.suggestedInputColumns && Array.isArray(parsed.suggestedInputColumns)) {
        parsed.suggestedInputColumns = parsed.suggestedInputColumns.filter((col: string) =>
          csvColumns.includes(col)
        )
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
