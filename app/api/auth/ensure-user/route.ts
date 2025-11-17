import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logError } from '@/lib/utils/logger'

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 })
    }

    // Upsert user record
    const { error } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })

    if (error) {
      logError('Error ensuring user exists', error, { userId, email })
      return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Error in ensure-user', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

