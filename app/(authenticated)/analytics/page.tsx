/**
 * ABOUTME: Analytics dashboard with charts and batch history
 * ABOUTME: Optimized with lazy-loaded components for better performance
 */

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { BarChart3, Activity } from 'lucide-react'
import { PageWithTabs } from '@/components/layout/PageWithTabs'
import { DataErrorBoundary } from '@/components/ErrorBoundary'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load heavy chart components for better initial load performance
const AnalyticsDashboard = dynamic(
  () => import('@/components/dashboard/AnalyticsDashboard').then(mod => ({ default: mod.AnalyticsDashboard })),
  {
    loading: () => (
      <div className="p-6">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-md" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[300px] rounded-md" />
            <Skeleton className="h-[300px] rounded-md" />
          </div>
        </div>
      </div>
    ),
    ssr: false, // Charts don't need SSR
  }
)

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

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('analytics')

  return (
    <DataErrorBoundary
      errorMessage="Failed to load analytics data. Please check your connection and try again."
    >
      <PageWithTabs
        defaultValue="analytics"
        value={activeTab}
        onValueChange={setActiveTab}
        maxWidth="max-w-full"
        tabs={[
          {
            value: 'analytics',
            label: 'Analytics',
            icon: <BarChart3 className="h-3.5 w-3.5" />,
            content: (
              <div className="p-6">
                <AnalyticsDashboard />
              </div>
            ),
          },
          {
            value: 'executions',
            label: 'Executions',
            icon: <Activity className="h-3.5 w-3.5" />,
            content: <ExecutionsList />,
          },
        ]}
      />
    </DataErrorBoundary>
  )
}
