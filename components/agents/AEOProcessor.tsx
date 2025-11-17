/**
 * AEO Analytics Processor - Dedicated page for AEO Analytics agent
 * Allows selecting keywords and running AEO analysis with GTM backend
 * Reuses shared components from bulk agent for consistency
 */

'use client'

import { useState } from 'react'
import { BarChart3, Play, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgentPageLayout } from './shared/AgentPageLayout'
import { ResourceSelector } from './shared/ResourceSelector'
import { BatchStatusCard } from '@/components/bulk/BatchStatusCard'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'

interface BatchProgress {
  completed: number
  total: number
}

interface AnalyticsResult {
  keyword: string
  keywordId: string
  metrics: {
    intelligence?: {
      seo_potential: number
      competition_level: string
      opportunity_score: number
    }
    search_volume?: number
    difficulty?: number
    intent?: {
      type: string
      confidence: number
    }
    current_ranking?: {
      position: number | null
      url?: string
    }
    serp_features?: {
      featured_snippet: boolean
      people_also_ask: boolean
      related_searches: boolean
      answer_box: boolean
    }
  }
  aeo_insights: {
    answer_engine_optimization_score: number
    answer_box_opportunity: boolean
    featured_snippet_opportunity: boolean
    content_strategy_suggestions: string[]
    optimization_recommendations: string[]
  }
  insights: string
  recommendations: string[]
  metadata: {
    tools_used: string[]
    execution_time_ms: number
    timestamp: string
  }
}

export default function AEOProcessor() {
  // Selection state
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<string[]>([])
  const [domain, setDomain] = useState('')

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [successCount, setSuccessCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null)

  // Results state
  const [results, setResults] = useState<AnalyticsResult[]>([])
  const [showResults, setShowResults] = useState(false)

  const handleRunAnalysis = async () => {
    if (selectedKeywordIds.length === 0) {
      toast.error('Please select at least one keyword')
      return
    }

    try {
      setIsProcessing(true)
      setProcessingStartTime(Date.now())
      setProgress({ completed: 0, total: selectedKeywordIds.length })
      setSuccessCount(0)
      setErrorCount(0)
      setResults([])
      setShowResults(true)

      const supabase = createClient()

      // Track analytics event
      trackEvent(ANALYTICS_EVENTS.AGENT_RUN_STARTED, {
        agent_id: 'aeo_analytics',
        keyword_count: selectedKeywordIds.length,
        has_domain: !!domain,
      })

      // Call the API to run AEO analytics
      const response = await fetch('/api/agents/aeo_analytics/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_resource_ids: selectedKeywordIds,
          config: {
            domain: domain || undefined,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to run AEO analytics')
      }

      const data = await response.json()

      // Fetch the created analytics resources
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      const { data: analyticsResources, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .eq('batch_id', data.batch_id)
        .eq('type', 'analytics')

      if (resourcesError) {
        console.error('Error fetching analytics resources:', resourcesError)
        toast.error('Analysis completed but failed to load results')
      } else {
        // Transform resources to results format
        const transformedResults: AnalyticsResult[] = (analyticsResources || []).map(resource => ({
          keyword: resource.data.keyword as string,
          keywordId: resource.data.keywordId as string,
          metrics: resource.data.metrics as AnalyticsResult['metrics'],
          aeo_insights: resource.data.aeo_insights as AnalyticsResult['aeo_insights'],
          insights: resource.data.insights as string,
          recommendations: resource.data.recommendations as string[],
          metadata: resource.data.metadata as AnalyticsResult['metadata'],
        }))

        setResults(transformedResults)
        setSuccessCount(transformedResults.length)
        setProgress({ completed: transformedResults.length, total: selectedKeywordIds.length })

        toast.success(`AEO analysis complete! Created ${transformedResults.length} analytics resources.`)

        // Track success
        trackEvent(ANALYTICS_EVENTS.AGENT_RUN_COMPLETED, {
          agent_id: 'aeo_analytics',
          batch_id: data.batch_id,
          success_count: transformedResults.length,
        })
      }
    } catch (error) {
      console.error('Error running AEO analysis:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to run AEO analysis')
      setErrorCount(selectedKeywordIds.length)

      // Track error
      trackEvent(ANALYTICS_EVENTS.AGENT_RUN_FAILED, {
        agent_id: 'aeo_analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    setIsProcessing(false)
    setProgress(null)
    setSuccessCount(0)
    setErrorCount(0)
    setProcessingStartTime(null)
    setResults([])
    setShowResults(false)
  }

  const canRun = selectedKeywordIds.length > 0 && !isProcessing

  return (
    <AgentPageLayout
      title="AEO Analytics"
      description="Analyze keywords using Answer Engine Optimization (AEO) intelligence"
      icon={<BarChart3 className="h-6 w-6 text-primary" />}
    >
      <div className="space-y-6">
        {/* Configuration Section */}
        {!showResults && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                1. Select Keywords
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the keywords you want to analyze for AEO potential
              </p>
              <ResourceSelector
                resourceType="keyword"
                selectedResourceIds={selectedKeywordIds}
                onSelectionChange={setSelectedKeywordIds}
                label="Keywords to Analyze"
                description="Select one or more keywords for AEO analysis"
                minSelection={1}
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                2. Domain (Optional)
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Provide your domain to track current rankings and get personalized insights
              </p>
              <input
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Optional: Include your domain to check current rankings and answer engine positions
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <Button
                onClick={handleRunAnalysis}
                disabled={!canRun}
                size="lg"
                className="w-full sm:w-auto"
              >
                <Play className="h-4 w-4 mr-2" />
                Run AEO Analysis ({selectedKeywordIds.length} keyword{selectedKeywordIds.length !== 1 ? 's' : ''})
              </Button>
              {!canRun && selectedKeywordIds.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Please select at least one keyword to run analysis
                </p>
              )}
            </div>
          </div>
        )}

        {/* Progress Section */}
        {showResults && progress && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <BatchStatusCard
              progress={progress}
              successCount={successCount}
              errorCount={errorCount}
              processingStartTime={processingStartTime || undefined}
            />
          </div>
        )}

        {/* Results Section */}
        {showResults && results.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-foreground">
                    Analysis Results
                  </h3>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  New Analysis
                </Button>
              </div>
            </div>

            {/* Results Table */}
            <div className="p-6">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={result.keywordId || index}
                    className="border border-border rounded-lg p-4 space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-foreground">
                          {result.keyword}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.insights}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          {result.aeo_insights.answer_engine_optimization_score}/100
                        </span>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {result.metrics.search_volume && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Search Volume</p>
                          <p className="text-base font-semibold text-foreground">
                            {result.metrics.search_volume.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {result.metrics.difficulty !== undefined && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Difficulty</p>
                          <p className="text-base font-semibold text-foreground">
                            {result.metrics.difficulty}/100
                          </p>
                        </div>
                      )}
                      {result.metrics.intent && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Intent</p>
                          <p className="text-base font-semibold text-foreground capitalize">
                            {result.metrics.intent.type}
                          </p>
                        </div>
                      )}
                      {result.metrics.current_ranking?.position && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Ranking</p>
                          <p className="text-base font-semibold text-foreground">
                            #{result.metrics.current_ranking.position}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* AEO Opportunities */}
                    {(result.aeo_insights.featured_snippet_opportunity ||
                      result.aeo_insights.answer_box_opportunity) && (
                      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                        <p className="text-xs font-medium text-green-600 mb-2">
                          AEO Opportunities
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {result.aeo_insights.featured_snippet_opportunity && (
                            <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 rounded">
                              Featured Snippet
                            </span>
                          )}
                          {result.aeo_insights.answer_box_opportunity && (
                            <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 rounded">
                              Answer Box
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {result.recommendations.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-2">
                          Recommendations
                        </p>
                        <ul className="space-y-1">
                          {result.recommendations.map((rec, i) => (
                            <li
                              key={i}
                              className="text-xs text-muted-foreground flex items-start gap-2"
                            >
                              <span className="text-primary mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Tools: {result.metadata.tools_used.join(', ')} •{' '}
                        Execution: {Math.round(result.metadata.execution_time_ms / 1000)}s
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {showResults && results.length === 0 && errorCount > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div>
                <h3 className="text-base font-semibold">Analysis Failed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The AEO analysis encountered errors. Please try again or contact support.
                </p>
              </div>
            </div>
            <Button variant="outline" className="mt-4" onClick={handleReset}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </AgentPageLayout>
  )
}
