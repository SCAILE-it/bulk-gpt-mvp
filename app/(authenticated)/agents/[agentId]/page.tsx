/**
 * ABOUTME: Single-page bulk processing interface - power-user optimized
 * ABOUTME: Full-width, left-aligned, keyboard shortcuts, inline results
 * Routes: /agents/bulk (same as old /bulk/page.tsx)
 */

'use client'

import { useParams } from 'next/navigation'
import { BulkProcessorErrorBoundary } from '@/components/ErrorBoundary'
import BulkProcessor from '@/components/bulk/BulkProcessor'

export default function AgentPage() {
  const params = useParams()
  const agentId = params?.agentId as string

  // For bulk agent, render the exact same page as before
  if (agentId === 'bulk') {
    return (
      <BulkProcessorErrorBoundary>
        <BulkProcessor />
      </BulkProcessorErrorBoundary>
    )
  }

  // For other agents, redirect to agents list (they use modals)
  return null
}

