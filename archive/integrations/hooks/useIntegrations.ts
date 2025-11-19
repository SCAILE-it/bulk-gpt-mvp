import { useCallback } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { toast } from 'sonner'
import type { Integration, IntegrationProvider } from '@/lib/integrations/types'

export interface UseIntegrationsReturn {
  integrations: Integration[]
  isLoading: boolean
  connectIntegration: (provider: IntegrationProvider, apiKey: string) => Promise<Integration | null>
  disconnectIntegration: (integrationId: string) => Promise<void>
  syncIntegration: (integrationId: string, syncType?: 'read' | 'write' | 'full', dataType?: string) => Promise<void>
  refreshIntegrations: () => Promise<void>
}

// Fetcher function with performance logging
const fetcher = async (url: string) => {
  const startTime = performance.now()
  const res = await fetch(url)
  const fetchTime = performance.now() - startTime
  
  if (!res.ok) {
    throw new Error('Failed to fetch')
  }
  
  const parseStart = performance.now()
  const data = await res.json()
  const parseTime = performance.now() - parseStart
  const totalTime = performance.now() - startTime
  
  console.log(`[PERF] Integrations fetch:`, {
    fetch: `${fetchTime.toFixed(2)}ms`,
    parse: `${parseTime.toFixed(2)}ms`,
    total: `${totalTime.toFixed(2)}ms`,
  })
  
  return data.integrations || []
}

export function useIntegrations(): UseIntegrationsReturn {
  // Auto-caching, revalidation, deduplication with SWR
  const { data: integrations = [], isLoading, mutate } = useSWR('/api/integrations', fetcher, {
    revalidateOnFocus: false, // Don't refetch on window focus
    revalidateOnReconnect: false, // Don't refetch on reconnect
    dedupingInterval: 5000, // Dedupe requests within 5s
    revalidateIfStale: false, // Don't revalidate stale data automatically (use cache)
    keepPreviousData: true, // Show previous data while revalidating
    revalidateOnMount: false, // Don't revalidate on mount if we have cached data
    fallbackData: [], // Instant initial render with empty array
  })

  // Connect mutation with optimistic update
  const { trigger: connectIntegrationMutation } = useSWRMutation(
    '/api/integrations',
    async (url, { arg }: { arg: { provider: IntegrationProvider, apiKey: string } }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arg),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to connect integration')
      }
      return await res.json()
    },
    {
      onSuccess: (integration: Integration) => {
        // Optimistically update cache
        mutate((currentIntegrations: Integration[] = []) => {
          const filtered = currentIntegrations.filter(i => i.provider !== integration.provider)
          return [...filtered, integration]
        }, false)
        
        toast.success(`${integration.provider} connected successfully`)
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to connect integration')
      },
    }
  )

  // Disconnect mutation
  const { trigger: disconnectIntegrationMutation } = useSWRMutation(
    '/api/integrations',
    async (url, { arg }: { arg: { integrationId: string } }) => {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: arg.integrationId }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to disconnect integration')
      }
    },
    {
      onSuccess: () => {
        mutate() // Revalidate to get fresh list
        toast.success('Integration disconnected')
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to disconnect integration')
      },
    }
  )

  // Sync mutation
  const { trigger: syncIntegrationMutation } = useSWRMutation(
    '/api/integrations/sync',
    async (url, { arg }: { arg: { integrationId: string, syncType?: string, dataType?: string } }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: arg.integrationId,
          syncType: arg.syncType || 'read',
          dataType: arg.dataType || 'contacts',
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to sync integration')
      }
      return await res.json()
    },
    {
      onSuccess: (result: { recordsSynced: number }) => {
        mutate() // Refresh to update lastSyncedAt
        toast.success(`Synced ${result.recordsSynced} records`)
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to sync integration')
      },
    }
  )

  return {
    integrations,
    isLoading: isLoading && integrations.length === 0, // Only show loading if no cached data
    connectIntegration: useCallback(async (provider: IntegrationProvider, apiKey: string) => {
      try {
        return await connectIntegrationMutation({ provider, apiKey }) as Integration
      } catch (error) {
        return null
      }
    }, [connectIntegrationMutation]),
    disconnectIntegration: useCallback(async (integrationId: string) => {
      // Optimistically remove from UI
      mutate((currentIntegrations: Integration[] = []) => 
        currentIntegrations.filter(i => i.id !== integrationId), 
        false
      )

      try {
        await disconnectIntegrationMutation({ integrationId })
      } catch (error) {
        // Rollback on error
        mutate()
        throw error
      }
    }, [disconnectIntegrationMutation, mutate]),
    syncIntegration: useCallback(async (
      integrationId: string,
      syncType: 'read' | 'write' | 'full' = 'read',
      dataType = 'contacts'
    ) => {
      try {
        await syncIntegrationMutation({ integrationId, syncType, dataType })
      } catch (error) {
        throw error
      }
    }, [syncIntegrationMutation]),
    refreshIntegrations: useCallback(async () => {
      await mutate() // Force revalidation
    }, [mutate]),
  }
}
