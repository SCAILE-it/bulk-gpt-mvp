/**
 * AEO Analytics Service
 * Analyzes keywords using GTM backend SEO tools (labeled as AEO)
 * REUSES: GTMAPIClient (same as bulk agent)
 */

import { GTMAPIClient } from '@/lib/api/gtm-client'
import type { EnrichRowResponse } from '@/lib/types/gtm-types'

export interface AEOKeywordInput {
  id: string
  keyword: string
  domain?: string
}

export interface AEOAnalyticsRequest {
  keywords: AEOKeywordInput[]
  businessContext?: {
    domain?: string
    brand?: string
  }
}

export interface AEOAnalyticsResult {
  keyword: string
  keywordId: string
  
  // Metrics from various tools
  metrics: {
    // From keyword-intelligence
    intelligence?: {
      seo_potential: number
      competition_level: string
      opportunity_score: number
    }
    
    // From keyword-volume
    search_volume?: number
    
    // From keyword-difficulty
    difficulty?: number
    
    // From keyword-intent
    intent?: {
      type: 'informational' | 'navigational' | 'transactional' | 'commercial'
      confidence: number
    }
    
    // From keyword-ranking (if domain provided)
    current_ranking?: {
      position: number | null
      url?: string
      answer_engine_ranking?: number | null
    }
    
    // From serp-features
    serp_features?: {
      featured_snippet: boolean
      people_also_ask: boolean
      related_searches: boolean
      answer_box: boolean
    }
  }
  
  // AEO-specific insights (ANALYTICS ONLY - no content)
  aeo_insights: {
    answer_engine_optimization_score: number
    answer_box_opportunity: boolean
    featured_snippet_opportunity: boolean
    content_strategy_suggestions: string[]
    optimization_recommendations: string[]
  }
  
  // Overall insights (analytical, not generative)
  insights: string
  recommendations: string[]
  
  // Metadata
  metadata: {
    tools_used: string[]
    execution_time_ms: number
    timestamp: string
  }
}

/**
 * Analyze keywords for AEO using GTM backend tools
 * REUSES: GTMAPIClient pattern from bulk agent
 */
export async function analyzeAEOKeywords(
  request: AEOAnalyticsRequest,
  authToken: string
): Promise<AEOAnalyticsResult[]> {
  const startTime = Date.now()
  const gtmClient = new GTMAPIClient({ authToken })
  
  const results: AEOAnalyticsResult[] = []
  
  // Process each keyword
  for (const keywordInput of request.keywords) {
    const keywordStartTime = Date.now()
    const toolsUsed: string[] = []
    const metrics: AEOAnalyticsResult['metrics'] = {}
    
    try {
      // Call multiple SEO tools in parallel where possible
      const toolPromises: Promise<EnrichRowResponse | null>[] = []
      
      // 1. Keyword Intelligence (main analysis)
      toolPromises.push(
        gtmClient.enrichRow({
          data: {
            keyword: keywordInput.keyword,
            domain: keywordInput.domain || request.businessContext?.domain,
          },
          tools: ['keyword-intelligence'],
        }).catch(() => null)
      )
      
      // 2. Keyword Volume
      toolPromises.push(
        gtmClient.enrichRow({
          data: { keyword: keywordInput.keyword },
          tools: ['keyword-volume'],
        }).catch(() => null)
      )
      
      // 3. Keyword Difficulty
      toolPromises.push(
        gtmClient.enrichRow({
          data: { keyword: keywordInput.keyword },
          tools: ['keyword-difficulty'],
        }).catch(() => null)
      )
      
      // 4. Keyword Intent
      toolPromises.push(
        gtmClient.enrichRow({
          data: { keyword: keywordInput.keyword },
          tools: ['keyword-intent'],
        }).catch(() => null)
      )
      
      // 5. SERP Features
      toolPromises.push(
        gtmClient.enrichRow({
          data: { keyword: keywordInput.keyword },
          tools: ['serp-features'],
        }).catch(() => null)
      )
      
      // 6. Keyword Ranking (if domain provided)
      if (keywordInput.domain || request.businessContext?.domain) {
        toolPromises.push(
          gtmClient.enrichRow({
            data: {
              keyword: keywordInput.keyword,
              domain: keywordInput.domain || request.businessContext?.domain,
            },
            tools: ['keyword-ranking'],
          }).catch(() => null)
        )
      }
      
      // Wait for all tools to complete
      const toolResults = await Promise.all(toolPromises)
      
      // Process results
      const [intelligenceResult, volumeResult, difficultyResult, intentResult, serpResult, rankingResult] = toolResults
      
      // Extract intelligence metrics
      if (intelligenceResult?.success && intelligenceResult.data) {
        toolsUsed.push('keyword-intelligence')
        const intelData = intelligenceResult.data as any
        metrics.intelligence = {
          seo_potential: intelData.seo_potential || intelData.potential_score || 0,
          competition_level: intelData.competition_level || intelData.competition || 'unknown',
          opportunity_score: intelData.opportunity_score || intelData.opportunity || 0,
        }
      }
      
      // Extract volume
      if (volumeResult?.success && volumeResult.data) {
        toolsUsed.push('keyword-volume')
        const volumeData = volumeResult.data as any
        metrics.search_volume = volumeData.search_volume || volumeData.volume || null
      }
      
      // Extract difficulty
      if (difficultyResult?.success && difficultyResult.data) {
        toolsUsed.push('keyword-difficulty')
        const diffData = difficultyResult.data as any
        metrics.difficulty = diffData.difficulty || diffData.difficulty_score || null
      }
      
      // Extract intent
      if (intentResult?.success && intentResult.data) {
        toolsUsed.push('keyword-intent')
        const intentData = intentResult.data as any
        metrics.intent = {
          type: intentData.intent_type || intentData.intent || 'informational',
          confidence: intentData.confidence || intentData.confidence_score || 0.5,
        } as any
      }
      
      // Extract SERP features
      if (serpResult?.success && serpResult.data) {
        toolsUsed.push('serp-features')
        const serpData = serpResult.data as any
        metrics.serp_features = {
          featured_snippet: serpData.featured_snippet || serpData.has_featured_snippet || false,
          people_also_ask: serpData.people_also_ask || serpData.has_paa || false,
          related_searches: serpData.related_searches || serpData.has_related || false,
          answer_box: serpData.answer_box || serpData.has_answer_box || false,
        }
      }
      
      // Extract ranking
      if (rankingResult?.success && rankingResult.data) {
        toolsUsed.push('keyword-ranking')
        const rankData = rankingResult.data as any
        metrics.current_ranking = {
          position: rankData.position || rankData.ranking || null,
          url: rankData.url || null,
          answer_engine_ranking: rankData.answer_engine_ranking || null,
        }
      }
      
      // Calculate AEO score (0-100)
      const aeoScore = calculateAEOScore(metrics)
      
      // Generate insights and recommendations
      const { insights, recommendations, aeoInsights } = generateAEOInsights(
        keywordInput.keyword,
        metrics,
        aeoScore
      )
      
      const executionTime = Date.now() - keywordStartTime
      
      results.push({
        keyword: keywordInput.keyword,
        keywordId: keywordInput.id,
        metrics,
        aeo_insights: aeoInsights,
        insights,
        recommendations,
        metadata: {
          tools_used: toolsUsed,
          execution_time_ms: executionTime,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      // If analysis fails, still return partial result
      console.error(`Error analyzing keyword ${keywordInput.keyword}:`, error)
      results.push({
        keyword: keywordInput.keyword,
        keywordId: keywordInput.id,
        metrics: {},
        aeo_insights: {
          answer_engine_optimization_score: 0,
          answer_box_opportunity: false,
          featured_snippet_opportunity: false,
          content_strategy_suggestions: [],
          optimization_recommendations: [],
        },
        insights: 'Analysis failed. Please try again.',
        recommendations: [],
        metadata: {
          tools_used: [],
          execution_time_ms: Date.now() - keywordStartTime,
          timestamp: new Date().toISOString(),
        },
      })
    }
  }
  
  return results
}

/**
 * Calculate AEO score (0-100) based on metrics
 */
function calculateAEOScore(metrics: AEOAnalyticsResult['metrics']): number {
  let score = 50 // Base score
  
  // Intelligence score (0-30 points)
  if (metrics.intelligence?.opportunity_score) {
    score += metrics.intelligence.opportunity_score * 30
  }
  
  // SERP features (0-20 points)
  if (metrics.serp_features) {
    if (metrics.serp_features.featured_snippet) score += 10
    if (metrics.serp_features.answer_box) score += 10
  }
  
  // Difficulty adjustment (-20 to +20 points)
  if (metrics.difficulty !== undefined) {
    // Lower difficulty = higher score
    score += (100 - metrics.difficulty) * 0.2 - 20
  }
  
  // Ranking bonus (0-10 points)
  if (metrics.current_ranking?.position && metrics.current_ranking.position <= 10) {
    score += 10 - metrics.current_ranking.position
  }
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Generate AEO insights and recommendations (ANALYTICS ONLY - no content)
 */
function generateAEOInsights(
  keyword: string,
  metrics: AEOAnalyticsResult['metrics'],
  aeoScore: number
): {
  insights: string
  recommendations: string[]
  aeoInsights: AEOAnalyticsResult['aeo_insights']
} {
  const insights: string[] = []
  const recommendations: string[] = []
  const contentStrategySuggestions: string[] = []
  const optimizationRecommendations: string[] = []
  
  // Analyze metrics
  if (metrics.intelligence) {
    if (metrics.intelligence.opportunity_score > 0.7) {
      insights.push('High AEO potential')
    } else if (metrics.intelligence.opportunity_score < 0.3) {
      insights.push('Low AEO potential')
    }
    
    if (metrics.intelligence.competition_level === 'low' || metrics.intelligence.competition_level === 'medium') {
      insights.push('Moderate competition level')
    }
  }
  
  if (metrics.search_volume && metrics.search_volume > 1000) {
    insights.push('Good search volume')
  }
  
  if (metrics.difficulty !== undefined) {
    if (metrics.difficulty < 30) {
      insights.push('Low competition keyword')
      recommendations.push('Focus on quick wins - this keyword is easier to rank for')
    } else if (metrics.difficulty > 70) {
      insights.push('High competition keyword')
      recommendations.push('Consider long-tail variations for better ranking opportunities')
    }
  }
  
  // SERP features analysis
  let featuredSnippetOpportunity = false
  let answerBoxOpportunity = false
  
  if (metrics.serp_features) {
    if (metrics.serp_features.featured_snippet && !metrics.current_ranking?.position) {
      insights.push('Featured snippet available but not captured')
      featuredSnippetOpportunity = true
      contentStrategySuggestions.push('Target featured snippet format')
      optimizationRecommendations.push('Optimize existing content for featured snippet')
    }
    
    if (metrics.serp_features.answer_box && !metrics.current_ranking?.position) {
      insights.push('Answer box opportunity identified')
      answerBoxOpportunity = true
      contentStrategySuggestions.push('Create FAQ-style content')
      optimizationRecommendations.push('Target answer box with concise, structured answers')
    }
    
    if (metrics.serp_features.people_also_ask) {
      contentStrategySuggestions.push('Address related questions in content')
    }
  }
  
  // Ranking analysis
  if (metrics.current_ranking) {
    if (metrics.current_ranking.position && metrics.current_ranking.position <= 10) {
      insights.push(`Currently ranking at position ${metrics.current_ranking.position}`)
      if (metrics.current_ranking.position > 3) {
        recommendations.push('Focus on improving ranking to top 3 positions')
      }
    } else {
      insights.push('Not currently ranking in top 10')
      recommendations.push('Build content and backlinks to improve visibility')
    }
  }
  
  // Intent-based recommendations
  if (metrics.intent) {
    if (metrics.intent.type === 'commercial' || metrics.intent.type === 'transactional') {
      contentStrategySuggestions.push('Focus on conversion-optimized content')
    } else if (metrics.intent.type === 'informational') {
      contentStrategySuggestions.push('Create educational, comprehensive content')
    }
  }
  
  // Default insights if none generated
  if (insights.length === 0) {
    insights.push(`AEO analysis for "${keyword}" - Score: ${aeoScore}/100`)
  }
  
  // Default recommendations if none generated
  if (recommendations.length === 0) {
    if (aeoScore > 70) {
      recommendations.push('Strong AEO potential - prioritize this keyword')
    } else if (aeoScore < 40) {
      recommendations.push('Consider focusing on keywords with higher AEO potential')
    } else {
      recommendations.push('Moderate AEO potential - monitor and optimize')
    }
  }
  
  return {
    insights: insights.join('. ') || `AEO analysis for "${keyword}"`,
    recommendations,
    aeoInsights: {
      answer_engine_optimization_score: aeoScore,
      answer_box_opportunity: answerBoxOpportunity,
      featured_snippet_opportunity: featuredSnippetOpportunity,
      content_strategy_suggestions: contentStrategySuggestions,
      optimization_recommendations: optimizationRecommendations,
    },
  }
}

