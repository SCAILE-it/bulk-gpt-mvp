/**
 * ABOUTME: Schedules page for managing scheduled agent runs
 * ABOUTME: Users can view, edit, enable/disable, and delete schedules
 */

'use client'

import { ScheduleList } from '@/components/schedules/ScheduleList'
import { PageWithTabs } from '@/components/layout/PageWithTabs'
import { Clock } from 'lucide-react'

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

