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
  CheckCircle2, BarChart3, FileText
} from 'lucide-react'
import { useHomeStats } from '@/hooks/useHomeStats'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { DataErrorBoundary } from '@/components/ErrorBoundary'
import { PageWithTabs } from '@/components/layout/PageWithTabs'
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
      <PageWithTabs
        defaultValue="overview"
        tabs={[
          {
            value: 'overview',
            label: 'Overview',
            icon: <BarChart3 className="h-3.5 w-3.5" />,
            content: (
              <div className="p-6">
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
            ),
          },
        ]}
      />
    )
  }

  // If not loading and no stats, show skeleton while waiting
  if (!isLoading && !stats && !error) {
    return (
      <PageWithTabs
        defaultValue="overview"
        tabs={[
          {
            value: 'overview',
            label: 'Overview',
            icon: <BarChart3 className="h-3.5 w-3.5" />,
            content: (
              <div className="p-6">
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
            ),
          },
        ]}
      />
    )
  }

  // If error occurred, show error state
  if (error && !isLoading) {
    return (
      <PageWithTabs
        defaultValue="overview"
        tabs={[
          {
            value: 'overview',
            label: 'Overview',
            icon: <BarChart3 className="h-3.5 w-3.5" />,
            content: (
              <div className="p-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Unable to load dashboard data. Please try again.</p>
                </div>
              </div>
            ),
          },
        ]}
      />
    )
  }

  return (
    <PageWithTabs
      defaultValue="overview"
      tabs={[
        {
          value: 'overview',
          label: 'Overview',
          icon: <BarChart3 className="h-3.5 w-3.5" />,
          content: (
            <div className="p-3 sm:p-6 max-w-[1400px] mx-auto">
              {/* Greeting Header */}
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
                    <div className="flex flex-col xs:flex-row xs:items-center xs:gap-2 sm:gap-3 md:gap-4">
                      <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-2.5 xs:mb-0 tracking-tight leading-[1.15]">
                        {greeting}
                      </h1>
                      <p className="text-xs xs:text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
                        Process CSV data at scale with AI agents. Transform leads, keywords, content, and more with intelligent automation.
                      </p>
                    </div>
                  )
                })()}
              </motion.div>

              {/* KPI Cards - Subtle Summary Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.38, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-5 md:gap-6 lg:gap-7 xl:gap-8 mb-6 sm:mb-7 md:mb-8 lg:mb-10"
              >
                  <div className="bg-secondary/10 border border-border/50 rounded-lg p-3 xs:p-4 sm:p-5 md:p-6 lg:p-7 hover:bg-secondary/28 hover:border-border/70 transition-all duration-200 cursor-default">
                    <div className="text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold text-muted-foreground mb-2 xs:mb-2.5 sm:mb-3 md:mb-3.5 lg:mb-4 uppercase tracking-wider leading-[1.25]">Total Batches</div>
                    <div className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 xs:mb-2 sm:mb-2.5 md:mb-3 lg:mb-3.5 tabular-nums">{safeStats.totalBatches}</div>
                    {safeStats.completedBatches > 0 && (
                      <div className="text-[10px] xs:text-xs sm:text-sm md:text-base text-muted-foreground">
                        {safeStats.completedBatches} completed
                      </div>
                    )}
                  </div>

                  <div className="bg-secondary/10 border border-border/50 rounded-lg p-3 sm:p-5 hover:bg-secondary/28 hover:border-border/70 transition-all duration-200 cursor-default">
                    <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-2 sm:mb-3.5 uppercase tracking-wider leading-[1.25]">Rows Processed</div>
                    <div className="text-base sm:text-lg font-bold text-foreground mb-1.5 sm:mb-2.5 tabular-nums">
                      {safeStats.totalRowsProcessed.toLocaleString()}
                    </div>
                    {safeStats.rowsPerSecond > 0 && (
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {safeStats.rowsPerSecond.toFixed(1)} rows/sec avg
                      </div>
                    )}
                  </div>

                  <div className="bg-secondary/10 border border-border/50 rounded-lg p-3 sm:p-5 hover:bg-secondary/28 hover:border-border/70 transition-all duration-200 cursor-default">
                    <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-2 sm:mb-3.5 uppercase tracking-wider leading-[1.25]">Success Rate</div>
                    <div className="text-base sm:text-lg font-bold text-foreground mb-1.5 sm:mb-2.5 flex items-center gap-1.5 sm:gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                      <span className="tabular-nums">{safeStats.successRate}%</span>
                    </div>
                    {safeStats.totalBatches > 0 && (
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {safeStats.completedBatches}/{safeStats.totalBatches} batches
                      </div>
                    )}
                  </div>

                  <div className="bg-secondary/10 border border-border/50 rounded-lg p-3 sm:p-5 hover:bg-secondary/28 hover:border-border/70 transition-all duration-200 cursor-default">
                    <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-2 sm:mb-3.5 uppercase tracking-wider leading-[1.25]">Tokens Used</div>
                    <div className="text-base sm:text-lg font-bold text-foreground mb-1.5 sm:mb-2.5 tabular-nums">
                      {safeStats.totalTokens.toLocaleString()}
                    </div>
                    {safeStats.averageProcessingTime > 0 && (
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {Math.round(safeStats.averageProcessingTime)}s avg time
                      </div>
                    )}
                  </div>
              </motion.div>

              {/* CSV Demo - Lazy Loaded */}
              <CSVDemo
                hasBatches={hasBatches}
                recentBatches={safeStats.recentBatches || []}
                onCurrentProcessingChange={handleCurrentProcessingChange}
                onThroughputChange={handleThroughputChange}
              />

              {/* Activity Feed - Compact Supporting Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.34, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="mb-6 sm:mb-8 relative z-0"
              >
                <div className="border border-border/40 rounded-lg sm:rounded-xl overflow-hidden bg-secondary/8 backdrop-blur-sm"
                  style={{
                    boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.02) inset'
                  }}
                >
                  {/* Compact Header */}
                  <div className="border-b border-border/40 px-3 sm:px-5 py-2.5 sm:py-3.5 bg-secondary/18 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                    <div className="flex items-center gap-2 sm:gap-3.5">
                      <div className="flex gap-1 sm:gap-1.5 flex-shrink-0">
                        <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500/55" />
                        <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-yellow-500/55" />
                        <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500/55" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium font-mono leading-[1.25]">processing.log</span>
                    </div>
                    {safeStats.totalRowsProcessed > 0 && (
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
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
            </div>
          ),
        },
      ]}
    />
  )
}
