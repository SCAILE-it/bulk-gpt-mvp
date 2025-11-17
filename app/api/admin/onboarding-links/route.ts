/**
 * API Route: Admin Onboarding Links
 * POST /api/admin/onboarding-links - Generate tailored onboarding link for client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/utils/logger'
import { randomBytes } from 'crypto'

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

    // Check if user is an agency
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { package_id } = body

    if (!package_id) {
      return NextResponse.json(
        { error: 'package_id is required' },
        { status: 400 }
      )
    }

    // Verify package belongs to agency
    const { data: packageData, error: packageError } = await supabase
      .from('agency_packages')
      .select('id, name')
      .eq('id', package_id)
      .eq('agency_user_id', user.id)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    // Generate unique onboarding link
    const token = randomBytes(32).toString('hex')
    const onboardingLink = `${token}`

    // Store link in user_profiles (will be used when client signs up)
    // For now, we'll return the link - client will use it during signup
    // In production, you might want to store this in a separate table with expiration

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const fullLink = `${baseUrl}/auth/signup?onboarding=${onboardingLink}&package=${package_id}`

    return NextResponse.json({
      onboarding_link: onboardingLink,
      full_url: fullLink,
      package_id,
      package_name: packageData.name,
    }, { status: 201 })
  } catch (error) {
    logError('Error in POST /api/admin/onboarding-links', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

