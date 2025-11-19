'use client'

import { useState, useEffect } from 'react'
import { Clock, Play, Pause, Trash2, Edit, MoreVertical, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCronExpression, formatDateInTimezone } from '@/lib/utils/cron'
import { toast } from 'sonner'
import type { ScheduledRun } from '@/lib/types/schedules'
import { AutoSkeleton } from '@/components/ui/auto-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ScheduleListProps {
  onEdit?: (schedule: ScheduledRun) => void
}

export function ScheduleList({ onEdit }: ScheduleListProps) {
  const [schedules, setSchedules] = useState<ScheduledRun[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/schedules')
      if (!response.ok) {
        throw new Error('Failed to fetch schedules')
      }
      const data = await response.json()
      setSchedules(data.schedules || [])
    } catch (error) {
      toast.error('Failed to load schedules')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
  }, [])

  const handleToggle = async (scheduleId: string, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !currentEnabled }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle schedule')
      }

      toast.success(currentEnabled ? 'Schedule paused' : 'Schedule enabled')
      fetchSchedules()
    } catch (error) {
      toast.error('Failed to toggle schedule')
    }
  }

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return
    }

    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete schedule')
      }

      toast.success('Schedule deleted')
      fetchSchedules()
    } catch (error) {
      toast.error('Failed to delete schedule')
    }
  }

  const handleRunNow = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/execute`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to execute schedule')
      }

      toast.success('Schedule execution started')
      fetchSchedules()
    } catch (error) {
      toast.error('Failed to execute schedule')
    }
  }


  return (
    <AutoSkeleton isLoading={isLoading}>
      {schedules.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No schedules yet"
          description="Create a schedule from the Agents page to run jobs automatically. Scheduled runs help you process data on a recurring basis."
          action={{
            label: 'Go to Agents',
            onClick: () => {
              window.location.href = '/agents'
            },
          }}
        />
      ) : (
        <div className="space-y-4">
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="bg-secondary/40 border border-border rounded-lg p-4 hover:bg-secondary/60 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-foreground">{schedule.name}</h3>
                {schedule.is_enabled ? (
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-xs">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-muted text-muted-foreground border border-border rounded text-xs">
                    Paused
                  </span>
                )}
              </div>

              {schedule.description && (
                <p className="text-xs text-muted-foreground mb-2">{schedule.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  <span>{formatCronExpression(schedule.cron_expression)}</span>
                </div>
                <div>
                  Action: <span className="font-medium text-foreground">{schedule.action}</span>
                </div>
                {schedule.next_run_at && (
                  <div>
                    Next run: <span className="font-medium text-foreground">
                      {formatDateInTimezone(schedule.next_run_at, schedule.timezone, 'PPpp')}
                    </span>
                  </div>
                )}
                {schedule.run_count > 0 && (
                  <div>
                    Runs: <span className="font-medium text-foreground">{schedule.run_count}</span>
                  </div>
                )}
                {schedule.last_run_status && (
                  <div className="flex items-center gap-1">
                    {schedule.last_run_status === 'success' ? (
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                    ) : schedule.last_run_status === 'failed' ? (
                      <XCircle className="h-3 w-3 text-red-400" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                    )}
                    <span className="capitalize">{schedule.last_run_status}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRunNow(schedule.id)}
                disabled={!schedule.is_enabled}
                className="h-8"
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Run Now
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    aria-label={`Actions for schedule ${schedule.name || schedule.id}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleToggle(schedule.id, schedule.is_enabled)}>
                    {schedule.is_enabled ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Enable
                      </>
                    )}
                  </DropdownMenuItem>
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(schedule)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleDelete(schedule.id)}
                    className="text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ))}
        </div>
      )}
    </AutoSkeleton>
  )
}

