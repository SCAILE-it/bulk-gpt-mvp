/**
 * API route for Google Sheets integration
 * Handles server-side Google Sheets API calls
 */

import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/errors'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, accessToken, spreadsheetId, range } = body

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Google Sheets credentials not configured' },
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

        // Fetch sheet data using Google Sheets API
        const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range || 'A1:Z1000'}`
        
        const response = await fetch(sheetsUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          return NextResponse.json(
            { error: errorData.error?.message || 'Failed to fetch sheet data' },
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

        // Get spreadsheet metadata
        const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`
        
        const response = await fetch(metadataUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          return NextResponse.json(
            { error: errorData.error?.message || 'Failed to fetch sheet metadata' },
            { status: response.status }
          )
        }

        const data = await response.json()
        return NextResponse.json({
          title: data.properties?.title,
          sheets: data.sheets?.map((sheet: any) => ({
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

