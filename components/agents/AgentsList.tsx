'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Zap, 
  Play, 
  Pause,
  TrendingUp,
  Users,
  Mail,
  BarChart3,
  FileText,
  Database,
  Megaphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import type { Agent, AgentStatus } from '@/lib/types/agents'
import type { AgentDefinition } from '@/lib/types/agent-definitions'
import { toast } from 'sonner'
import { AgentRunModal } from './AgentRunModal'
import { AccessibleStatusBadge, type StatusType } from '@/components/ui/accessible-status-badge'
import { formatProgress, formatProgressWithCount } from '@/lib/utils/progress-calculator'

function getAgentIcon(agentId: string, category?: string) {
  // Map by agent ID (from database)
  switch (agentId) {
    case 'bulk':
      return FileText
    case 'lead_crawler':
    case 'lead_enricher':
      return Users
    case 'seo_content_writer':
      return TrendingUp
    case 'outbound_copywriter':
      return Mail
    case 'campaign_setup':
      return Megaphone
    case 'seo_analytics':
    case 'aeo_analytics':
    case 'campaign_analytics':
    case 'market_analytics':
      return BarChart3
    default:
      // Fallback to category if ID not recognized
      if (category === 'analytics') return BarChart3
      if (category === 'content') return FileText
      if (category === 'data') return Database
      if (category === 'automation') return Zap
      return Zap
  }
}

function mapAgentStatusToStatusType(status: AgentStatus): StatusType {
  switch (status) {
    case 'running':
      return 'processing'
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'paused':
    case 'idle':
    default:
      return 'pending'
  }
}

function getStatusBadge(status: AgentStatus) {
  const statusType = mapAgentStatusToStatusType(status)
  
  // Handle special cases with custom labels
  if (status === 'paused') {
    return (
      <AccessibleStatusBadge 
        status="pending" 
        label="Paused"
        size="sm"
        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
      />
    )
  }
  
  if (status === 'idle') {
    return (
      <AccessibleStatusBadge 
        status="pending" 
        label="Idle"
        size="sm"
      />
    )
  }
  
  return <AccessibleStatusBadge status={statusType} size="sm" />
}

function formatTime(seconds: number | null): string {
  if (!seconds) return 'N/A'
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs.toFixed(0)}s`
}

export function AgentsList() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentDefinitions, setAgentDefinitions] = useState<AgentDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null)
  const [isRunModalOpen, setIsRunModalOpen] = useState(false)
  
  // Agents that have dedicated full-page interfaces
  const agentsWithDedicatedPages = ['bulk', 'aeo_analytics']

  const fetchAgents = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Fetch agent definitions and stats in parallel
      const [definitionsResponse, statsResponse] = await Promise.all([
        fetch('/api/agents').catch(err => {
          console.error('Error fetching agents:', err)
          return { ok: false, json: async () => ({ agents: [] }) }
        }),
        fetch('/api/agents/stats').catch(err => {
          console.warn('Error fetching agent stats:', err)
          return { ok: false, json: async () => ({ stats: {} }) }
        }),
      ])

      if (!definitionsResponse.ok) {
        console.error('Failed to fetch agents:', 'status' in definitionsResponse ? definitionsResponse.status : 'unknown')
        setAgents([])
        setIsLoading(false)
        return
      }
      
      if (!statsResponse.ok) {
        console.warn('Failed to fetch agent stats, using defaults')
      }

      const definitionsData = await definitionsResponse.json()
      const definitions: AgentDefinition[] = definitionsData.agents || []
      
      console.log('[AgentsList] Fetched agents:', definitions.length, definitions.map(d => d.id))
      
      if (definitions.length === 0) {
        console.warn('[AgentsList] No agents returned from API')
        setAgents([])
        setIsLoading(false)
        return
      }
      
      // Store definitions for modal access
      setAgentDefinitions(definitions)
      
      const statsData = statsResponse.ok ? await statsResponse.json() : { stats: {} }
      const stats = statsData.stats || {}

      // Track previous stats to detect batch completions
      const previousStats = agents.length > 0 
        ? Object.fromEntries(agents.map(a => [a.id, { currentJobId: a.currentJobId, status: a.status }]))
        : {}

      // Convert AgentDefinition to Agent format with real stats
      const agentsData: Agent[] = definitions.map((def) => {
        const agentStats = stats[def.id] || {
          runsCount: 0,
          successRate: 0,
          lastRunAt: null,
          averageExecutionTime: null,
          currentJobId: null,
          currentBatchProgress: undefined,
          lastBatchResourceCount: null,
        }

        // Determine status based on current job
        let status: AgentStatus = 'idle'
        if (agentStats.currentJobId) {
          status = 'running'
        } else if (agentStats.lastRunAt) {
          // Check if last run was recent and might still be processing
          // If last run was recent, might still be running
          // But we'll trust the currentJobId for accuracy
        }

        // Convert AgentDefinition to Agent format
        // Note: AgentDefinition uses category/input_type/output_type, Agent uses type/inputSchema/outputSchema
        return {
          id: def.id,
          type: (def.id === 'bulk' ? 'bulk' : def.id === 'aeo_analytics' ? 'market-analytics' : 'bulk') as AgentType, // Map category to type for compatibility
          name: def.name,
          description: def.description || '',
          status,
          lastRunAt: agentStats.lastRunAt || null,
          // Note: nextRunAt will be populated when scheduled_runs integration is complete
          // For now, scheduled runs are tracked separately in scheduled_runs table
          nextRunAt: null,
          runsCount: agentStats.runsCount || 0,
          successRate: agentStats.successRate || 0,
          averageExecutionTime: agentStats.averageExecutionTime || null,
          currentJobId: agentStats.currentJobId || null,
          inputSchema: {
            required: def.input_type === 'none' ? [] : [def.input_type],
            optional: [],
            description: `Requires ${def.input_type === 'none' ? 'no' : def.input_type} input`,
          },
          outputSchema: {
            fields: [def.output_type],
            description: `Produces ${def.output_type} output`,
          },
          metadata: {
            currentBatchProgress: agentStats.currentBatchProgress,
            lastBatchResourceCount: agentStats.lastBatchResourceCount,
          },
        }
      })
      
      setAgents(agentsData)

      // Check for batch completions and notify (only when transitioning from running to completed)
      agentsData.forEach((agent) => {
        const prev = previousStats[agent.id]
        if (prev && prev.currentJobId && prev.status === 'running' && agent.status !== 'running' && !agent.currentJobId) {
          // Batch completed - was running, now not running and no current job
          const isCompleted = agent.status === 'completed' || agent.status === 'failed'
          if (isCompleted && agent.status === 'completed') {
            const resourceCount = agent.metadata?.lastBatchResourceCount as number | null | undefined
            const resourceCountText = resourceCount !== null && resourceCount !== undefined && resourceCount > 0
              ? `${resourceCount} resource${resourceCount !== 1 ? 's' : ''} created`
              : 'Resources have been created automatically'
            
            toast.success(`${agent.name} completed`, {
              description: resourceCountText,
              duration: 6000,
              action: resourceCount && resourceCount > 0 ? {
                label: 'View Resources',
                onClick: () => {
                  // Navigate to resources page - determine type from agent output_type
                  const outputType = agent.outputSchema?.fields?.[0] || 'lead'
                  const resourceTypeMap: Record<string, string> = {
                    'lead': 'leads',
                    'keyword': 'keywords',
                    'content': 'content',
                    'campaign': 'campaigns',
                  }
                  const resourceType = resourceTypeMap[outputType] || 'leads'
                  window.location.href = `/resources?type=${resourceType}`
                }
              } : undefined,
            })
          }
        }
      })
    } catch (error) {
      console.error('Error fetching agents:', error)
      toast.error('Failed to load agents')
      // Fallback to empty array
      setAgents([])
    } finally {
      setIsLoading(false)
    }
  }, [agents])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents]) // Only fetch on mount

  useEffect(() => {
    // Poll for agent stats updates - adaptive interval based on activity
    // Faster polling when agents are running, slower when idle
    const hasRunningAgents = agents.some(a => a.status === 'running')
    const pollInterval = hasRunningAgents ? 3000 : 10000 // 3s when running, 10s when idle
    
    const interval = setInterval(() => {
      fetchAgents()
    }, pollInterval)

    return () => clearInterval(interval)
  }, [agents, fetchAgents]) // Re-create interval when agents change (to adjust polling frequency)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">All Agents</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor and manage all your AI agents
          </p>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="text-xs"
          onClick={() => {
            const idleAgents = agents.filter(a => a.status !== 'running')
            if (idleAgents.length === 0) {
              toast.info('All agents are already running')
            } else {
              // Note: Run all functionality requires backend API endpoint
              // Current implementation: users can run agents individually via Run button
              toast.info(`Run agents individually using the "Run" button on each agent card`)
            }
          }}
          disabled={agents.length === 0}
        >
          <Zap className="h-3.5 w-3.5 mr-1.5" />
          Run All
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-secondary/50 rounded w-1/3 mb-2" />
              <div className="h-3 bg-secondary/50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No agents available"
          description="Agent definitions will appear here once configured"
          size="sm"
        />
      ) : (
        <div className="grid gap-4">
          {agents.map((agent) => {
          const Icon = getAgentIcon(agent.id, agent.type)
          const isRunning = agent.status === 'running'
          const batchProgress = agent.metadata?.currentBatchProgress as { processed_rows: number; total_rows: number; progress_percent: number; started_at?: string } | undefined
          // Use accurate progress calculation instead of potentially misleading server value
          const progress = batchProgress 
            ? formatProgress(batchProgress.processed_rows, batchProgress.total_rows, false)
            : null
          
          // Calculate estimated time remaining
          let estimatedTimeRemaining: string | null = null
          if (batchProgress && batchProgress.processed_rows > 0 && batchProgress.started_at) {
            const elapsedMs = Date.now() - new Date(batchProgress.started_at).getTime()
            const elapsedSeconds = elapsedMs / 1000
            const rowsPerSecond = batchProgress.processed_rows / elapsedSeconds
            const remainingRows = batchProgress.total_rows - batchProgress.processed_rows
            const remainingSeconds = remainingRows / rowsPerSecond
            
            if (remainingSeconds > 0 && remainingSeconds < 3600) {
              const minutes = Math.ceil(remainingSeconds / 60)
              estimatedTimeRemaining = `~${minutes} min remaining`
            }
          }
          
          const progressText = batchProgress 
            ? formatProgressWithCount(batchProgress.processed_rows, batchProgress.total_rows, true) + ' rows'
            : null

          return (
            <div
              key={agent.id}
              className={cn(
                'border border-border rounded-lg p-5 transition-all hover:shadow-sm',
                isRunning && 'bg-primary/5 border-primary/30 shadow-sm'
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'p-3 rounded-lg shrink-0',
                    isRunning
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted/50 text-muted-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <h3 className="text-base font-semibold leading-tight">{agent.name}</h3>
                        {getStatusBadge(agent.status)}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {agent.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar for running agents */}
                  {isRunning && batchProgress && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground font-medium">Processing...</span>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-semibold">{progress}</span>
                          {estimatedTimeRemaining && (
                            <span className="text-xs text-muted-foreground">• {estimatedTimeRemaining}</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-muted/50 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300 rounded-full"
                          style={{ width: progress || '0%' }}
                        />
                      </div>
                      {progressText && (
                        <p className="text-xs text-muted-foreground mt-2">{progressText}</p>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">Runs</p>
                      <p className="text-base font-bold">{agent.runsCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">Success Rate</p>
                      <p className="text-base font-bold">{agent.successRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">Avg Time</p>
                      <p className="text-base font-bold">{formatTime(agent.averageExecutionTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">Last Run</p>
                      <p className="text-base font-bold">
                        {agent.lastRunAt
                          ? new Date(agent.lastRunAt).toLocaleDateString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
                    {isRunning ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            // Note: Pause functionality requires backend API endpoint and job cancellation
                            // Current implementation: jobs run to completion once started
                            toast.info(`Pause functionality coming soon. Jobs will complete once started.`)
                          }}
                        >
                          <Pause className="h-3.5 w-3.5 mr-1.5" />
                          Pause
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            // Note: Agent details modal can be added to show:
                            // - Execution history
                            // - Resource outputs
                            // - Performance metrics
                            // - Error logs
                            toast.info(`Agent details view coming soon`)
                          }}
                        >
                          View Details
                        </Button>
                      </>
                    ) : (
                      <>
                        {agentsWithDedicatedPages.includes(agent.id) ? (
                          <Button
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              router.push(`/agents/${agent.id}`)
                            }}
                          >
                            <Play className="h-3.5 w-3.5 mr-1.5" />
                            Open Page
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              const agentDef = agentDefinitions.find(d => d.id === agent.id)
                              if (agentDef) {
                                setSelectedAgent(agentDef)
                                setIsRunModalOpen(true)
                              } else {
                                toast.error('Agent definition not found')
                              }
                            }}
                          >
                            <Play className="h-3.5 w-3.5 mr-1.5" />
                            Run
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            // Note: Agent configuration modal can be added to allow:
                            // - Custom prompt templates
                            // - Input/output field mapping
                            // - Execution parameters
                            // - Schedule configuration
                            toast.info(`Agent configuration coming soon`)
                          }}
                        >
                          Configure
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        </div>
      )}

      {/* Agent Run Modal */}
      <AgentRunModal
        agent={selectedAgent}
        open={isRunModalOpen}
        onClose={() => {
          setIsRunModalOpen(false)
          setSelectedAgent(null)
        }}
      />
    </div>
  )
}

