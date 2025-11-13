/**
 * API route for Google Sheets integration
 * Handles fetching public Google Sheets (no OAuth required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/errors'

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

export async function POST(request: NextRequest) {
  let body: { action?: string; spreadsheetId?: string; range?: string } | null = null
  try {
    body = await request.json()
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    const { action, spreadsheetId, range } = body

    if (!GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      )
    }

    switch (action) {
      case 'fetch': {
        if (!spreadsheetId) {
          return NextResponse.json(
            { error: 'Spreadsheet ID required' },
            { status: 400 }
          )
        }

        // Fetch public sheet data using Google Sheets API (no OAuth token needed)
        const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range || 'A1:Z1000'}?key=${GOOGLE_API_KEY}`
        
        const response = await fetch(sheetsUrl, {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error?.message || errorData.error || 'Failed to fetch sheet data'
          
          // Provide more helpful error messages for private sheets
          if (
            response.status === 403 ||
            errorMessage.includes('PERMISSION_DENIED') ||
            errorMessage.includes('permission') ||
            errorMessage.includes('access denied') ||
            errorMessage.toLowerCase().includes('forbidden')
          ) {
            return NextResponse.json(
              { error: 'Sheet is not publicly accessible. Please set sharing to "Anyone with the link can view" in Google Sheets sharing settings.' },
              { status: 403 }
            )
          }
          
          return NextResponse.json(
            { error: errorMessage },
            { status: response.status }
          )
        }

        const data = await response.json()
        return NextResponse.json({
          values: data.values || [],
          spreadsheetId,
        })
      }

      case 'getMetadata': {
        if (!spreadsheetId) {
          return NextResponse.json(
            { error: 'Spreadsheet ID required' },
            { status: 400 }
          )
        }

        // Get spreadsheet metadata (public access)
        const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_API_KEY}`
        
        const response = await fetch(metadataUrl, {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          // Don't fail metadata fetch, just return empty title
          return NextResponse.json({
            title: null,
            sheets: [],
          })
        }

        const data = await response.json()
        return NextResponse.json({
          title: data.properties?.title || null,
          sheets: data.sheets?.map((sheet: { properties?: { title?: string; sheetId?: number } }) => ({
            title: sheet.properties?.title,
            sheetId: sheet.properties?.sheetId,
          })) || [],
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'googleSheetsAPI',
      action: body?.action,
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

