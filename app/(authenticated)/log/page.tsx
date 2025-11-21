/**
 * ABOUTME: Executions dashboard showing batch history and analytics
 * ABOUTME: Optimized with lazy-loaded components for better performance
 */

'use client'

import dynamic from 'next/dynamic'
import { Activity, Clock } from 'lucide-react'
import { PageWithTabs } from '@/components/layout/PageWithTabs'
import { DataErrorBoundary } from '@/components/ErrorBoundary'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load executions list - large table component
const ExecutionsList = dynamic(
  () => import('@/components/executions/ExecutionsList').then(mod => ({ default: mod.ExecutionsList })),
  {
    loading: () => (
      <div className="p-6">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-md" />
            ))}
          </div>
          <Skeleton className="h-[400px] rounded-md" />
        </div>
      </div>
    ),
    ssr: false,
  }
)

// Lazy load schedules list
const ScheduleList = dynamic(
  () => import('@/components/schedules/ScheduleList').then(mod => ({ default: mod.ScheduleList })),
  {
    loading: () => (
      <div className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-[400px] rounded-md" />
        </div>
      </div>
    ),
    ssr: false,
  }
)

export default function ExecutionsPage() {
  return (
    <DataErrorBoundary
      errorMessage="Failed to load executions data. Please check your connection and try again."
    >
      <PageWithTabs
        defaultValue="executions"
        maxWidth="max-w-full"
        tabs={[
          {
            value: 'executions',
            label: 'Executions',
            icon: <Activity className="h-3.5 w-3.5" />,
            content: <ExecutionsList />,
          },
          {
            value: 'scheduled',
            label: 'Scheduled',
            icon: <Clock className="h-3.5 w-3.5" />,
            content: (
              <div className="p-6">
                <ScheduleList />
              </div>
            ),
          },
        ]}
      />
    </DataErrorBoundary>
  )
}
