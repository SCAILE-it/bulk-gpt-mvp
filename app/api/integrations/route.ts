import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'
import { encryptApiKey } from '@/lib/integrations/encryption'
import type { IntegrationProvider } from '@/lib/integrations/types'
import { logError } from '@/lib/utils/logger'

/**
 * GET /api/integrations
 * List all integrations for the authenticated user
 */
export async function GET(request: NextRequest): Promise<Response> {
  let userId: string | null = null

  try {
    userId = await authenticateRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      logError('Supabase query error fetching integrations', error)
      return NextResponse.json(
        { error: 'Failed to fetch integrations', details: error.message },
        { status: 500 }
      )
    }

    // Transform to our format (don't expose encrypted API keys)
    const integrations = (data || []).map((integration) => ({
      id: integration.id,
      userId: integration.user_id,
      provider: integration.provider,
      connected: true,
      connectedAt: integration.connected_at,
      lastSyncedAt: integration.last_synced_at,
      syncEnabled: integration.sync_enabled,
      metadata: integration.metadata || {},
    }))

    return NextResponse.json({ integrations })
  } catch (error) {
    logError('List integrations error', error)
    return NextResponse.json(
      {
        error: 'Failed to list integrations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations
 * Create or update an integration
 */
export async function POST(request: NextRequest): Promise<Response> {
  let userId: string | null = null

  try {
    userId = await authenticateRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { provider, apiKey } = body

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'provider and apiKey are required' },
        { status: 400 }
      )
    }

    if (!['hubspot', 'instantly', 'phantombuster'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      )
    }

    // Encrypt API key using pgsodium (similar to zola-aisdkv5 pattern)
    const encryptedApiKey = await encryptApiKey(apiKey)

    const supabase = await createServerSupabaseClient()

    // Upsert integration
    // Note: api_key_encrypted is stored as BYTEA, so we need to convert the base64 string
    const { data, error } = await supabase
      .from('integrations')
      .upsert(
        {
          user_id: userId,
          provider: provider as IntegrationProvider,
          api_key_encrypted: Buffer.from(encryptedApiKey, 'base64'),
          connected_at: new Date().toISOString(),
          sync_enabled: true,
        },
        {
          onConflict: 'user_id,provider',
        }
      )
      .select()
      .single()

    if (error) {
      logError('Supabase upsert error creating integration', error)
      return NextResponse.json(
        { error: 'Failed to save integration', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      provider: data.provider,
      connected: true,
      connectedAt: data.connected_at,
      lastSyncedAt: data.last_synced_at,
      syncEnabled: data.sync_enabled,
      metadata: data.metadata || {},
    })
  } catch (error) {
    logError('Create integration error', error)
    return NextResponse.json(
      {
        error: 'Failed to create integration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/integrations
 * Delete an integration
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  let userId: string | null = null

  try {
    userId = await authenticateRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { integrationId } = body

    if (!integrationId) {
      return NextResponse.json(
        { error: 'integrationId is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('id', integrationId)
      .eq('user_id', userId) // Ensure user owns the integration

    if (error) {
      logError('Supabase delete error deleting integration', error)
      return NextResponse.json(
        { error: 'Failed to delete integration', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Delete integration error', error)
    return NextResponse.json(
      {
        error: 'Failed to delete integration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

