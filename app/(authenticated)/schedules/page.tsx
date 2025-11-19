/**
 * ABOUTME: Schedules page for managing scheduled agent runs
 * ABOUTME: Users can view, edit, enable/disable, and delete schedules
 */

'use client'

import dynamic from 'next/dynamic'
import { PageWithTabs } from '@/components/layout/PageWithTabs'
import { Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load ScheduleList for better initial page load performance
const ScheduleList = dynamic(
  () => import('@/components/schedules/ScheduleList').then(mod => ({ default: mod.ScheduleList })),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    ),
    ssr: false, // Schedule manager doesn't need SSR
  }
)

export default function SchedulesPage() {
  return (
    <PageWithTabs
      defaultValue="schedules"
      tabs={[
        {
          value: 'schedules',
          label: 'Schedules',
          icon: <Clock className="h-3.5 w-3.5" />,
          content: (
            <div className="p-6">
              <ScheduleList />
            </div>
          ),
        },
      ]}
    />
  )
}

