/**
 * ABOUTME: Bulk agent page - only ready agent
 * ABOUTME: Other agents archived as premature
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { BulkProcessorErrorBoundary } from '@/components/ErrorBoundary'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load BulkProcessor - it's a large component (~80KB)
// Only loads when user navigates to /agents/bulk
const BulkProcessor = dynamic(
  () => import('@/components/bulk/BulkProcessor'),
  {
    loading: () => (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    ),
    ssr: false, // BulkProcessor is highly interactive, doesn't need SSR
  }
)

export default function AgentPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params?.agentId as string

  // Only bulk agent is ready - redirect others to /agents/bulk
  useEffect(() => {
    if (agentId !== 'bulk') {
      router.replace('/agents/bulk')
    }
  }, [agentId, router])

  // Bulk agent - render the bulk processor
  if (agentId === 'bulk') {
    return (
      <BulkProcessorErrorBoundary>
        <BulkProcessor />
      </BulkProcessorErrorBoundary>
    )
  }

  return null
}

