import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  // Enable instrumentation hook for Sentry
  experimental: {
    instrumentationHook: true,
  },
}

// Sentry webpack plugin options
const sentryWebpackPluginOptions = {
  // Suppress source map upload logs in development
  silent: process.env.NODE_ENV === 'development',

  // Enable source maps in production for better error tracking
  hideSourceMaps: false,

  // Disable source map upload in development OR when no auth token is available
  dryRun: process.env.NODE_ENV === 'development' || !process.env.SENTRY_AUTH_TOKEN,
}

// Conditionally wrap Next.js config with Sentry only if auth token is available
// This prevents build failures when SENTRY_AUTH_TOKEN is not set on Vercel
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig
