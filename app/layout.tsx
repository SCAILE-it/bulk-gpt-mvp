import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: {
    default: 'Bulk GPT - Batch Process CSV with AI',
    template: '%s | Bulk GPT',
  },
  description: 'Transform CSV data at scale with AI. Upload your spreadsheet, define custom prompts, and process thousands of rows using Google Gemini AI. Fast, powerful bulk processing for research, content generation, and data enrichment.',
  keywords: ['bulk AI processing', 'CSV batch processing', 'Gemini AI', 'data enrichment', 'AI automation', 'bulk GPT', 'spreadsheet AI'],
  authors: [{ name: 'Bulk GPT Team' }],
  creator: 'Bulk GPT',
  publisher: 'Bulk GPT',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://bulk-gpt-app.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Bulk GPT',
    title: 'Bulk GPT - Batch Process CSV with AI',
    description: 'Transform CSV data at scale with AI. Upload your spreadsheet, define custom prompts, and process thousands of rows using Google Gemini AI.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Bulk GPT - AI-Powered Bulk Processing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bulk GPT - Batch Process CSV with AI',
    description: 'Transform CSV data at scale with AI. Upload, define prompts, and process thousands of rows with Gemini AI.',
    images: ['/og-image.svg'],
    creator: '@bulk_gpt', // TODO: Update with actual Twitter handle
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
      manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={4000}
        />
      </body>
    </html>
  )
}

