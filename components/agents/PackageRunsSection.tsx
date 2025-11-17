/**
 * PackageRunsSection Component
 * Displays pre-configured packages for agency clients
 * Shows assigned packages and allows running them
 */

'use client'

import { useState, useEffect } from 'react'
import { Package, Play, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PackageAssignment {
  id: string
  package_id: string
  package_name: string
  package_description: string | null
  status: 'active' | 'paused'
  agent_configs: Array<{
    agent_id: string
    config: Record<string, unknown>
    schedule?: string
  }>
  monthly_cost: number
  included_self_service_credits: number
  used_self_service_credits: number
  billing_period_start: string
}

interface PackageRun {
  id: string
  package_id: string
  agent_id: string
  batch_id: string | null
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export function PackageRunsSection() {
  const [assignments, setAssignments] = useState<PackageAssignment[]>([])
  const [recentRuns, setRecentRuns] = useState<PackageRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [runningPackages, setRunningPackages] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPackageData()
  }, [])

  const fetchPackageData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch assigned packages
      const assignmentsResponse = await fetch('/api/packages/assignments')
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json()
        setAssignments(assignmentsData.assignments || [])
      }

      // Fetch recent package runs
      const runsResponse = await fetch('/api/packages/runs?limit=10')
      if (runsResponse.ok) {
        const runsData = await runsResponse.json()
        setRecentRuns(runsData.runs || [])
      }
    } catch (error) {
      console.error('Error fetching package data:', error)
      // Don't show error toast - this section is optional for non-client users
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunPackage = async (assignment: PackageAssignment, agentConfig: PackageAssignment['agent_configs'][0]) => {
    const runKey = `${assignment.package_id}-${agentConfig.agent_id}`
    
    if (runningPackages.has(runKey)) {
      return
    }

    try {
      setRunningPackages(prev => new Set(prev).add(runKey))
      
      const response = await fetch(`/api/agents/${agentConfig.agent_id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: agentConfig.config,
          schedule: agentConfig.schedule ? {
            cron: agentConfig.schedule,
            enabled: false, // Don't schedule, just run now
          } : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to run package')
      }

      await response.json()
      toast.success(`Package run started: ${assignment.package_name}`)
      
      // Refresh runs
      fetchPackageData()
    } catch (error) {
      console.error('Error running package:', error)
      toast.error('Failed to run package')
    } finally {
      setRunningPackages(prev => {
        const next = new Set(prev)
        next.delete(runKey)
        return next
      })
    }
  }

  const getStatusIcon = (status: PackageRun['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      case 'failed':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />
      case 'running':
        return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: PackageRun['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Completed</Badge>
      case 'failed':
        return <Badge variant="default" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Failed</Badge>
      case 'running':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">Running</Badge>
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>
    }
  }

  // Don't show section if no assignments (for self-service users)
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-secondary/50 rounded w-1/3 animate-pulse" />
        <div className="h-32 bg-secondary/50 rounded animate-pulse" />
      </div>
    )
  }

  if (assignments.length === 0) {
    return null // Don't show section for users without packages
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Pre-configured Packages
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Run pre-configured agent workflows from your assigned packages
        </p>
      </div>

      {/* Package Cards */}
      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className={cn(
              'border border-border rounded-lg p-4 bg-secondary/40',
              assignment.status === 'paused' && 'opacity-60'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium">{assignment.package_name}</h3>
                  <Badge variant={assignment.status === 'active' ? 'default' : 'outline'} className="text-xs">
                    {assignment.status}
                  </Badge>
                </div>
                {assignment.package_description && (
                  <p className="text-xs text-muted-foreground">{assignment.package_description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>${assignment.monthly_cost.toFixed(2)}/mo</span>
                  <span>•</span>
                  <span>
                    Credits: ${assignment.used_self_service_credits.toFixed(2)} / ${assignment.included_self_service_credits.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Agent Configs */}
            <div className="space-y-2 mt-4 pt-4 border-t border-border">
              {assignment.agent_configs.map((agentConfig, index) => {
                const runKey = `${assignment.package_id}-${agentConfig.agent_id}`
                const isRunning = runningPackages.has(runKey)
                const recentRun = recentRuns.find(
                  r => r.package_id === assignment.package_id && r.agent_id === agentConfig.agent_id
                )

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-background/50 rounded text-xs"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium truncate">{agentConfig.agent_id}</span>
                      {agentConfig.schedule && (
                        <Badge variant="outline" className="text-xs">
                          Scheduled
                        </Badge>
                      )}
                      {recentRun && (
                        <div className="flex items-center gap-1">
                          {getStatusIcon(recentRun.status)}
                          {getStatusBadge(recentRun.status)}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRunPackage(assignment, agentConfig)}
                      disabled={isRunning || assignment.status === 'paused'}
                      className="text-xs h-7"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          Run Now
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
