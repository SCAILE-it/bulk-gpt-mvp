# Developer Quick Start Guide

**Last Updated:** January 2025

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ and npm
- Supabase account and project
- Git

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd bulk-gpt-mvp-code

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Set up environment variables (see below)
```

### Environment Variables

Create `.env.local` with:

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

# Optional: Error Tracking
SENTRY_DSN=your_sentry_dsn
```

### Database Setup

```bash
# Using Supabase CLI
supabase db push

# Or manually apply migrations in order:
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_add_batch_results.sql
# ... etc
```

### Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 📁 Project Structure

```
bulk-gpt-mvp-code/
├── app/                    # Next.js app directory
│   ├── (authenticated)/   # Protected routes
│   │   ├── agents/        # Agents page
│   │   ├── context/       # Context page
│   │   ├── output/        # Output/Analytics page
│   │   └── profile/       # Profile page
│   ├── api/               # API routes
│   └── auth/              # Auth pages
├── components/            # React components
│   ├── bulk/              # Bulk processing components
│   ├── dashboard/         # Dashboard components
│   ├── ui/                # Shared UI components
│   └── ...
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and helpers
│   ├── analytics/         # Analytics (Web Vitals, etc.)
│   ├── supabase/          # Supabase clients
│   └── utils/             # Utility functions
├── public/                # Static assets
└── supabase/              # Database migrations
    └── migrations/
```

---

## 🛠️ Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes**
   - Follow existing code patterns
   - Use TypeScript for type safety
   - Follow component structure

3. **Test locally**
   ```bash
   npm run dev          # Development server
   npm run type-check   # Type checking
   npm run lint         # Linting
   ```

4. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

### Code Style

- **TypeScript**: Strict mode enabled
- **Components**: Functional components with TypeScript
- **Styling**: Tailwind CSS with design tokens
- **State**: React hooks (useState, useEffect, SWR)
- **Forms**: react-hook-form with zod validation

### Key Patterns

#### Data Fetching
```typescript
// Use SWR for client-side data fetching
import useSWR from 'swr'

const { data, error, isLoading } = useSWR('/api/endpoint', fetcher, {
  staleTime: 60000, // Cache for 60 seconds
})
```

#### API Routes
```typescript
// app/api/example/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  const supabase = await createClient()
  
  // ... your logic
  
  const totalTime = Date.now() - startTime
  console.log(`[PERF] Example fetch: ${totalTime}ms`)
  
  return NextResponse.json({ data }, {
    headers: {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
    },
  })
}
```

#### Components
```typescript
// components/example/ExampleComponent.tsx
'use client'

import { useState } from 'react'

interface ExampleComponentProps {
  title: string
  onAction?: () => void
}

export function ExampleComponent({ title, onAction }: ExampleComponentProps) {
  const [state, setState] = useState(false)
  
  return (
    <div className="bg-secondary/40 border border-border rounded-lg p-6">
      <h2 className="text-sm font-medium">{title}</h2>
      {/* ... */}
    </div>
  )
}
```

---

## 🧪 Testing

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### E2E Tests (if available)
```bash
npm run test:e2e
```

### Manual Testing Checklist
See `TESTING_CHECKLIST.md` for comprehensive testing procedures.

---

## 🚢 Building for Production

### Build
```bash
npm run build
```

### Test Production Build
```bash
npm start
```

### Verify Bundle Sizes
Check `.next/static/chunks/` for bundle sizes:
- Initial bundle should be < 500KB
- AnalyticsDashboard should be separate chunk

---

## 🐛 Debugging

### Common Issues

#### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### Type Errors
```bash
# Check TypeScript
npm run type-check

# Common fixes:
# - Add missing type definitions
# - Fix import paths
# - Add proper types
```

#### Supabase Connection Issues
- Verify environment variables
- Check Supabase project status
- Verify RLS policies

#### Performance Issues
- Check Network tab for slow requests
- Verify SWR caching is working
- Check bundle sizes
- Monitor Core Web Vitals in console

### Debug Tools

#### Browser DevTools
- Network tab: Check API requests and cache headers
- Console: See `[PERF]` and `[Web Vitals]` logs
- Performance tab: Profile page load

#### Server Logs
- Check terminal for `[PERF]` logs
- Check for error messages
- Verify database queries

---

## 📚 Key Concepts

### SWR Caching
- Client-side data fetching with caching
- Automatic revalidation on focus
- Optimistic updates
- Request deduplication

**Example:**
```typescript
const { data } = useSWR('/api/context-files', fetcher, {
  staleTime: 60000, // Cache for 60 seconds
})
```

### Performance Logging
API routes log performance metrics:
```
[PERF] Context files fetch: {
  total: "245ms",
  auth: "12ms",
  query: "180ms",
  transform: "53ms"
}
```

### Code Splitting
Heavy components are lazy-loaded:
```typescript
const AnalyticsDashboard = dynamic(
  () => import('@/components/dashboard/AnalyticsDashboard'),
  { ssr: false }
)
```

### Core Web Vitals
Automatically tracked:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- FCP (First Contentful Paint)
- TTFB (Time to First Byte)

---

## 🔗 Useful Resources

### Documentation
- `TESTING_CHECKLIST.md` - Testing procedures
- `IMPROVEMENTS_SUMMARY.md` - All improvements overview
- `DEPLOYMENT_GUIDE.md` - Production deployment
- `CHANGELOG.md` - Version history

### External Docs
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [SWR Documentation](https://swr.vercel.app/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)

---

## 💡 Tips

### Performance
- Use SWR for all data fetching
- Add performance logging to new API routes
- Lazy-load heavy components
- Add cache headers to API responses

### Accessibility
- Always add `aria-label` to buttons
- Use semantic HTML
- Test with keyboard navigation
- Verify focus indicators

### Mobile
- Test on real devices
- Use 44x44px minimum touch targets
- Stack content vertically on mobile
- Optimize images and assets

### Code Quality
- Write TypeScript types for all props
- Use existing component patterns
- Follow naming conventions
- Add comments for complex logic

---

## 🆘 Getting Help

1. **Check Documentation**
   - This guide
   - `TESTING_CHECKLIST.md`
   - `DEPLOYMENT_GUIDE.md`

2. **Check Code**
   - Look at similar components
   - Check existing patterns
   - Review hooks and utilities

3. **Ask Team**
   - Check Slack/team chat
   - Ask in code review
   - Pair program if stuck

4. **Debug**
   - Check browser console
   - Check server logs
   - Use React DevTools
   - Use Network tab

---

## ✅ Pre-Commit Checklist

Before committing:

- [ ] Code compiles (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Tests pass (if applicable)
- [ ] Tested locally (`npm run dev`)
- [ ] Follows code style
- [ ] Added comments for complex logic
- [ ] Updated documentation if needed

---

**Happy Coding! 🚀**


