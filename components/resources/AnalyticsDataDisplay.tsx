/**
 * AnalyticsDataDisplay Component
 * Displays AEO analytics data in a structured format
 * REUSES: UI components (Badge, Card, Progress) from @/components/ui
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export interface AEOAnalyticsData {
  keyword: string
  keywordId?: string
  metrics?: {
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
      answer_engine_ranking?: number | null
    }
    serp_features?: {
      featured_snippet: boolean
      people_also_ask: boolean
      related_searches: boolean
      answer_box: boolean
    }
  }
  aeo_insights?: {
    answer_engine_optimization_score: number
    answer_box_opportunity: boolean
    featured_snippet_opportunity: boolean
    content_strategy_suggestions: string[]
    optimization_recommendations: string[]
  }
  insights?: string
  recommendations?: string[]
  metadata?: {
    tools_used: string[]
    execution_time_ms: number
    timestamp: string
  }
}

interface AnalyticsDataDisplayProps {
  data: AEOAnalyticsData
}

export function AnalyticsDataDisplay({ data }: AnalyticsDataDisplayProps) {
  const aeoScore = data.aeo_insights?.answer_engine_optimization_score || 0
  const metrics = data.metrics || {}
  const aeoInsights = data.aeo_insights || {}

  return (
    <div className="space-y-4">
      {/* AEO Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AEO Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{aeoScore}/100</span>
              <Badge
                variant={aeoScore >= 70 ? 'default' : aeoScore >= 40 ? 'secondary' : 'outline'}
                className="text-xs"
              >
                {aeoScore >= 70 ? 'Strong' : aeoScore >= 40 ? 'Moderate' : 'Low'}
              </Badge>
            </div>
            <Progress value={aeoScore} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Metrics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {metrics.search_volume !== undefined && (
              <div>
                <span className="text-muted-foreground">Search Volume:</span>
                <span className="ml-2 font-medium">{metrics.search_volume.toLocaleString()}</span>
              </div>
            )}
            {metrics.difficulty !== undefined && (
              <div>
                <span className="text-muted-foreground">Difficulty:</span>
                <span className="ml-2 font-medium">{metrics.difficulty}/100</span>
              </div>
            )}
            {metrics.intent && (
              <div>
                <span className="text-muted-foreground">Intent:</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {metrics.intent.type}
                </Badge>
              </div>
            )}
            {metrics.current_ranking?.position && (
              <div>
                <span className="text-muted-foreground">Current Ranking:</span>
                <span className="ml-2 font-medium">#{metrics.current_ranking.position}</span>
              </div>
            )}
            {metrics.intelligence?.opportunity_score !== undefined && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Opportunity Score:</span>
                <span className="ml-2 font-medium">
                  {(metrics.intelligence.opportunity_score * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SERP Features Card */}
      {metrics.serp_features && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SERP Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {metrics.serp_features.featured_snippet ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>Featured Snippet Available</span>
              </div>
              <div className="flex items-center gap-2">
                {metrics.serp_features.answer_box ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>Answer Box Available</span>
              </div>
              <div className="flex items-center gap-2">
                {metrics.serp_features.people_also_ask ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>People Also Ask</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AEO Opportunities Card */}
      {(aeoInsights.answer_box_opportunity || aeoInsights.featured_snippet_opportunity) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AEO Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {aeoInsights.answer_box_opportunity && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <span>Answer box opportunity identified</span>
                </div>
              )}
              {aeoInsights.featured_snippet_opportunity && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <span>Featured snippet opportunity identified</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations Card */}
      {data.recommendations && data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {data.insights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{data.insights}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {data.metadata && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-4">
            {data.metadata.tools_used && data.metadata.tools_used.length > 0 && (
              <span>Tools: {data.metadata.tools_used.join(', ')}</span>
            )}
            {data.metadata.execution_time_ms && (
              <span>Execution: {data.metadata.execution_time_ms}ms</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

