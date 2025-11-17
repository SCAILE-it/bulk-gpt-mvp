import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'
import { HubSpotClient } from '@/lib/integrations/hubspot'
import { decryptApiKey } from '@/lib/integrations/encryption'

/**
 * POST /api/integrations/sync
 * Sync data from an integration (read or write)
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
    const { integrationId, syncType = 'read', dataType = 'contacts' } = body

    if (!integrationId) {
      return NextResponse.json(
        { error: 'integrationId is required' },
        { status: 400 }
      )
    }

    if (!['read', 'write', 'full'].includes(syncType)) {
      return NextResponse.json(
        { error: 'syncType must be read, write, or full' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', userId)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Create sync record
    const { data: syncRecord, error: syncError } = await supabase
      .from('integration_syncs')
      .insert({
        user_id: userId,
        integration_id: integrationId,
        provider: integration.provider,
        sync_type: syncType,
        status: 'processing',
      })
      .select()
      .single()

    if (syncError) {
      console.error('Failed to create sync record:', syncError)
      return NextResponse.json(
        { error: 'Failed to start sync' },
        { status: 500 }
      )
    }

    // Perform sync based on provider
    try {
      let recordsSynced = 0
      let recordsTotal = 0

      if (integration.provider === 'hubspot') {
        // Decrypt API key using pgsodium (similar to zola-aisdkv5 pattern)
        // Convert BYTEA to base64 string for decryption function
        const encryptedKeyBase64 = Buffer.from(integration.api_key_encrypted as Uint8Array).toString('base64')
        const apiKey = await decryptApiKey(encryptedKeyBase64)
        const client = new HubSpotClient({ apiKey })

        if (syncType === 'read' || syncType === 'full') {
          // Read data from HubSpot
          if (dataType === 'contacts') {
            let after: string | undefined
            do {
              const result = await client.getContacts(100, after)
              recordsTotal += result.results.length

              // Store in integration_data table
              const inserts = result.results.map((contact) => ({
                user_id: userId,
                integration_id: integrationId,
                provider: integration.provider,
                external_id: contact.id,
                data_type: 'contact',
                data: contact,
              }))

              if (inserts.length > 0) {
                await supabase.from('integration_data').upsert(inserts, {
                  onConflict: 'user_id,provider,external_id,data_type',
                })
                recordsSynced += inserts.length
              }

              after = result.paging?.next?.after
            } while (after)
          } else if (dataType === 'companies') {
            let after: string | undefined
            do {
              const result = await client.getCompanies(100, after)
              recordsTotal += result.results.length

              const inserts = result.results.map((company) => ({
                user_id: userId,
                integration_id: integrationId,
                provider: integration.provider,
                external_id: company.id,
                data_type: 'company',
                data: company,
              }))

              if (inserts.length > 0) {
                await supabase.from('integration_data').upsert(inserts, {
                  onConflict: 'user_id,provider,external_id,data_type',
                })
                recordsSynced += inserts.length
              }

              after = result.paging?.next?.after
            } while (after)
          }
        }

        // Update sync record
        await supabase
          .from('integration_syncs')
          .update({
            status: 'completed',
            records_synced: recordsSynced,
            records_total: recordsTotal,
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncRecord.id)

        // Update integration last_synced_at
        await supabase
          .from('integrations')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', integrationId)
      } else {
        // Instantly and Phantombuster implementations would go here
        throw new Error(`Provider ${integration.provider} not yet implemented`)
      }

      return NextResponse.json({
        syncId: syncRecord.id,
        recordsSynced,
        recordsTotal,
        status: 'completed',
      })
    } catch (error) {
      // Update sync record with error
      await supabase
        .from('integration_syncs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncRecord.id)

      throw error
    }
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

