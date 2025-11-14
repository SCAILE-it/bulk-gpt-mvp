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

    // Convert data to CSV format (works with drive.file scope)
    // Drive API can import CSV files and convert them to Google Sheets
    const csvContent = data.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const cellStr = String(cell || '')
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    ).join('\n')

    // Create spreadsheet using Drive API (works with drive.file scope)
    // Upload CSV file and convert to Google Sheets format using multipart upload
    const boundary = `----WebKitFormBoundary${Date.now()}`
    const metadata = JSON.stringify({
      name: title,
      mimeType: 'application/vnd.google-apps.spreadsheet',
    })
    
    // Build multipart body correctly for Drive API
    const multipartBody = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadata,
      `--${boundary}`,
      'Content-Type: text/csv',
      '',
      csvContent,
      `--${boundary}--`,
    ].join('\r\n')

    const createResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&convert=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || errorData.error || 'Failed to create spreadsheet'
      
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
    const spreadsheetId = createData.id

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Failed to get spreadsheet ID' },
        { status: 500 }
      )
    }

    // Get the spreadsheet URL
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

