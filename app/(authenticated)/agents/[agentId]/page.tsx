/**
 * ABOUTME: Single-page agent interfaces - dedicated pages for specific agents
 * ABOUTME: Routes: /agents/bulk, /agents/aeo_analytics, etc.
 */

'use client'

import { useParams } from 'next/navigation'
import { BulkProcessorErrorBoundary } from '@/components/ErrorBoundary'
import BulkProcessor from '@/components/bulk/BulkProcessor'
import AEOProcessor from '@/components/agents/AEOProcessor'

export default function AgentPage() {
  const params = useParams()
  const agentId = params?.agentId as string

  // Bulk agent - render the bulk processor
  if (agentId === 'bulk') {
    return (
      <BulkProcessorErrorBoundary>
        <BulkProcessor />
      </BulkProcessorErrorBoundary>
    )
  }

  // AEO Analytics agent - render the AEO processor
  if (agentId === 'aeo_analytics') {
    return (
      <BulkProcessorErrorBoundary>
        <AEOProcessor />
      </BulkProcessorErrorBoundary>
    )
  }

  // For other agents, redirect to agents list (they use modals)
  return null
}

