/**
 * ABOUTME: Home page showcasing the AI processing engine - Cursor-level
 * ABOUTME: Demo shows multiple rows processing sequentially, actual CSV table structure, throughput metrics
 */

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CheckCircle2, BarChart3
} from 'lucide-react'
import { useHomeStats } from '@/hooks/useHomeStats'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { DataErrorBoundary } from '@/components/ErrorBoundary'
import { PageWithTabs } from '@/components/layout/PageWithTabs'
import { motion, AnimatePresence } from 'framer-motion'

interface DemoRow {
  id: number
  name: string
  description: string
  summary?: string
  status: 'pending' | 'processing' | 'completed'
}

// Row component with intelligent line clamping
function DataRow({ 
  row, 
  index, 
  maxLines, 
  typewriterText, 
  typewriterRowId, 
}: { 
  row: DemoRow
  index: number
  maxLines: number
  typewriterText: string
  typewriterRowId: number | null
  currentProcessingRow: number | null
}) {
  const descRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const applyStyles = () => {
      if (descRef.current) {
        descRef.current.style.setProperty('display', '-webkit-box', 'important')
        descRef.current.style.setProperty('-webkit-line-clamp', String(maxLines), 'important')
        descRef.current.style.setProperty('-webkit-box-orient', 'vertical', 'important')
        descRef.current.style.setProperty('overflow', 'hidden', 'important')
        descRef.current.style.setProperty('text-overflow', 'ellipsis', 'important')
      }
      if (summaryRef.current) {
        summaryRef.current.style.setProperty('display', '-webkit-box', 'important')
        summaryRef.current.style.setProperty('-webkit-line-clamp', String(maxLines), 'important')
        summaryRef.current.style.setProperty('-webkit-box-orient', 'vertical', 'important')
        summaryRef.current.style.setProperty('overflow', 'hidden', 'important')
        summaryRef.current.style.setProperty('text-overflow', 'ellipsis', 'important')
      }
    }
    
    // Apply immediately
    applyStyles()
    
    // Also apply after a short delay to ensure DOM is ready
    const timeout = setTimeout(applyStyles, 0)
    
    return () => clearTimeout(timeout)
  }, [maxLines])
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`grid grid-cols-[100px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] border-b border-border/25 last:border-0 transition-colors duration-200 min-w-[600px] ${
        row.status === 'processing' ? 'bg-primary/7' : 
        row.status === 'completed' ? 'bg-green-500/7' : 
        'bg-background'
      }`}
    >
      {/* Name */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-xs text-foreground border-r border-border/22 font-mono break-words leading-[1.5]" title={row.name}>
        {row.name}
      </div>
      
      {/* Description - Intelligent line clamping based on available rows */}
      <div 
        ref={descRef}
        className="px-3 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-xs text-foreground border-r border-border/22 font-mono break-words leading-[1.5]"
        title={row.description}
      >
        {row.description}
      </div>
      
      {/* Summary - Intelligent line clamping based on available rows */}
      <div 
        ref={summaryRef}
        className="px-3 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-xs font-mono break-words leading-[1.5]"
        title={row.summary}
      >
        {row.status === 'pending' && (
          <span className="text-muted-foreground/50">—</span>
        )}
        {row.status === 'processing' && typewriterRowId === row.id && (
          <span className="text-green-600 break-words block">
            {typewriterText}
            <span className="inline-block w-0.5 h-3 sm:h-3.5 bg-green-600 ml-0.5 animate-pulse" />
          </span>
        )}
        {row.status === 'completed' && row.summary && (
          <span className="text-green-600 break-words block">
            <span className="break-words">{row.summary}</span>
            <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 inline-block ml-1.5 sm:ml-2 text-green-600" />
          </span>
        )}
        {row.status === 'processing' && typewriterRowId !== row.id && (
          <span className="text-primary flex items-center gap-1.5 sm:gap-2">
            <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full border-2 border-primary/70 border-t-transparent animate-spin flex-shrink-0" />
            <span className="truncate text-[10px] sm:text-xs">Processing...</span>
          </span>
        )}
      </div>
    </motion.div>
  )
}

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
  const [demoRows, setDemoRows] = useState<DemoRow[]>([
    { id: 1, name: 'John Doe', description: 'Software engineer with 5 years experience in React and Node.js', status: 'pending' },
    { id: 2, name: 'Jane Smith', description: 'Data scientist specializing in machine learning and Python', status: 'pending' },
    { id: 3, name: 'Mike Johnson', description: 'Product designer with expertise in UX/UI and design systems', status: 'pending' },
  ])
  const [currentProcessingRow, setCurrentProcessingRow] = useState<number | null>(null)
  const [typewriterText, setTypewriterText] = useState('')
  const [typewriterRowId, setTypewriterRowId] = useState<number | null>(null)
  const [throughput, setThroughput] = useState({ rowsPerSecond: 0, tokensUsed: 0 })
  const [replayRows, setReplayRows] = useState<DemoRow[]>([])
  const [replayBatchName, setReplayBatchName] = useState<string>('')
  const [replayBatchAgentIcon, setReplayBatchAgentIcon] = useState<string | null>(null)
  const [isLoadingReplay, setIsLoadingReplay] = useState(false)
  
  // If no stats after loading, use empty defaults (define early, before hasBatches)
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

  const summaries = useMemo(() => [
    'Experienced full-stack engineer specializing in React and Node.js',
    'ML expert with strong Python skills and data analysis background',
    'Design leader focused on user-centered design and design systems'
  ], [])

  // Greeting logic removed - not used

  // Multi-row sequential processing demo
  // Run demo animation if no batches, or if batches exist but replay hasn't loaded yet
  useEffect(() => {
    const shouldShowDemo = !hasBatches || (hasBatches && replayRows.length === 0 && !isLoadingReplay)
    
    if (shouldShowDemo) {
      let rowIndex = 0
      let isRunning = true
      let typeInterval: NodeJS.Timeout | null = null
      let processingTimeout: NodeJS.Timeout | null = null
      let completionTimeout: NodeJS.Timeout | null = null
      let nextRowTimeout: NodeJS.Timeout | null = null
      let cycleTimeout: NodeJS.Timeout | null = null
      
      const cleanup = () => {
        if (typeInterval) clearInterval(typeInterval)
        if (processingTimeout) clearTimeout(processingTimeout)
        if (completionTimeout) clearTimeout(completionTimeout)
        if (nextRowTimeout) clearTimeout(nextRowTimeout)
        if (cycleTimeout) clearTimeout(cycleTimeout)
      }
      
      const processNextRow = () => {
        if (!isRunning) return
        
        if (rowIndex >= demoRows.length) {
          // Reset after all rows processed
          cleanup()
          rowIndex = 0
          setDemoRows(prev => prev.map(r => ({ ...r, status: 'pending' as const, summary: undefined })))
          setCurrentProcessingRow(null)
          setTypewriterText('')
          setTypewriterRowId(null)
          setThroughput({ rowsPerSecond: 0, tokensUsed: 0 })
          
          // Wait 2s before next cycle
          cycleTimeout = setTimeout(() => {
            if (isRunning) processNextRow()
          }, 2000)
          return
        }

        const currentRowIndex = rowIndex
        const row = demoRows[currentRowIndex]
        const summary = summaries[currentRowIndex]
        
        // Mark as processing
        setCurrentProcessingRow(row.id)
        setDemoRows(prev => prev.map(r => 
          r.id === row.id ? { ...r, status: 'processing' as const } : r
        ))
        setThroughput(prev => ({ rowsPerSecond: 1.2, tokensUsed: prev.tokensUsed + 45 }))
        
        // Process for 2 seconds
        processingTimeout = setTimeout(() => {
          if (!isRunning) return
          
          // Start typewriter for this row
          setTypewriterRowId(row.id)
          setTypewriterText('')
          
          // Typewriter effect (25ms per character)
          let charIndex = 0
          typeInterval = setInterval(() => {
            if (!isRunning) {
              if (typeInterval) clearInterval(typeInterval)
              return
            }
            
            if (charIndex < summary.length) {
              setTypewriterText(summary.slice(0, charIndex + 1))
              charIndex++
            } else {
              if (typeInterval) clearInterval(typeInterval)
              // Mark as completed
              completionTimeout = setTimeout(() => {
                if (!isRunning) return
                setDemoRows(prev => prev.map(r => 
                  r.id === row.id ? { ...r, status: 'completed' as const, summary: summary } : r
                ))
                setCurrentProcessingRow(null)
                setTypewriterText('')
                setTypewriterRowId(null)
                rowIndex++
                // Process next row after 0.5s
                nextRowTimeout = setTimeout(() => {
                  if (isRunning) processNextRow()
                }, 500)
              }, 500)
            }
          }, 25)
        }, 2000)
      }

      // Start processing after 1s
      const startTimer = setTimeout(() => {
        if (isRunning) processNextRow()
      }, 1000)
      
      return () => {
        isRunning = false
        cleanup()
        clearTimeout(startTimer)
      }
    } else {
      // Reset when demo shouldn't run (replay is active)
      setDemoRows(prev => prev.map(r => ({ ...r, status: 'pending' as const, summary: undefined })))
      setCurrentProcessingRow(null)
      setTypewriterText('')
      setTypewriterRowId(null)
      setThroughput({ rowsPerSecond: 0, tokensUsed: 0 })
    }
  }, [hasBatches, summaries, demoRows, replayRows.length, isLoadingReplay])

  // Group batches by status (must be before useEffect that uses them)
  const processingBatches = safeStats?.recentBatches?.filter(b => 
    b.status === 'processing' || b.status === 'pending'
  ) || []
  const completedBatches = useMemo(() => 
    safeStats?.recentBatches?.filter(b => 
      b.status === 'completed' || b.status === 'completed_with_errors'
    ) || [], 
    [safeStats?.recentBatches]
  )

  // Fetch replay data when we have completed batches (even if processing)
  useEffect(() => {
    const fetchReplayData = async () => {
      // Skip if already have replay data or currently loading
      if (replayRows.length > 0 || isLoadingReplay) {
        return
      }
      
      // Fetch if we have batches (even if processing)
      if (!hasBatches) {
        return
      }

      // Find the most recent completed batch (first one since completedBatches comes from recentBatches which is ordered DESC)
      // Prioritize batches from last 7 days, but fallback to any completed batch if none found
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const recentBatch = completedBatches.find(b => {
        const batchDate = new Date(b.created_at)
        return batchDate >= sevenDaysAgo && (b.status === 'completed' || b.status === 'completed_with_errors')
      }) || (completedBatches.length > 0 ? completedBatches[0] : null) // First completed batch is the most recent (since recentBatches is ordered by created_at DESC)

      if (!recentBatch) {
        console.log('No completed batch found for replay')
        return
      }

      console.log('Fetching replay for batch:', recentBatch.id, recentBatch.csv_filename, 'agent:', recentBatch.agent_id)

      setIsLoadingReplay(true)
      setReplayBatchName(recentBatch.csv_filename || `${recentBatch.agent_name || 'Agent'} Run`)
      setReplayBatchAgentIcon(recentBatch.agent_icon || null)

      try {
        const supabase = createClient()
        if (!supabase) return

        // First try batch_results (for bulk agent and other agents that use batch_results)
        const { data: results, error } = await supabase
          .from('batch_results')
          .select('input_data, output_data, status')
          .eq('batch_id', recentBatch.id)
          .order('created_at', { ascending: true })
          .limit(15)

        if (error) throw error

        if (!results || results.length === 0) {
          console.log('No batch_results found for batch:', recentBatch.id, '- checking resources table')
          
          // Fetch agent definition to know output_type
          let outputType: string | null = null
          if (recentBatch.agent_id) {
            const { data: agentDef } = await supabase
              .from('agent_definitions')
              .select('output_type')
              .eq('id', recentBatch.agent_id)
              .single()
            
            outputType = agentDef?.output_type || null
          }
          
          // Map agent output_type to resource type
          // output_type: 'leads' | 'keywords' | 'content' | 'analytics' | 'campaign'
          // resource type: 'lead' | 'keyword' | 'content' | 'campaign'
          const resourceTypeMap: Record<string, string> = {
            'leads': 'lead',
            'keywords': 'keyword',
            'content': 'content',
            'campaign': 'campaign',
          }
          
          const resourceType = outputType ? resourceTypeMap[outputType] : null
          
          // Fallback: Try to get data from resources table (all types if no specific type)
          const resourceQuery = supabase
            .from('resources')
            .select('data, type')
            .eq('batch_id', recentBatch.id)
            .order('created_at', { ascending: true })
            .limit(15)
          
          if (resourceType) {
            resourceQuery.eq('type', resourceType)
          }
          
          const { data: resources, error: resourcesError } = await resourceQuery

          if (resourcesError) {
            console.error('Error fetching resources:', resourcesError)
            setIsLoadingReplay(false)
            return
          }

          if (resources && resources.length > 0) {
            console.log('Found', resources.length, 'resources for replay, type:', resourceType || 'all')
            
            const transformedRows: DemoRow[] = resources.map((resource, index) => {
              const data = resource.data || {}
              const resourceType = resource.type
              
              // Generic extraction based on resource type
              let name = ''
              let description = ''
              let summary = ''
              
              if (resourceType === 'lead') {
                name = data.name || data.Name || data['Full Name'] || data.email || data.Email || data.company || data.Company || `Lead ${index + 1}`
                description = data.title || data.Title || data.job_title || data.company || data.Company || data.description || ''
                summary = data.summary || data.bio || data.enriched_data?.summary || data.notes || ''
              } else if (resourceType === 'keyword') {
                name = data.keyword || data.Keyword || data.term || data.phrase || `Keyword ${index + 1}`
                description = data.category || data.Category || data.intent || data.search_volume?.toString() || ''
                summary = data.analysis || data.summary || data.recommendations || data.insights || ''
              } else if (resourceType === 'content') {
                name = data.title || data.Title || data.name || data.subject || `Content ${index + 1}`
                description = data.type || data.format || data.category || data.description || ''
                summary = data.content?.substring(0, 200) || data.body?.substring(0, 200) || data.text?.substring(0, 200) || data.summary || ''
              } else if (resourceType === 'campaign') {
                name = data.name || data.Name || data.campaign_name || `Campaign ${index + 1}`
                description = data.type || data.status || data.channel || ''
                summary = data.description || data.summary || data.metrics?.summary || ''
              } else {
                // Generic fallback
                name = data.name || data.Name || data.title || data.id || `Item ${index + 1}`
                description = data.description || data.type || data.category || ''
                summary = data.summary || data.output || data.result || data.analysis || ''
              }

              return {
                id: index + 1,
                name: String(name),
                description: String(description).substring(0, 200),
                summary: String(summary).substring(0, 200),
                status: 'pending' as const
              }
            })

            setReplayRows(transformedRows)
            console.log('Replay data fetched from resources:', transformedRows.length, 'rows')
            setIsLoadingReplay(false)
            return
          }

          console.log('No resources found either for batch:', recentBatch.id)
          setIsLoadingReplay(false)
          return
        }

        console.log('Found', results.length, 'batch_results for replay')

        const transformedRows: DemoRow[] = results.map((result, index) => {
          const input = typeof result.input_data === 'string' 
            ? JSON.parse(result.input_data) 
            : result.input_data || {}
          
          const output = typeof result.output_data === 'string'
            ? JSON.parse(result.output_data)
            : result.output_data || {}
          
          // Try multiple field name variations for name/identifier
          const inputValues = typeof input === 'object' && input !== null ? Object.values(input) : []
          const firstStringValue = inputValues.find((v: unknown) => typeof v === 'string' && v.length > 0 && v.length < 100) as string | undefined
          
          const name = input.name || input.Name || input.NAME || input['Full Name'] || 
                      input.subreddit || input.Subreddit || input.title || input.Title ||
                      input.email || input.Email || input.id || input.ID ||
                      firstStringValue ||
                      `Row ${index + 1}`
          
          // Try multiple field name variations for description
          const description = input.description || input.Description || input.DESCRIPTION || 
                            input['Job Description'] || input.generated_bio || input.bio ||
                            input.key_themes_identified || input.content || input.text ||
                            input.summary || input.Summary || ''
          
          // Get summary from output - try common output field names
          const summary = output.summary || output.Summary || output.generated_subreddit_bio ||
                         output.output || output.result || output.generated_content ||
                         (Object.keys(output).length > 0 ? String(output[Object.keys(output)[0]]) : '')

          return {
            id: index + 1,
            name: String(name),
            description: String(description).substring(0, 200), // Limit length
            summary: String(summary).substring(0, 200), // Limit length
            status: 'pending' as const // Start as pending so animation can run
          }
        })

        setReplayRows(transformedRows)
        console.log('Replay data fetched:', transformedRows.length, 'rows')
      } catch (error) {
        console.error('Failed to fetch replay data:', error)
        setIsLoadingReplay(false)
      } finally {
        setIsLoadingReplay(false)
      }
    }

    fetchReplayData()
  }, [hasBatches, safeStats?.recentBatches, completedBatches, isLoadingReplay, replayRows.length])

  // Replay animation (runs even when processing batches exist)
  // Use refs to track animation state and prevent re-running on state updates
  const replayAnimationStartedRef = useRef(false)
  const replayRowsRef = useRef<DemoRow[]>([])
  
  // Keep ref in sync with state
  useEffect(() => {
    replayRowsRef.current = replayRows
  }, [replayRows])
  
  useEffect(() => {
    if (replayRows.length === 0) {
      replayAnimationStartedRef.current = false
      return
    }
    
    // Only start animation once when rows are first loaded
    if (replayAnimationStartedRef.current) return
    replayAnimationStartedRef.current = true

    let rowIndex = 0
    let isRunning = true
    let typeInterval: NodeJS.Timeout | null = null
    let processingTimeout: NodeJS.Timeout | null = null
    let nextRowTimeout: NodeJS.Timeout | null = null
    
    const cleanup = () => {
      if (typeInterval) clearInterval(typeInterval)
      if (processingTimeout) clearTimeout(processingTimeout)
      if (nextRowTimeout) clearTimeout(nextRowTimeout)
    }
    
    const processNextRow = () => {
      if (!isRunning) return
      
      const currentRows = replayRowsRef.current
      const currentReplayRowsLength = currentRows.length
      
      if (rowIndex >= currentReplayRowsLength) {
        cleanup()
        rowIndex = 0
        // Reset to completed state (not pending) since these are from completed batches
        setReplayRows(prev => prev.map(r => ({ ...r, status: 'completed' as const })))
        setCurrentProcessingRow(null)
        setTypewriterText('')
        setTypewriterRowId(null)
        setThroughput({ rowsPerSecond: 0, tokensUsed: 0 })
        
        // Don't auto-cycle - keep completed state visible
        // cycleTimeout = setTimeout(() => {
        //   if (isRunning) processNextRow()
        // }, 2000)
        return
      }

      const currentRowIndex = rowIndex
      const row = currentRows[currentRowIndex]
      const summary = row?.summary || ''
      
      // Only animate if summary exists, otherwise mark as completed immediately
      if (!summary || summary.trim() === '') {
        setReplayRows(prev => prev.map(r => 
          r.id === row.id ? { ...r, status: 'completed' as const } : r
        ))
        setCurrentProcessingRow(null)
        rowIndex++
        nextRowTimeout = setTimeout(() => {
          if (isRunning) processNextRow()
        }, 300)
        return
      }
      
      setCurrentProcessingRow(row.id)
      setReplayRows(prev => prev.map(r => 
        r.id === row.id ? { ...r, status: 'processing' as const } : r
      ))
      setThroughput(prev => ({ rowsPerSecond: 1.2, tokensUsed: prev.tokensUsed + 45 }))
      
      processingTimeout = setTimeout(() => {
        if (!isRunning) {
          // Ensure row completes even if animation stops
          setReplayRows(prev => prev.map(r => 
            r.id === row.id ? { ...r, status: 'completed' as const } : r
          ))
          return
        }
        
        setTypewriterRowId(row.id)
        setTypewriterText('')
        
        let charIndex = 0
        typeInterval = setInterval(() => {
          if (!isRunning) {
            if (typeInterval) clearInterval(typeInterval)
            // Ensure completion on cleanup
            setReplayRows(prev => prev.map(r => 
              r.id === row.id ? { ...r, status: 'completed' as const } : r
            ))
            return
          }
          
          if (charIndex < summary.length) {
            setTypewriterText(summary.slice(0, charIndex + 1))
            charIndex++
          } else {
            if (typeInterval) {
              clearInterval(typeInterval)
              typeInterval = null
            }
            // Complete immediately - no delay
            setReplayRows(prev => prev.map(r => 
              r.id === row.id ? { ...r, status: 'completed' as const, summary: summary } : r
            ))
            setCurrentProcessingRow(null)
            setTypewriterText('')
            setTypewriterRowId(null)
            setThroughput({ rowsPerSecond: 0, tokensUsed: 0 })
            rowIndex++
            nextRowTimeout = setTimeout(() => {
              if (isRunning) processNextRow()
            }, 500)
          }
        }, 15) // Faster typing
      }, 500) // Much shorter initial delay
    }

    const startTimer = setTimeout(() => {
      if (isRunning) processNextRow()
    }, 1000)
    
    return () => {
      isRunning = false
      cleanup()
      clearTimeout(startTimer)
      replayAnimationStartedRef.current = false
    }
  }, [replayRows.length]) // Only depend on length, not the array itself

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

  // If not loading and no stats, show empty state or fallback
  if (!isLoading && !stats && !error) {
    // Still show skeleton while waiting
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

  // Determine which view to show - Always show CSV demo, use real data if available
  const showReplay = hasBatches && replayRows.length > 0
  // Always show demo - it will display real data if available, otherwise demo data
  const showDemo = true
  // Always show terminal feed
  const showTerminalFeed = true

  // Use replayRows if available (real user data), otherwise use demoRows (fallback)
  const displayRows = showReplay ? replayRows : demoRows

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
                    <>
                      <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-2.5 sm:mb-3.5 tracking-tight leading-[1.15]">
                        {greeting}
                      </h1>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                        Process CSV data at scale with AI agents. Transform leads, keywords, content, and more with intelligent automation.
                      </p>
                    </>
                  )
                })()}
              </motion.div>

              {/* Hero Section - CSV Transformation Demo (THE MAIN EVENT) */}
              {(showDemo || showReplay) && (
                <motion.div
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.34, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="mb-6 sm:mb-8"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.995 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.38, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                    className="border border-border/70 rounded-lg sm:rounded-xl overflow-hidden bg-background"
                    style={{
                      boxShadow: '0 10px 24px 0 rgba(0, 0, 0, 0.08), 0 3px 8px 0 rgba(0, 0, 0, 0.14)'
                    }}
                  >
                    {/* Demo Header */}
                    <div className="border-b border-border/50 px-3 sm:px-6 py-3 sm:py-4 bg-secondary/12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                        <div className="flex gap-1 sm:gap-1.5 flex-shrink-0">
                          <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500/60" />
                          <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-yellow-500/60" />
                          <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500/60" />
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
                          {showReplay && replayBatchAgentIcon && (
                            <span className="text-xs sm:text-sm leading-none flex-shrink-0 inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5">{replayBatchAgentIcon}</span>
                          )}
                          <span className="text-xs sm:text-sm font-medium text-foreground font-mono leading-[1.25] truncate">
                            {showReplay ? replayBatchName : 'csv-transformation.csv'}
                          </span>
                          {showReplay && (
                            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-primary/18 text-primary border border-primary/35 rounded sm:rounded-md text-[10px] sm:text-xs font-medium leading-tight flex-shrink-0">
                              REPLAY
                            </span>
                          )}
                        </div>
                      </div>
                      {throughput.rowsPerSecond > 0 && currentProcessingRow && (
                        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground font-mono flex-shrink-0">
                          <span className="tabular-nums">{throughput.rowsPerSecond.toFixed(1)} rows/sec</span>
                          <span className="tabular-nums hidden sm:inline">{throughput.tokensUsed} tokens</span>
                        </div>
                      )}
                    </div>

                    {/* CSV Table - Hero Size */}
                    <div className="p-3 sm:p-6">
                      <div className="mb-3 sm:mb-4.5">
                        <div className="text-[10px] sm:text-xs text-muted-foreground font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
                          <span className="uppercase tracking-wider">Input CSV</span>
                          {throughput.rowsPerSecond > 0 && currentProcessingRow && (
                            <span className="text-primary text-[10px] sm:text-xs font-mono tabular-nums">Processing row {currentProcessingRow}...</span>
                          )}
                        </div>
                      </div>
                    
                      <div className="border border-border/45 rounded-lg overflow-x-auto bg-background">
                        {/* Header Row */}
                        <div className="grid grid-cols-[100px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] bg-secondary/18 border-b border-border/40 min-w-[600px]">
                          <div className="px-3 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold text-muted-foreground border-r border-border/30 uppercase tracking-wider leading-[1.25]">name</div>
                          <div className="px-3 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold text-muted-foreground border-r border-border/30 uppercase tracking-wider leading-[1.25]">description</div>
                          <div className="px-3 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-[1.25]">summary</div>
                        </div>
                        
                        {/* Data Rows */}
                        <div className="bg-background">
                          <AnimatePresence>
                            {displayRows.slice(0, 4).map((row, index) => {
                              const totalRows = Math.min(displayRows.length, 4)
                              const maxLines = totalRows === 1 ? 8 : totalRows === 2 ? 6 : totalRows === 3 ? 4 : 3
                              
                              return (
                                <DataRow
                                  key={row.id}
                                  row={row}
                                  index={index}
                                  maxLines={maxLines}
                                  typewriterText={typewriterText}
                                  typewriterRowId={typewriterRowId}
                                  currentProcessingRow={currentProcessingRow}
                                />
                              )
                            })}
                          </AnimatePresence>
                          
                          {displayRows.length > 4 && (
                            <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 text-center text-[10px] sm:text-xs text-muted-foreground border-t border-border/35 bg-secondary/12 uppercase tracking-wider min-w-[600px]">
                              +{displayRows.length - 4} more rows
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Activity Feed - Compact Supporting Info */}
              {showTerminalFeed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.34, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="mb-6 sm:mb-8"
                >
                  <div className="border border-border/50 rounded-lg overflow-hidden bg-secondary/12">
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
                        <div className="text-muted-foreground py-6 text-center text-[10px] sm:text-xs">
                          <span className="text-muted-foreground/50 font-mono">$</span> No processing activity
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* KPI Cards - Subtle Summary Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.38, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5"
              >
                  <div className="bg-secondary/10 border border-border/50 rounded-lg p-3 sm:p-5 hover:bg-secondary/28 hover:border-border/70 transition-all duration-200 cursor-default">
                    <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-2 sm:mb-3.5 uppercase tracking-wider leading-[1.25]">Total Batches</div>
                    <div className="text-base sm:text-lg font-bold text-foreground mb-1.5 sm:mb-2.5 tabular-nums">{safeStats.totalBatches}</div>
                    {safeStats.completedBatches > 0 && (
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
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
            </div>
          ),
        },
      ]}
    />
  )
}
