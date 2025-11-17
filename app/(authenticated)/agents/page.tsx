/**
 * ABOUTME: Agents page - unified view of all agents
 * ABOUTME: Shows all agents including Bulk Agent as unified cards
 * ABOUTME: Shows pre-configured packages for agency clients
 */

'use client'

import { AgentsList } from '@/components/agents/AgentsList'
import { PackageRunsSection } from '@/components/agents/PackageRunsSection'
import { BulkProcessorErrorBoundary } from '@/components/ErrorBoundary'
import { Zap } from 'lucide-react'

export default function AgentsPage() {
  return (
    <BulkProcessorErrorBoundary>
      <div className="h-full flex flex-col bg-background text-foreground">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-6xl p-6 space-y-6">
            {/* Pre-configured Packages Section (for clients) */}
            <PackageRunsSection />
            
            {/* All Agents Section */}
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                  All Agents
                </h2>
                <p className="text-sm text-muted-foreground">
                  Run any agent on-demand or schedule recurring runs
                </p>
              </div>
              <AgentsList />
            </div>
          </div>
        </div>
      </div>
    </BulkProcessorErrorBoundary>
  )
}
