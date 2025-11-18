/**
 * ABOUTME: Bulk agent page - only ready agent
 * ABOUTME: Other agents archived as premature
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BulkProcessorErrorBoundary } from '@/components/ErrorBoundary'
import BulkProcessor from '@/components/bulk/BulkProcessor'

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

