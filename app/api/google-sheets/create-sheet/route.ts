/**
 * API route for creating Google Sheets with data
 * Requires Google OAuth access token
 */

import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/errors'

interface CreateSheetRequest {
  accessToken: string
  title: string
  data: string[][] // 2D array: [headers, ...rows]
}

/**
 * POST /api/google-sheets/create-sheet
 * Creates a new Google Sheet with provided data
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as CreateSheetRequest

    if (!body.accessToken) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      )
    }

    if (!body.title || !body.data || !Array.isArray(body.data)) {
      return NextResponse.json(
        { error: 'Title and data array required' },
        { status: 400 }
      )
    }

    const { accessToken, title, data } = body

    // Step 1: Create a new spreadsheet
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title,
        },
      }),
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || 'Failed to create spreadsheet'
      
      if (createResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid or expired access token. Please re-authenticate.' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: createResponse.status }
      )
    }

    const createData = await createResponse.json()
    const spreadsheetId = createData.spreadsheetId

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Failed to get spreadsheet ID' },
        { status: 500 }
      )
    }

    // Step 2: Write data to the spreadsheet
    // Google Sheets API has a limit of 10 million cells per request
    // For large datasets, we'll write in batches if needed
    // Calculate column count from first row
    const columnCount = data[0]?.length || 0
    if (columnCount === 0) {
      return NextResponse.json(
        { error: 'No data to write' },
        { status: 400 }
      )
    }

    const maxCellsPerRequest = 10000000 // Google's limit
    const maxRowsPerBatch = Math.max(1, Math.floor(maxCellsPerRequest / columnCount))
    
    const batches = []
    for (let i = 0; i < data.length; i += maxRowsPerBatch) {
      batches.push(data.slice(i, i + maxRowsPerBatch))
    }

    // Write all batches sequentially
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const startRow = batchIndex * maxRowsPerBatch + 1 // Sheets are 1-indexed
      const endRow = startRow + batch.length - 1
      // Calculate end column letter (A-Z, then AA-ZZ, etc.)
      // Simple approach: use column count to determine range
      let endCol = 'Z'
      if (columnCount > 26) {
        // For >26 columns, use AA, AB, etc.
        const firstLetter = String.fromCharCode(64 + Math.floor((columnCount - 1) / 26))
        const secondLetter = String.fromCharCode(65 + ((columnCount - 1) % 26))
        endCol = firstLetter + secondLetter
      } else if (columnCount > 0) {
        endCol = String.fromCharCode(64 + columnCount)
      }
      const range = `Sheet1!A${startRow}:${endCol}${endRow}`

      const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: batch,
          }),
        }
      )

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || 'Failed to write data'
        
        // If first batch fails, fail the whole operation
        if (batchIndex === 0) {
          return NextResponse.json(
            { error: `Failed to write data: ${errorMessage}` },
            { status: updateResponse.status }
          )
        }
        
        // Log error for subsequent batches but continue
        logError(new Error(`Failed to write batch ${batchIndex + 1}: ${errorMessage}`), {
          context: 'googleSheetsCreateSheet',
          spreadsheetId,
          batchIndex,
        })
      }
    }

    // Step 3: Get the spreadsheet URL
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      rowsWritten: data.length,
    })
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'googleSheetsCreateSheet',
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

