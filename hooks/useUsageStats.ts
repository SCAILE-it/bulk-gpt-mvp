import useSWR from 'swr'

export interface UsageStats {
  batchesToday: number
  rowsToday: number
  batchesThisMonth: number
  rowsThisMonth: number
  totalBatches: number
  totalRows: number
  dailyBatchLimit: number
  dailyRowLimit: number
  planType: string
}

const fetcher = async (): Promise<UsageStats> => {
  const response = await fetch('/api/usage')
  if (!response.ok) {
    throw new Error('Failed to load usage')
  }
  return await response.json()
}

export function useUsageStats() {
  const { data: usage, isLoading, error, mutate } = useSWR<UsageStats>(
    'usage-stats',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: false,
      dedupingInterval: 300000, // 5 minutes
      keepPreviousData: true,
      staleTime: 120000, // Consider data fresh for 2 minutes
    }
  )

  return {
    usage,
    isLoading,
    error,
    refreshUsage: mutate,
  }
}

