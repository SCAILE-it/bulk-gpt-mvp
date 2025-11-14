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
  const startTime = Date.now()
  console.log('[Google Sheets Export] Request received')
  
  try {
    const body = (await request.json()) as CreateSheetRequest
    console.log('[Google Sheets Export] Body parsed:', {
      hasAccessToken: !!body.accessToken,
      tokenLength: body.accessToken?.length,
      title: body.title,
      dataRows: body.data?.length,
      dataColumns: body.data?.[0]?.length,
    })

    if (!body.accessToken) {
      console.error('[Google Sheets Export] Missing access token')
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      )
    }

    if (!body.title || !body.data || !Array.isArray(body.data)) {
      console.error('[Google Sheets Export] Invalid request:', {
        hasTitle: !!body.title,
        hasData: !!body.data,
        isArray: Array.isArray(body.data),
      })
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

    console.log('[Google Sheets Export] Calling Google Drive API...')
    console.log('[Google Sheets Export] Request details:', {
      url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&convert=true',
      method: 'POST',
      csvContentLength: csvContent.length,
      boundary,
    })
    
    const createResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&convert=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    })

    console.log('[Google Sheets Export] Google Drive API response:', {
      status: createResponse.status,
      statusText: createResponse.statusText,
      ok: createResponse.ok,
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('[Google Sheets Export] Google Drive API error:', {
        status: createResponse.status,
        statusText: createResponse.statusText,
        errorText: errorText.substring(0, 500),
      })
      
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { raw: errorText.substring(0, 200) }
      }
      
      const errorMessage = errorData.error?.message || errorData.error || errorData.raw || 'Failed to create spreadsheet'
      
      if (createResponse.status === 401) {
        console.error('[Google Sheets Export] 401 Unauthorized - token invalid or expired')
        return NextResponse.json(
          { error: 'Invalid or expired access token. Please re-authenticate.', details: errorMessage },
          { status: 401 }
        )
      }
      
      if (createResponse.status === 403) {
        console.error('[Google Sheets Export] 403 Forbidden - permission denied')
        return NextResponse.json(
          { error: 'Permission denied. Please ensure Google Drive API is enabled and you have granted the necessary permissions.', details: errorMessage },
          { status: 403 }
        )
      }

      console.error('[Google Sheets Export] API error:', errorMessage)
      return NextResponse.json(
        { error: errorMessage, details: errorData },
        { status: createResponse.status }
      )
    }

    const createData = await createResponse.json()
    console.log('[Google Sheets Export] Google Drive API success:', {
      hasId: !!createData.id,
      id: createData.id,
      name: createData.name,
    })
    
    const spreadsheetId = createData.id

    if (!spreadsheetId) {
      console.error('[Google Sheets Export] No spreadsheet ID in response:', createData)
      return NextResponse.json(
        { error: 'Failed to get spreadsheet ID', details: createData },
        { status: 500 }
      )
    }

    // Get the spreadsheet URL
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    const duration = Date.now() - startTime
    
    console.log('[Google Sheets Export] Success:', {
      spreadsheetId,
      spreadsheetUrl,
      rowsWritten: data.length,
      duration: `${duration}ms`,
    })

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      rowsWritten: data.length,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[Google Sheets Export] Exception:', {
      error: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : 'No stack',
      duration: `${duration}ms`,
    })
    
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'googleSheetsCreateSheet',
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

