/**
 * API Route: Billing Invoices
 * GET /api/billing/invoices - List invoices for user
 * POST /api/billing/invoices - Create invoice (for agency, manual creation)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'
import { InvoiceCreate } from '@/lib/types/billing'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invoices, error } = await query

    if (error) {
      logError('Error fetching invoices', error)
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      )
    }

    return NextResponse.json({ invoices: invoices || [] })
  } catch (error) {
    logError('Error in GET /api/billing/invoices', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is an agency (only agencies can create invoices manually)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can create invoices manually' },
        { status: 403 }
      )
    }

    const body: InvoiceCreate = await request.json()
    const { billing_type, period_start, period_end, subtotal, tax, total, due_date } = body

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        invoice_number: invoiceNumber,
        billing_type,
        period_start,
        period_end,
        subtotal,
        tax: tax || 0,
        total,
        due_date: due_date || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      logError('Error creating invoice', error)
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      )
    }

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    logError('Error in POST /api/billing/invoices', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

