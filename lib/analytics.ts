/**
 * Simple analytics wrapper for tracking user events
 * Can be easily swapped for PostHog, Mixpanel, Amplitude, etc.
 */

interface AnalyticsEvent {
  event: string
  properties?: Record<string, unknown>
  timestamp?: number
}

class Analytics {
  private queue: AnalyticsEvent[] = []
  private isInitialized = false

  init() {
    if (this.isInitialized) return
    
    // Initialize your analytics provider here
    // Example: PostHog
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      // import('posthog-js').then(({ default: posthog }) => {
      //   posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      //     api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      //   })
      // })
    }
    
    this.isInitialized = true
    this.flushQueue()
  }

  track(event: string, properties?: Record<string, unknown>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now(),
    }

    if (!this.isInitialized) {
      this.queue.push(analyticsEvent)
      return
    }

    this.sendEvent(analyticsEvent)
  }

  identify(userId: string, traits?: Record<string, unknown>) {
    if (!this.isInitialized) {
      this.init()
    }

    // Identify user in your analytics provider
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Analytics: Identify user', userId, traits)
    }
  }

  private sendEvent(event: AnalyticsEvent) {
    // Send to your analytics provider
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Analytics:', event.event, event.properties)
    }
    
    // Example: PostHog
    // if (typeof window !== 'undefined' && (window as any).posthog) {
    //   (window as any).posthog.capture(event.event, event.properties)
    // }
  }

  private flushQueue() {
    while (this.queue.length > 0) {
      const event = this.queue.shift()
      if (event) {
        this.sendEvent(event)
      }
    }
  }
}

// Singleton instance
export const analytics = new Analytics()

// Convenience functions
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  analytics.track(event, properties)
}

// Common events
export const ANALYTICS_EVENTS = {
  // File events
  FILE_UPLOADED: 'file_uploaded',
  FILE_PARSE_ERROR: 'file_parse_error',
  
  // Processing events
  BATCH_STARTED: 'batch_started',
  BATCH_COMPLETED: 'batch_completed',
  BATCH_FAILED: 'batch_failed',
  BATCH_ERROR: 'batch_error',
  BATCH_CANCELLED: 'batch_cancelled',
  BATCH_EXPORTED: 'batch_exported',
  RESULTS_EXPORTED: 'results_exported',
  
  // Rate limit events
  RATE_LIMIT_HIT: 'rate_limit_hit',
  
  // UI events
  BETA_BANNER_DISMISSED: 'beta_banner_dismissed',
  BETA_UPGRADE_CLICKED: 'beta_upgrade_clicked',
  API_TOKEN_REVEALED: 'api_token_revealed',
  BULK_TEMPLATE_USED: 'bulk_template_used',

  // Error events
  ERROR_BOUNDARY_TRIGGERED: 'error_boundary_triggered',
} as const





