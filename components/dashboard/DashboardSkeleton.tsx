import { Skeleton } from '@/components/ui/skeleton'

/**
 * Dashboard loading skeleton
 * Matches the structure of the actual dashboard for better perceived performance
 * Follows Single Responsibility Principle - only handles loading state UI
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-[120px] bg-zinc-900" />
            <Skeleton className="h-3 w-[200px] bg-zinc-900" />
          </div>
          <Skeleton className="h-8 w-[100px] bg-zinc-900" />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-zinc-900/40 border border-white/5 rounded-lg p-4">
              <Skeleton className="h-3 w-[80px] bg-zinc-800 mb-2" />
              <Skeleton className="h-6 w-[50px] bg-zinc-800" />
            </div>
          ))}
        </div>

        {/* Recent Batches Card */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[120px] bg-zinc-800" />
                <Skeleton className="h-3 w-[180px] bg-zinc-800" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-[70px] bg-zinc-800" />
                <Skeleton className="h-8 w-[70px] bg-zinc-800" />
              </div>
            </div>
          </div>
          <div className="p-6">
            {/* Table Skeleton */}
            <div className="space-y-3">
              {/* Table Header */}
              <div className="flex gap-4 pb-3 border-b border-white/5">
                <Skeleton className="h-3 w-[100px] bg-zinc-800" />
                <Skeleton className="h-3 w-[80px] bg-zinc-800" />
                <Skeleton className="h-3 w-[70px] ml-auto bg-zinc-800" />
                <Skeleton className="h-3 w-[70px] bg-zinc-800" />
                <Skeleton className="h-3 w-[50px] bg-zinc-800" />
              </div>
              {/* Table Rows */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 py-3">
                  <Skeleton className="h-4 w-[100px] bg-zinc-800" />
                  <Skeleton className="h-5 w-[80px] bg-zinc-800" />
                  <Skeleton className="h-4 w-[70px] ml-auto bg-zinc-800" />
                  <Skeleton className="h-4 w-[70px] bg-zinc-800" />
                  <Skeleton className="h-7 w-7 bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
