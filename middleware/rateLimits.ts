/**
 * Rate limiting configuration and middleware
 * Protects v1 from overload while we build v2
 */

export const RATE_LIMITS = {
  // Batch processing limits
  maxRowsPerBatch: 1000,
  maxBatchesPerUser: 5,
  maxConcurrentBatches: 1,
  
  // API rate limits
  requestsPerMinute: 60,
  requestsPerHour: 500,
  
  // File upload limits
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxUploadsPerHour: 20,
} as const

export interface UserLimits {
  userId: string
  currentBatches: number
  totalBatchesToday: number
  lastRequestTime: number
  requestsThisMinute: number
  requestsThisHour: number
}

// In-memory store for MVP (move to Redis for production)
const userLimitsMap = new Map<string, UserLimits>()

export function checkRateLimits(userId: string, rowCount: number): {
  allowed: boolean
  reason?: string
  limit?: number
  current?: number
} {
  const now = Date.now()
  const userLimits = userLimitsMap.get(userId) || {
    userId,
    currentBatches: 0,
    totalBatchesToday: 0,
    lastRequestTime: now,
    requestsThisMinute: 0,
    requestsThisHour: 0,
  }

  // Check row count limit
  if (rowCount > RATE_LIMITS.maxRowsPerBatch) {
    return {
      allowed: false,
      reason: `Beta limit: Maximum ${RATE_LIMITS.maxRowsPerBatch} rows per batch`,
      limit: RATE_LIMITS.maxRowsPerBatch,
      current: rowCount,
    }
  }

  // Check concurrent batches
  if (userLimits.currentBatches >= RATE_LIMITS.maxConcurrentBatches) {
    return {
      allowed: false,
      reason: 'Please wait for your current batch to complete',
      limit: RATE_LIMITS.maxConcurrentBatches,
      current: userLimits.currentBatches,
    }
  }

  // Check daily batch limit
  if (userLimits.totalBatchesToday >= RATE_LIMITS.maxBatchesPerUser) {
    return {
      allowed: false,
      reason: `Beta limit: Maximum ${RATE_LIMITS.maxBatchesPerUser} batches per day`,
      limit: RATE_LIMITS.maxBatchesPerUser,
      current: userLimits.totalBatchesToday,
    }
  }

  // Update limits
  userLimits.currentBatches += 1
  userLimits.totalBatchesToday += 1
  userLimits.lastRequestTime = now
  userLimitsMap.set(userId, userLimits)

  return { allowed: true }
}

export function releaseBatch(userId: string): void {
  const userLimits = userLimitsMap.get(userId)
  if (userLimits) {
    userLimits.currentBatches = Math.max(0, userLimits.currentBatches - 1)
    userLimitsMap.set(userId, userLimits)
  }
}

// Reset daily limits (call from cron job)
export function resetDailyLimits(): void {
  Array.from(userLimitsMap.entries()).forEach(([userId, limits]) => {
    limits.totalBatchesToday = 0
    limits.requestsThisHour = 0
    limits.requestsThisMinute = 0
    userLimitsMap.set(userId, limits)
  })
}

// Beta message to show users
export function getBetaLimitMessage(): string {
  return `
🚧 **Beta Limitations**
• Max ${RATE_LIMITS.maxRowsPerBatch.toLocaleString()} rows per batch
• Max ${RATE_LIMITS.maxBatchesPerUser} batches per day
• Max ${RATE_LIMITS.maxConcurrentBatches} concurrent batch

Need more? [Join the waitlist for unlimited access →](https://forms.gle/xxx)
  `.trim()
}




