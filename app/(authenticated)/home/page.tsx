/**
 * ABOUTME: Home page showcasing the AI processing engine - Cursor-level
 * ABOUTME: Demo shows multiple rows processing sequentially, actual CSV table structure, throughput metrics
 * OPTIMIZED: Demo animation lazy loaded for faster initial page load
 */

'use client'

import { useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, FileText
} from 'lucide-react'
import { useHomeStats } from '@/hooks/useHomeStats'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { DataErrorBoundary } from '@/components/ErrorBoundary'
import { motion, AnimatePresence } from 'framer-motion'

// Lazy load CSV demo animation - contains framer-motion animations and heavy state management
const CSVDemo = dynamic(
  () => import('@/components/home/CSVDemo').then(mod => ({ default: mod.CSVDemo })),
  {
    loading: () => <Skeleton className="h-[400px] w-full mb-4 sm:mb-6" />,
    ssr: false,
  }
)

export default function HomePage() {
  return (
    <DataErrorBoundary
      errorMessage="Failed to load dashboard data. Please check your connection and try again."
    >
      <HomePageContent />
    </DataErrorBoundary>
  )
}

// Reusable traffic light indicator component
function TrafficLightIndicator({ color = 'green' }: { color: 'green' | 'blue' }) {
  const primaryColor = color === 'blue' ? 'bg-blue-500/70' : 'bg-green-500/70'
  return (
    <div className="absolute top-4 right-4 flex gap-1">
      <div className={`h-2 w-2 rounded-full ${primaryColor}`} />
      <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
      <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
    </div>
  )
}

function HomePageContent() {
  const router = useRouter()
  const { stats, isLoading, error } = useHomeStats()

  // Callbacks for CSV demo - state is managed within CSVDemo component
  const handleCurrentProcessingChange = useCallback(() => {
    // State managed in CSVDemo component
  }, [])

  const handleThroughputChange = useCallback(() => {
    // State managed in CSVDemo component
  }, [])

  // If no stats after loading, use empty defaults
  const safeStats = useMemo(() => stats || {
    totalBatches: 0,
    completedBatches: 0,
    totalRowsProcessed: 0,
    successRate: 0,
    averageProcessingTime: 0,
    totalTokens: 0,
    rowsPerSecond: 0,
    resourceCounts: { leads: 0, keywords: 0, content: 0, campaigns: 0 },
    recentBatches: [],
  }, [stats])

  const hasBatches = safeStats?.totalBatches ? safeStats.totalBatches > 0 : false

  // Group batches by status
  const processingBatches = safeStats?.recentBatches?.filter(b =>
    b.status === 'processing' || b.status === 'pending'
  ) || []
  const completedBatches = useMemo(() =>
    safeStats?.recentBatches?.filter(b =>
      b.status === 'completed' || b.status === 'completed_with_errors'
    ) || [],
    [safeStats?.recentBatches]
  )

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 max-w-[1400px] mx-auto">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-md" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[400px] rounded-md" />
            <Skeleton className="h-[400px] rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  // If not loading and no stats, show skeleton while waiting
  if (!isLoading && !stats && !error) {
    return (
      <div className="p-3 sm:p-6 max-w-[1400px] mx-auto">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-md" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[400px] rounded-md" />
            <Skeleton className="h-[400px] rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  // If error occurred, show error state
  if (error && !isLoading) {
    return (
      <div className="p-3 sm:p-6 max-w-[1400px] mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Unable to load dashboard data. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative p-3 sm:p-6 max-w-[1400px] mx-auto">
      {/* Background Gradient for Depth */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-950/5 via-transparent to-amber-950/5 rounded-3xl pointer-events-none" />

      {/* Greeting Header with CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 sm:mb-8"
      >
        {(() => {
          const hour = new Date().getHours()
          const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
          return (
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight leading-tight">
                  {greeting}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl lg:max-w-3xl">
                  Process CSV data at scale with AI agents. Transform leads, keywords, content, and more with intelligent automation.
                </p>
              </div>
              
              {/* CTA Button - Using design system */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <button
                  onClick={() => router.push('/agents')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:shadow-lg hover:bg-primary/95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] hover:scale-[1.02]"
                >
                  <span>Run a Batch</span>
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M13 7l5 5m0 0l-5 5m5-5H6" 
                    />
                  </svg>
                </button>
              </motion.div>
            </div>
          )
        })()}
      </motion.div>

      {/* KPI Cards - Subtle Summary Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.38, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
      >
        <div className="relative bg-secondary/10 border border-border/80 rounded-xl p-4 sm:p-5 min-h-[120px] hover:bg-secondary/20 hover:border-border/90 transition-all duration-200 cursor-default">
          <TrafficLightIndicator color="green" />
          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider leading-[1.25]">Total Batches</div>
          <div className="text-2xl sm:text-3xl font-semibold text-foreground mb-1 tabular-nums">{safeStats.totalBatches}</div>
          {safeStats.completedBatches > 0 && (
            <div className="text-xs text-muted-foreground">
              {safeStats.completedBatches} completed
            </div>
          )}
        </div>

        <div className="relative bg-secondary/10 border border-border/80 rounded-xl p-4 sm:p-5 min-h-[120px] hover:bg-secondary/20 hover:border-border/90 transition-all duration-200 cursor-default">
          <TrafficLightIndicator color="green" />
          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider leading-[1.25]">Rows Processed</div>
          <div className="text-2xl sm:text-3xl font-semibold text-foreground mb-1 tabular-nums">
            {safeStats.totalRowsProcessed.toLocaleString()}
          </div>
          {safeStats.rowsPerSecond > 0 && (
            <div className="text-xs text-muted-foreground">
              {safeStats.rowsPerSecond.toFixed(1)} rows/sec avg
            </div>
          )}
        </div>

        <div className="relative bg-secondary/10 border border-border/80 rounded-xl p-4 sm:p-5 min-h-[120px] hover:bg-secondary/20 hover:border-border/90 transition-all duration-200 cursor-default">
          <TrafficLightIndicator color="blue" />
          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider leading-[1.25]">Success Rate</div>
          <div className="text-2xl sm:text-3xl font-semibold text-foreground mb-1 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-500/70 flex-shrink-0" />
            <span className="tabular-nums">{safeStats.successRate}%</span>
          </div>
          {safeStats.totalBatches > 0 && (
            <div className="text-xs text-muted-foreground">
              {safeStats.completedBatches}/{safeStats.totalBatches} batches
            </div>
          )}
        </div>

        <div className="relative bg-secondary/10 border border-border/80 rounded-xl p-4 sm:p-5 min-h-[120px] hover:bg-secondary/20 hover:border-border/90 transition-all duration-200 cursor-default">
          <TrafficLightIndicator color="green" />
          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider leading-[1.25]">Tokens Used</div>
          <div className="text-2xl sm:text-3xl font-semibold text-foreground mb-1 tabular-nums">
            {safeStats.totalTokens.toLocaleString()}
          </div>
          {safeStats.averageProcessingTime > 0 && (
            <div className="text-xs text-muted-foreground">
              {Math.round(safeStats.averageProcessingTime)}s avg time
            </div>
          )}
        </div>
      </motion.div>

      {/* Section Divider */}
      <div className="relative py-6 sm:py-8 mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/30"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-xs text-muted-foreground uppercase tracking-widest font-medium">Live Demo</span>
        </div>
      </div>

      {/* Cursor-style layered cards - Two separate cards with depth */}
      <div className="mb-6 sm:mb-8 relative min-h-[500px] sm:min-h-[700px]">
        {/* BACK CARD: processing.log - Positioned left and down - SMALLER width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-0 top-[80px] w-full sm:w-[35%] z-10"
        >
          <div className="border border-amber-500/30 rounded-xl sm:rounded-2xl overflow-hidden bg-amber-950/20"
          >
            {/* Compact Header */}
            <div className="border-b border-amber-500/20 px-4 sm:px-6 py-3.5 sm:py-4 bg-amber-900/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57] border border-black/10" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E] border border-black/10" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#28C840] border border-black/10" />
                </div>
                <span className="text-xs sm:text-sm text-foreground font-medium font-mono leading-[1.25] opacity-80">processing.log</span>
              </div>
              {safeStats.totalRowsProcessed > 0 && (
                <div className="text-xs sm:text-sm text-muted-foreground">
                  <span className="text-primary font-mono tabular-nums">{safeStats.totalRowsProcessed}</span> rows processed
                </div>
              )}
            </div>

            {/* Compact Content */}
            <div className="p-2 space-y-0.5">
              {/* IN PROGRESS */}
              {processingBatches.length > 0 && (
                <div className="mb-2">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-2.5 sm:mb-3.5 flex items-center gap-2 sm:gap-3 uppercase tracking-wider"
                  >
                    <motion.span
                      animate={{ opacity: [1, 0.6, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
                      className="text-primary text-xs sm:text-sm font-mono"
                    >
                      $
                    </motion.span>
                    <span>IN PROGRESS ({processingBatches.length})</span>
                  </motion.div>
                  <AnimatePresence>
                          {processingBatches.map((batch, index) => {
                            const progress = batch.total_rows > 0 ? Math.round((batch.processed_rows / batch.total_rows) * 100) : 0
                            return (
                              <motion.div
                                key={batch.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                whileHover={{ x: 4, transition: { duration: 0.2 } }}
                                className="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 sm:px-2 rounded hover:bg-background/50 cursor-pointer group overflow-hidden"
                                onClick={() => router.push(`/output?batch=${batch.id}`)}
                              >
                                <span className="text-muted-foreground w-12 sm:w-16 flex-shrink-0 font-mono text-[10px] sm:text-xs">
                                  [{new Date(batch.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}]
                                </span>
                                <span className="text-foreground flex-1 truncate group-hover:text-primary transition-colors flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs min-w-0">
                                  {batch.agent_icon && <span className="text-xs sm:text-sm leading-none flex-shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4">{batch.agent_icon}</span>}
                                  <span className="truncate min-w-0">{batch.csv_filename}</span>
                                </span>
                                <span className="text-primary flex items-center gap-1 font-mono text-[10px] sm:text-xs flex-shrink-0">
                                  <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
                                  <span className="tabular-nums">{batch.processed_rows}/{batch.total_rows}</span>
                                </span>
                                <div className="w-12 sm:w-16 h-1 bg-secondary rounded-full overflow-hidden flex-shrink-0">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className="h-full bg-primary"
                                  />
                                </div>
                                <motion.span
                                  key={progress}
                                  initial={{ scale: 1.1 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                  className="text-muted-foreground text-[10px] sm:text-xs font-mono tabular-nums flex-shrink-0 w-8 sm:w-auto"
                                >
                                  {progress}%
                                </motion.span>
                              </motion.div>
                            )
                          })}
                  </AnimatePresence>
                </div>
              )}

              {/* READY FOR REVIEW */}
              {completedBatches.length > 0 && (
                <div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-2.5 sm:mb-3.5 flex items-center gap-2 sm:gap-3 uppercase tracking-wider"
                  >
                    <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600 flex-shrink-0" />
                    <span>READY FOR REVIEW ({completedBatches.length})</span>
                  </motion.div>
                  <AnimatePresence>
                          {completedBatches.slice(0, 5).map((batch, index) => {
                            const timeAgo = new Date(batch.created_at)
                            const now = new Date()
                            const diffMinutes = Math.floor((now.getTime() - timeAgo.getTime()) / 60000)
                            const timeLabel = diffMinutes < 60
                              ? `${diffMinutes}m`
                              : diffMinutes < 1440
                                ? `${Math.floor(diffMinutes / 60)}h`
                                : 'now'

                            return (
                              <motion.div
                                key={batch.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                whileHover={{ x: 2, transition: { duration: 0.15 } }}
                                className="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 sm:px-2 rounded-md hover:bg-background/40 cursor-pointer group transition-colors overflow-hidden"
                                onClick={() => router.push(`/output?batch=${batch.id}`)}
                              >
                                <span className="text-muted-foreground w-12 sm:w-14 flex-shrink-0 font-mono text-[10px] sm:text-xs">
                                  [{new Date(batch.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}]
                                </span>
                                <span className="text-foreground flex-1 truncate group-hover:text-primary transition-colors flex items-center gap-1.5 text-[10px] sm:text-xs min-w-0">
                                  {batch.agent_icon && <span className="text-xs sm:text-sm leading-none flex-shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4">{batch.agent_icon}</span>}
                                  <span className="truncate min-w-0">{batch.csv_filename}</span>
                                </span>
                                <span className="text-green-600 font-mono text-[10px] sm:text-xs tabular-nums flex-shrink-0">+{batch.processed_rows}</span>
                                <span className="text-muted-foreground text-[10px] sm:text-xs font-mono flex-shrink-0">{timeLabel}</span>
                                <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-600 flex-shrink-0" />
                              </motion.div>
                            )
                          })}
                  </AnimatePresence>
                  {completedBatches.length > 5 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25 }}
                      className="mt-2 pt-2 border-t border-border/30"
                    >
                      <button
                        onClick={() => router.push('/output')}
                        className="text-[10px] sm:text-xs text-primary hover:text-primary/80 font-medium transition-colors w-full text-left px-1.5 sm:px-2 py-1 hover:bg-background/40 rounded-md"
                      >
                        View all {completedBatches.length} batches →
                      </button>
                    </motion.div>
                  )}
                </div>
              )}

              {processingBatches.length === 0 && completedBatches.length === 0 && (
                <EmptyState
                  icon={FileText}
                  title="No batches yet"
                  description="Get started by uploading a CSV file and processing it with an AI agent"
                  action={{
                    label: "Create First Batch",
                    onClick: () => router.push('/agents/bulk'),
                    variant: 'default'
                  }}
                  size="md"
                  variant="default"
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* FRONT CARD: CSV Demo - Positioned right and up - LARGER width with overlay */}
        {hasBatches && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-0 w-full sm:w-[65%] z-20"
          >
            <CSVDemo
              hasBatches={hasBatches}
              recentBatches={safeStats.recentBatches || []}
              onCurrentProcessingChange={handleCurrentProcessingChange}
              onThroughputChange={handleThroughputChange}
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}
