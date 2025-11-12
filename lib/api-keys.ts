/**
 * ABOUTME: API key management service for power-user programmatic access
 * ABOUTME: Handles secure key generation, verification, listing, and revocation
 */

import { createHash, randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { logError } from '@/lib/errors'

export interface ApiKey {
  id: string
  name: string
  key?: string // Only returned on creation
  prefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export interface UsageStats {
  batchesToday: number
  rowsToday: number
  batchesThisMonth: number
  rowsThisMonth: number
  totalBatches: number
  totalRows: number
  dailyBatchLimit: number
  dailyRowLimit: number
  planType: string
}

/**
 * Generate a new API key for a user
 * Format: bgpt_<32_random_chars>
 * Key is hashed with SHA-256 before storage
 */
export async function generateApiKey(userId: string, name: string): Promise<ApiKey> {
  // Generate secure random key
  const randomPart = randomBytes(24).toString('base64url') // URL-safe base64
  const key = `bgpt_${randomPart}`
  const prefix = key.slice(0, 12) // bgpt_<first8>
  const hash = createHash('sha256').update(key).digest('hex')

  const { data, error } = await supabaseAdmin
    .from('user_api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: hash,
      key_prefix: prefix
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create API key: ${error.message}`)

  return {
    id: data.id,
    name: data.name,
    key, // Only time we return the actual key!
    prefix,
    createdAt: data.created_at,
    lastUsedAt: null,
    revokedAt: null
  }
}

/**
 * Verify an API key and return the associated user ID
 * Updates last_used_at timestamp if valid
 */
export async function verifyApiKey(key: string): Promise<string | null> {
  if (!key || !key.startsWith('bgpt_')) {
    return null
  }

  const hash = createHash('sha256').update(key).digest('hex')

  const { data, error } = await supabaseAdmin
    .from('user_api_keys')
    .select('user_id, revoked_at')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .single()

  if (error || !data) return null

  // Update last used timestamp asynchronously (fire and forget)
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  supabaseAdmin
    .from('user_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', hash)

  return data.user_id
}

/**
 * List all API keys for a user (excludes revoked by default)
 */
export async function listApiKeys(userId: string, includeRevoked = false): Promise<ApiKey[]> {
  let query = supabaseAdmin
    .from('user_api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!includeRevoked) {
    query = query.is('revoked_at', null)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to list API keys: ${error.message}`)

  return (data || []).map(item => ({
    id: item.id,
    name: item.name,
    prefix: item.key_prefix,
    createdAt: item.created_at,
    lastUsedAt: item.last_used_at,
    revokedAt: item.revoked_at
  }))
}

/**
 * Revoke an API key (soft delete - sets revoked_at timestamp)
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('user_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId) // Ensure user owns this key

  if (error) throw new Error(`Failed to revoke API key: ${error.message}`)
}

/**
 * Get usage statistics for a user
 */
export async function getUserUsage(userId: string): Promise<UsageStats | null> {
  const { data, error } = await supabaseAdmin
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // If no record exists yet, return default stats
    if (error.code === 'PGRST116') {
      return {
        batchesToday: 0,
        rowsToday: 0,
        batchesThisMonth: 0,
        rowsThisMonth: 0,
        totalBatches: 0,
        totalRows: 0,
        dailyBatchLimit: 5,
        dailyRowLimit: 5000,
        planType: 'beta'
      }
    }
    throw new Error(`Failed to get usage: ${error.message}`)
  }

  // Determine limits based on plan
  const limits = getPlanLimits(data.plan_type)

  return {
    batchesToday: data.batches_created_today || 0,
    rowsToday: data.rows_processed_today || 0,
    batchesThisMonth: data.batches_created_this_month || 0,
    rowsThisMonth: data.rows_processed_this_month || 0,
    totalBatches: data.total_batches || 0,
    totalRows: data.total_rows_processed || 0,
    dailyBatchLimit: limits.dailyBatchLimit,
    dailyRowLimit: limits.dailyRowLimit,
    planType: data.plan_type
  }
}

/**
 * Check if user can process a batch (checks usage limits)
 * @param userId - User ID to check limits for
 * @param rowCount - Number of rows in the batch
 * @param testMode - If true, bypasses batch limit check (allows testing even when limit reached)
 * @returns Object with allowed status and detailed reason if not allowed
 */
export async function checkUsageLimits(
  userId: string,
  rowCount: number,
  testMode = false
): Promise<{
  allowed: boolean
  reason?: string
  batchesToday?: number
  dailyBatchLimit?: number
  rowsToday?: number
  dailyRowLimit?: number
  resetTime?: string
}> {
  // Note: check_usage_limits is a RETURNS TABLE function, so it returns an array
  const { data, error } = await supabaseAdmin
    .rpc('check_usage_limits', { p_user_id: userId }) as {
      data: Array<{
        can_process: boolean
        reason: string
        batches_today: number
        rows_today: number
        daily_batch_limit: number
        daily_row_limit: number
      }> | null
      error: unknown
    }

  if (error) {
    logError(error instanceof Error ? error : new Error('Usage limit check failed'), {
      source: 'checkUsageLimits',
      userId
    })
    // Fail open - allow the request but log error
    return { allowed: true }
  }

  // Extract first row from table result
  const result = data?.[0]

  if (!result) {
    return {
      allowed: false,
      reason: 'Unable to verify usage limits'
    }
  }

  // Calculate reset time (midnight UTC tomorrow)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  const resetTime = tomorrow.toISOString()

  // In test mode, bypass batch limit check but still check row limit
  if (testMode) {
    // Only check row limit for test mode
    const wouldExceedRows = (result.rows_today + rowCount) > result.daily_row_limit
    if (wouldExceedRows) {
      return {
        allowed: false,
        reason: `Test mode: This would exceed your daily row limit. You have ${result.rows_today}/${result.daily_row_limit} rows processed today. Limit resets at ${new Date(resetTime).toLocaleString()}.`,
        batchesToday: result.batches_today,
        dailyBatchLimit: result.daily_batch_limit,
        rowsToday: result.rows_today,
        dailyRowLimit: result.daily_row_limit,
        resetTime
      }
    }
    // Test mode allowed - batch limit bypassed
    return { allowed: true }
  }

  // Full batch mode - check both batch and row limits
  if (!result.can_process) {
    // Determine which limit was hit
    const isBatchLimit = result.batches_today >= result.daily_batch_limit
    const isRowLimit = result.rows_today >= result.daily_row_limit

    let reason = result.reason || 'Daily limit reached'
    
    // Enhance error message with reset time and suggestions
    if (isBatchLimit) {
      reason = `Daily batch limit reached. You've processed ${result.batches_today}/${result.daily_batch_limit} batches today. Limit resets at ${new Date(resetTime).toLocaleString()}. Tip: Use "Test" mode (⌘T) to test your prompt without using a batch.`
    } else if (isRowLimit) {
      reason = `Daily row limit reached. You've processed ${result.rows_today}/${result.daily_row_limit} rows today. Limit resets at ${new Date(resetTime).toLocaleString()}.`
    }

    return {
      allowed: false,
      reason,
      batchesToday: result.batches_today,
      dailyBatchLimit: result.daily_batch_limit,
      rowsToday: result.rows_today,
      dailyRowLimit: result.daily_row_limit,
      resetTime
    }
  }

  // Also check if this specific batch would exceed daily row limit
  const wouldExceedRows = (result.rows_today + rowCount) > result.daily_row_limit
  if (wouldExceedRows) {
    return {
      allowed: false,
      reason: `This batch would exceed your daily row limit. You have ${result.rows_today}/${result.daily_row_limit} rows processed today, and this batch has ${rowCount} rows. Limit resets at ${new Date(resetTime).toLocaleString()}.`,
      batchesToday: result.batches_today,
      dailyBatchLimit: result.daily_batch_limit,
      rowsToday: result.rows_today,
      dailyRowLimit: result.daily_row_limit,
      resetTime
    }
  }

  return { allowed: true }
}

/**
 * Helper: Get plan limits
 */
function getPlanLimits(planType: string) {
  const plans = {
    beta: { dailyBatchLimit: 5, dailyRowLimit: 5000 },
    free: { dailyBatchLimit: 5, dailyRowLimit: 5000 },
    starter: { dailyBatchLimit: 50, dailyRowLimit: 50000 },
    pro: { dailyBatchLimit: 500, dailyRowLimit: 500000 },
    enterprise: { dailyBatchLimit: 9999, dailyRowLimit: 9999999 }
  }
  return plans[planType as keyof typeof plans] || plans.beta
}
