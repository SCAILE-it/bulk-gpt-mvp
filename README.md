# Bulk GPT - AI-Powered Bulk Content Generation

Transform CSV data into AI-generated content at scale using Google Gemini AI.

## 🎯 Project Status

**✅ Production Ready** - All performance optimizations, UX improvements, and accessibility enhancements complete.

This application has been optimized for performance, accessibility, and user experience. See [CHANGELOG.md](./CHANGELOG.md) for complete improvement history.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Open http://localhost:3000
# Login: test@example.com / password
```

## 📁 Project Structure

```
bulk-gpt-app/
├── app/                    # Next.js 14 app directory
│   ├── (authenticated)/   # Protected routes
│   │   ├── agents/       # Agents page
│   │   ├── context/      # Context files management
│   │   ├── output/       # Analytics & results
│   │   └── profile/      # User settings
│   ├── api/              # API routes
│   └── auth/             # Authentication pages
├── components/            # React components
│   ├── bulk/            # Bulk processing components
│   ├── dashboard/        # Dashboard components
│   └── ui/              # Shared UI components
├── hooks/                # Custom React hooks (SWR caching)
├── lib/                  # Utilities and helpers
│   ├── analytics/       # Web Vitals monitoring
│   └── supabase/        # Supabase clients
├── public/               # Static assets
└── supabase/             # Database migrations
```

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Hooks + SWR (caching)
- **Database:** Supabase (PostgreSQL)
- **AI:** Google Gemini AI
- **Testing:** Vitest + Playwright
- **Deployment:** Vercel

## ⚡ Key Features

- ✅ **CSV Processing** - Upload and process CSV files at scale
- ✅ **AI-Powered** - Google Gemini AI for content generation
- ✅ **Real-time Results** - Streaming results as they're generated
- ✅ **Context Files** - Upload reference files for better AI context
- ✅ **Saved Prompts** - Save and reuse custom prompts
- ✅ **Analytics Dashboard** - Track usage and performance
- ✅ **Scheduled Runs** - Automate batch processing
- ✅ **Export Results** - Download processed data as CSV
- ✅ **Performance Optimized** - 60-100% faster loads with SWR caching
- ✅ **Accessible** - WCAG compliant with skip links and ARIA labels
- ✅ **Mobile Responsive** - Optimized for all screen sizes

## 🚀 Performance Features

- **SWR Caching** - Client-side caching for instant subsequent loads
- **HTTP Cache Headers** - Browser/CDN caching for API responses
- **Code Splitting** - Lazy-loaded components for faster initial load
- **Performance Logging** - Detailed timing metrics for optimization
- **Core Web Vitals** - Automatic tracking of LCP, FID, CLS, FCP, TTFB

## 📖 Documentation

### Getting Started
- **[DEVELOPER_QUICKSTART.md](./DEVELOPER_QUICKSTART.md)** - Complete developer setup guide
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)** - Comprehensive testing procedures

### Project Information
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and improvements
- **[IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md)** - Complete improvements overview
- **[QUICK_START.md](./QUICK_START.md)** - Quick reference guide

### Historical Documentation
- **archive/** - Historical documentation (reference only)

## 🔧 Development

```bash
# Type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

## 🧪 Testing

**Comprehensive E2E testing infrastructure** - See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for full documentation.

### Quick Start

```bash
# One-time setup (< 5 minutes)
npm run test:setup   # Creates test user, starts server, validates environment

# Run all E2E tests
npm run test:e2e

# Cleanup after testing
npm run test:cleanup
```

### Available Commands

```bash
npm run test:env      # Verify environment setup
npm run test:server   # Start dev server on port 3334
npm run test:user     # Create test user in Supabase
npm run test:setup    # Complete automated setup
npm run test:e2e      # Run Playwright E2E tests
npm run test:cleanup  # Stop server and clean up
```

## 📊 Performance Benchmarks

### Before Optimizations
- Context files load: 500-1000ms
- Prompts load: 300-600ms
- Analytics dashboard: Included in initial bundle (~200KB)

### After Optimizations
- Context files load: **Instant** (cached) or ~200ms (first load)
- Prompts load: **Instant** (cached) or ~150ms (first load)
- Analytics dashboard: **Lazy loaded** (~50KB initial savings)
- Expected cache hit rate: **70-80%** for typical usage

## 🎨 UX Improvements

- ✅ **Tool Categories** - Tools organized by category (Enrichment, Generation, Analysis)
- ✅ **Onboarding Flow** - Improved trigger logic for new users
- ✅ **Empty States** - Enhanced with actionable guidance
- ✅ **Mobile Optimization** - Improved touch targets and spacing
- ✅ **Accessibility** - Skip links, ARIA labels, focus indicators
- ✅ **Loading States** - Skeleton loaders for better perceived performance

## 🔒 Security

- Supabase Row Level Security (RLS) enabled
- Environment variables for sensitive data
- Secure authentication flow
- API rate limiting

## 🌐 Environment Variables

Required environment variables (see `.env.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## 🤝 Contributing

1. Read [DEVELOPER_QUICKSTART.md](./DEVELOPER_QUICKSTART.md) for setup
2. Follow existing code patterns (hooks, components, API routes)
3. Add performance logging to new API routes
4. Write tests for new features
5. Update documentation

## 📄 License

Private repository - All rights reserved

---

## 🆘 Getting Help

- **Setup Issues:** See [DEVELOPER_QUICKSTART.md](./DEVELOPER_QUICKSTART.md)
- **Deployment:** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Testing:** See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
- **Performance:** Check browser console for `[PERF]` and `[Web Vitals]` logs

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅
