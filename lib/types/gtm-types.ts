/**
 * ABOUTME: Type definitions for GTM backend API integration
 * ABOUTME: Provides type-safe interfaces for enrichment tools, requests, and responses
 */

// ============================================================================
// Tool Categories
// ============================================================================

export type GTMToolCategory = 'enrichment' | 'generation' | 'analysis'

export type GTMToolGroup = 'core' | 'advanced'

// ============================================================================
// Tool Definition
// ============================================================================

export interface GTMTool {
  /** Unique tool identifier (used in API calls) */
  name: string

  /** Human-readable tool name for UI */
  displayName: string

  /** Brief description of what the tool does */
  description: string

  /** Tool category */
  category: GTMToolCategory

  /** Whether this is a core tool (always visible) or advanced */
  group: GTMToolGroup

  /** API endpoint path (e.g., '/enrichment/email-validate') */
  endpoint: string

  /** Example input fields this tool expects */
  exampleInputs?: string[]

  /** Typical use cases */
  useCases?: string[]
}

// ============================================================================
// Available GTM Tools (43 total)
// ============================================================================

/**
 * Essential tools - most commonly used (5 tools)
 * Always visible in UI, shown by default
 */
export const ESSENTIAL_GTM_TOOLS: GTMTool[] = [
  {
    name: 'web-search',
    displayName: 'Web Search',
    description: 'AI-powered web research with citations',
    category: 'generation',
    group: 'core',
    endpoint: '/generation/web-search',
    exampleInputs: ['query'],
    useCases: ['Market research', 'Competitive intelligence']
  },
  {
    name: 'company-data',
    displayName: 'Company Data',
    description: 'Get company information from multiple sources',
    category: 'enrichment',
    group: 'core',
    endpoint: '/enrichment/company-data',
    exampleInputs: ['companyName', 'domain'],
    useCases: ['Company research', 'Lead enrichment']
  },
  {
    name: 'deep-research',
    displayName: 'Deep Research',
    description: 'Multi-query research with comprehensive analysis',
    category: 'generation',
    group: 'core',
    endpoint: '/generation/deep-research',
    exampleInputs: ['topic'],
    useCases: ['Market research', 'Competitive analysis']
  },
  {
    name: 'email-finder',
    displayName: 'Email Finder',
    description: 'Find email addresses for a domain',
    category: 'enrichment',
    group: 'core',
    endpoint: '/enrichment/email-finder',
    exampleInputs: ['domain'],
    useCases: ['Lead generation', 'Contact discovery']
  },
  {
    name: 'scrape',
    displayName: 'Website Scraper',
    description: 'Extract structured data from websites using AI (crawl4ai-based)',
    category: 'enrichment',
    group: 'core',
    endpoint: '/scrape',
    exampleInputs: ['url', 'prompt'],
    useCases: ['Web scraping', 'Content extraction', 'Data collection']
  },
]

/**
 * More core tools - additional commonly used tools (6 tools)
 * Shown in collapsible section, starts collapsed
 */
export const MORE_CORE_GTM_TOOLS: GTMTool[] = [
  {
    name: 'email-intel',
    displayName: 'Email Intelligence',
    description: 'Find social profiles and platforms for an email',
    category: 'enrichment',
    group: 'core',
    endpoint: '/enrichment/email-intel',
    exampleInputs: ['email'],
    useCases: ['Social media discovery', 'Profile enrichment']
  },
  {
    name: 'whois',
    displayName: 'WHOIS Lookup',
    description: 'Get domain registration information',
    category: 'enrichment',
    group: 'core',
    endpoint: '/enrichment/whois',
    exampleInputs: ['domain'],
    useCases: ['Domain research', 'Ownership verification']
  },
  {
    name: 'sequence-builder',
    displayName: 'Email Sequence Builder',
    description: 'Create multi-email sequences with AI',
    category: 'generation',
    group: 'core',
    endpoint: '/generation/sequence-builder',
    exampleInputs: ['company', 'persona', 'value_prop'],
    useCases: ['Outbound campaigns', 'Nurture sequences']
  },
  {
    name: 'batch-enrich-leads',
    displayName: 'Batch Lead Enrichment',
    description: 'Enrich multiple leads with scoring and segmentation',
    category: 'enrichment',
    group: 'core',
    endpoint: '/enrichment/batch-enrich-leads',
    exampleInputs: ['email', 'company', 'phone'],
    useCases: ['Lead list enrichment', 'Quality scoring']
  },
  {
    name: 'keyword-intelligence',
    displayName: 'Keyword Intelligence',
    description: 'Analyze keyword metrics and SEO potential',
    category: 'analysis',
    group: 'core',
    endpoint: '/analysis/keyword-intelligence',
    exampleInputs: ['keyword', 'domain'],
    useCases: ['SEO research', 'Content planning']
  },
  {
    name: 'url-context',
    displayName: 'URL Context Extractor',
    description: 'Extract content and context from any URL',
    category: 'generation',
    group: 'core',
    endpoint: '/generation/url-context',
    exampleInputs: ['url', 'prompt'],
    useCases: ['Content analysis', 'Web scraping']
  },
]

/**
 * @deprecated Use ESSENTIAL_GTM_TOOLS and MORE_CORE_GTM_TOOLS instead
 * Kept for backward compatibility
 */
export const CORE_GTM_TOOLS: GTMTool[] = [
  ...ESSENTIAL_GTM_TOOLS,
  ...MORE_CORE_GTM_TOOLS,
]

/**
 * Advanced tools - specialized use cases (29 tools)
 * Hidden by default, shown in collapsible section
 * Note: deep-research and email-finder moved to ESSENTIAL_GTM_TOOLS
 */
export const ADVANCED_GTM_TOOLS: GTMTool[] = [
  // Email Tools (2)
  {
    name: 'email-pattern',
    displayName: 'Email Pattern',
    description: 'Detect email naming patterns for a company',
    category: 'enrichment',
    group: 'advanced',
    endpoint: '/enrichment/email-pattern',
    exampleInputs: ['domain', 'firstName', 'lastName'],
    useCases: ['Email guessing', 'Pattern detection']
  },
  {
    name: 'github-intel',
    displayName: 'GitHub Intelligence',
    description: 'Analyze GitHub profiles and repositories',
    category: 'enrichment',
    group: 'advanced',
    endpoint: '/enrichment/github-intel',
    exampleInputs: ['username'],
    useCases: ['Developer research', 'Technical assessment']
  },

  // AI Research Tools (3)
  {
    name: 'prompt-executor',
    displayName: 'Custom Prompt Executor',
    description: 'Execute custom AI prompts with template variables',
    category: 'generation',
    group: 'advanced',
    endpoint: '/generation/prompt-executor',
    exampleInputs: ['prompt_template', 'context'],
    useCases: ['Custom AI tasks', 'Template processing']
  },
  {
    name: 'code-executor',
    displayName: 'Code Executor',
    description: 'Execute Python code safely',
    category: 'generation',
    group: 'advanced',
    endpoint: '/generation/code-executor',
    exampleInputs: ['code'],
    useCases: ['Data transformation', 'Custom logic']
  },
  {
    name: 'knowledge-search',
    displayName: 'Knowledge Search',
    description: 'Search across multiple knowledge sources',
    category: 'generation',
    group: 'advanced',
    endpoint: '/generation/knowledge-search',
    exampleInputs: ['query', 'source'],
    useCases: ['Research', 'Information discovery']
  },

  // Content & Document Tools (1)
  {
    name: 'pdf-generator',
    displayName: 'PDF Generator',
    description: 'Generate PDFs from HTML or Markdown',
    category: 'generation',
    group: 'advanced',
    endpoint: '/generation/pdf-generator',
    exampleInputs: ['content', 'filename'],
    useCases: ['Report generation', 'Document creation']
  },

  // SEO & AEO Analysis (21 tools)
  {
    name: 'aeo-health-check',
    displayName: 'AEO Health Check',
    description: 'Analyze Answer Engine Optimization health',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/aeo-health-check',
    exampleInputs: ['domain'],
    useCases: ['SEO audit', 'AEO optimization']
  },
  {
    name: 'aeo-mentions',
    displayName: 'AEO Mentions',
    description: 'Track brand mentions in answer engines',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/aeo-mentions',
    exampleInputs: ['brand', 'timeframe'],
    useCases: ['Brand monitoring', 'AEO tracking']
  },
  {
    name: 'page-speed',
    displayName: 'Page Speed Analysis',
    description: 'Analyze website performance metrics',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/page-speed',
    exampleInputs: ['url'],
    useCases: ['Performance audit', 'Core Web Vitals']
  },
  {
    name: 'tier-query-generator',
    displayName: 'Tier Query Generator',
    description: 'Generate AEO-optimized queries across 7 dimensions',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/tier-query-generator',
    exampleInputs: ['topic'],
    useCases: ['Content planning', 'AEO strategy']
  },
  // SEO Keyword Analysis modules (9)
  {
    name: 'keyword-difficulty',
    displayName: 'Keyword Difficulty',
    description: 'Estimate keyword ranking difficulty',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/keyword-difficulty',
    exampleInputs: ['keyword'],
    useCases: ['Keyword research', 'SEO strategy']
  },
  {
    name: 'keyword-intent',
    displayName: 'Search Intent',
    description: 'Classify search intent for keywords',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/keyword-intent',
    exampleInputs: ['keyword'],
    useCases: ['Content strategy', 'Intent mapping']
  },
  {
    name: 'keyword-ranking',
    displayName: 'Keyword Ranking',
    description: 'Check ranking positions for keywords',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/keyword-ranking',
    exampleInputs: ['keyword', 'domain'],
    useCases: ['Rank tracking', 'Competitor analysis']
  },
  {
    name: 'serp-features',
    displayName: 'SERP Features',
    description: 'Detect SERP features for keywords',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/serp-features',
    exampleInputs: ['keyword'],
    useCases: ['SERP analysis', 'Feature targeting']
  },
  {
    name: 'keyword-volume',
    displayName: 'Search Volume',
    description: 'Estimate search volume for keywords',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/keyword-volume',
    exampleInputs: ['keyword'],
    useCases: ['Keyword research', 'Traffic estimation']
  },
  // SEO Audit modules (10)
  {
    name: 'seo-content',
    displayName: 'Content Quality Check',
    description: 'Analyze content quality and SEO factors',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/seo-content',
    exampleInputs: ['url'],
    useCases: ['Content audit', 'Quality analysis']
  },
  {
    name: 'core-web-vitals',
    displayName: 'Core Web Vitals',
    description: 'Measure Core Web Vitals metrics',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/core-web-vitals',
    exampleInputs: ['url'],
    useCases: ['Performance audit', 'UX optimization']
  },
  {
    name: 'seo-crawlability',
    displayName: 'Crawlability Check',
    description: 'Analyze site crawlability and indexability',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/seo-crawlability',
    exampleInputs: ['url', 'domain'],
    useCases: ['Technical SEO', 'Indexation audit']
  },
  {
    name: 'mobile-optimization',
    displayName: 'Mobile Optimization',
    description: 'Check mobile-friendliness and responsiveness',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/mobile-optimization',
    exampleInputs: ['url'],
    useCases: ['Mobile SEO', 'Responsive design audit']
  },
  {
    name: 'seo-performance',
    displayName: 'Performance Metrics',
    description: 'Analyze overall site performance',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/seo-performance',
    exampleInputs: ['url'],
    useCases: ['Performance optimization', 'Speed audit']
  },
  {
    name: 'seo-security',
    displayName: 'Security Check',
    description: 'Verify HTTPS and security headers',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/seo-security',
    exampleInputs: ['url'],
    useCases: ['Security audit', 'HTTPS verification']
  },
  {
    name: 'structured-data',
    displayName: 'Structured Data',
    description: 'Validate schema markup and structured data',
    category: 'analysis',
    group: 'advanced',
    endpoint: '/analysis/structured-data',
    exampleInputs: ['url'],
    useCases: ['Schema validation', 'Rich results']
  },
]

/**
 * All other tools - combines MORE_CORE and ADVANCED (excluding essential tools)
 * Shown in single collapsible "More Tools" section, starts collapsed
 */
export const ALL_OTHER_TOOLS: GTMTool[] = [
  ...MORE_CORE_GTM_TOOLS,
  ...ADVANCED_GTM_TOOLS,
]

/**
 * All GTM tools combined (43 total)
 */
export const ALL_GTM_TOOLS: GTMTool[] = [...ESSENTIAL_GTM_TOOLS, ...ALL_OTHER_TOOLS]

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to enrich a single row with selected tools
 */
export interface EnrichRowRequest {
  /** Row data to enrich */
  data: Record<string, unknown>

  /** Tool names to apply */
  tools: string[]

  /** Optional configuration */
  config?: {
    /** Timeout in milliseconds (default: 30000) */
    timeout?: number

    /** Whether to continue on tool failures (default: true) */
    continueOnError?: boolean
  }
}

/**
 * Response from enriching a single row
 */
export interface EnrichRowResponse {
  /** Whether enrichment succeeded */
  success: boolean

  /** Original input data */
  input: Record<string, unknown>

  /** Enriched data (merged with input) */
  data: Record<string, unknown>

  /** Tool-specific results */
  toolResults: Record<string, ToolResult>

  /** Enrichment metadata */
  metadata: {
    /** Tools that were executed */
    toolsExecuted: string[]

    /** Tools that failed */
    toolsFailed?: string[]

    /** Total execution time in ms */
    executionTime: number

    /** Timestamp */
    timestamp: string
  }
}

/**
 * Request to enrich multiple rows (batch)
 */
export interface EnrichBatchRequest {
  /** Array of rows to enrich */
  rows: Record<string, unknown>[]

  /** Tool names to apply to all rows */
  tools: string[]

  /** Optional configuration */
  config?: {
    /** Max concurrent requests (default: 5) */
    concurrency?: number

    /** Timeout per row in ms (default: 30000) */
    timeout?: number

    /** Whether to continue on tool failures (default: true) */
    continueOnError?: boolean
  }
}

/**
 * Response from batch enrichment
 */
export interface EnrichBatchResponse {
  /** Whether batch enrichment succeeded */
  success: boolean

  /** Batch ID for tracking */
  batchId: string

  /** Total rows processed */
  totalRows: number

  /** Successfully enriched rows */
  successfulRows: number

  /** Failed rows */
  failedRows: number

  /** Enriched results (one per row) */
  results: EnrichRowResponse[]

  /** Batch metadata */
  metadata: {
    /** Total execution time in ms */
    executionTime: number

    /** Timestamp */
    timestamp: string

    /** Tools applied */
    tools: string[]
  }
}

/**
 * Result from a single tool execution
 */
export interface ToolResult {
  /** Whether tool succeeded */
  success: boolean

  /** Tool-specific data */
  data?: Record<string, unknown> | string | number | boolean

  /** Error if tool failed */
  error?: string

  /** Tool execution metadata */
  metadata?: {
    /** Source of data */
    source?: string

    /** Execution time in ms */
    executionTime?: number

    /** Confidence score (0-1) */
    confidence?: number
  }
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * GTM API error codes
 */
export type GTMAPIErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'AUTH_ERROR'
  | 'INVALID_TOOL'
  | 'INVALID_REQUEST'
  | 'RATE_LIMIT'
  | 'SERVER_ERROR'
  | 'UNKNOWN'

/**
 * Enhanced error class for GTM API errors
 */
export class GTMAPIError extends Error {
  /** Error code */
  code: GTMAPIErrorCode

  /** HTTP status code (if applicable) */
  statusCode?: number

  /** Additional error details */
  details?: Record<string, unknown>

  /** Original error */
  originalError?: Error

  constructor(
    message: string,
    code: GTMAPIErrorCode = 'UNKNOWN',
    statusCode?: number,
    details?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message)
    this.name = 'GTMAPIError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.originalError = originalError

    // Maintain proper stack trace (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GTMAPIError)
    }
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * GTM API client configuration
 */
export interface GTMClientConfig {
  /** Base URL for GTM API (default: production URL) */
  baseURL?: string

  /** Authentication token (Supabase JWT or anon key) */
  authToken?: string

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number

  /** Max retry attempts (default: 3) */
  maxRetries?: number

  /** Whether to log requests (default: false) */
  debug?: boolean
}

/**
 * Tool validation result
 */
export interface ToolValidation {
  /** Whether all tools are valid */
  valid: boolean

  /** Valid tool names */
  validTools: string[]

  /** Invalid tool names */
  invalidTools: string[]

  /** Suggestions for invalid tools */
  suggestions?: Record<string, string[]>
}
