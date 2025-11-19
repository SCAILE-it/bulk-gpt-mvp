import useSWR from 'swr'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export interface HomeStats {
  totalBatches: number
  completedBatches: number
  totalRowsProcessed: number
  successRate: number
  averageProcessingTime: number // seconds
  totalTokens: number
  rowsPerSecond: number
  resourceCounts?: {
    leads: number
    keywords: number
    content: number
    campaigns: number
  }
  recentBatches: Array<{
    id: string
    csv_filename: string
    status: string
    created_at: string
    total_rows: number
    processed_rows: number
    agent_id?: string | null
    agent_name?: string | null
    agent_icon?: string | null
  }>
}

const fetcher = async (): Promise<HomeStats> => {
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Fetch stats from API route (includes recent batches now)
  const statsResponse = await fetch('/api/dashboard/stats')
  if (!statsResponse.ok) {
    throw new Error('Failed to fetch dashboard stats')
  }
  const statsData = await statsResponse.json()

  return {
    totalBatches: statsData.totalBatches || 0,
    completedBatches: statsData.completedBatches || 0,
    totalRowsProcessed: statsData.totalRowsProcessed || 0,
    successRate: statsData.successRate || 0,
    averageProcessingTime: statsData.averageProcessingTime || 0,
    totalTokens: statsData.totalTokens || 0,
    rowsPerSecond: statsData.rowsPerSecond || 0,
    resourceCounts: statsData.resourceCounts,
    recentBatches: statsData.recentBatches || [],
  }
}

export function useHomeStats() {
  const router = useRouter()
  const { data: stats, isLoading, error, mutate } = useSWR<HomeStats>(
    'home-stats',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: false,
      dedupingInterval: 10000, // 10 seconds
      keepPreviousData: true,
      onError: () => {
        router.push('/auth')
      },
    }
  )

  // Poll every 3 seconds when batches are processing
  useEffect(() => {
    if (!stats) return

    const hasProcessingBatches = stats.recentBatches.some(
      (batch) => batch.status === 'processing' || batch.status === 'pending'
    )

    if (!hasProcessingBatches) return

    const interval = setInterval(() => {
      mutate()
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [stats, mutate])

  return {
    stats,
    isLoading,
    error,
    refreshStats: mutate,
  }
}

