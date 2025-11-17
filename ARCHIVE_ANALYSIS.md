# Feature Archive Analysis Report

## Executive Summary
This analysis identifies all files, components, and routes related to three features to be archived:
1. **Resources Page** - GTM resource management (leads, keywords, content, campaigns)
2. **API Keys Tab** - In settings/profile for programmatic access
3. **Analytics Subtab** - Dashboard analytics (NOT executions tab which must stay)

---

## 1. RESOURCES PAGE - Complete File Inventory

### Page Route
- **Path:** `/Users/federicodeponte/bulk-gpt-mvp-code/app/(authenticated)/resources/page.tsx`
- **Type:** Page component with 4 tabs (Leads, Keywords, Content, Campaigns)
- **Size:** ~83 lines
- **Status:** ACTIVE - Contains GTM Engine transformation

### Navigation References
- **Location:** `/Users/federicodeponte/bulk-gpt-mvp-code/components/layout/nav.tsx` (lines 102-103, 113)
- **Navigation Link:** `/resources` with label "RESOURCES"
- **Desktop Navigation:** Line 113 in navLinks array
- **Mobile Navigation:** Same navLinks used for mobile menu

### Components (Resource System)
```
/components/resources/
├── ResourcesList.tsx            - Main list component (with pagination, search, filters)
├── ResourceCard.tsx             - Individual resource card display
├── ResourceDetail.tsx           - Detailed view of single resource
├── CreateResourceModal.tsx       - Modal for creating new resources
├── ContentEditor.tsx            - Editor for content resources
├── ResourceFilters.tsx          - Filter/search component
├── BulkActionsBar.tsx          - Bulk operations toolbar
├── ResourceLinker.tsx           - Link resources together
└── AnalyticsDataDisplay.tsx    - Analytics within resources
```

### API Routes (Resource Endpoints)
```
/app/api/resources/
├── route.ts                     - GET/POST resources
├── bulk/route.ts               - Bulk resource operations
├── [id]/
│   ├── route.ts                - GET/PUT/DELETE single resource
│   └── link/route.ts           - Link resources
```

### Type Definitions
- **Location:** `/lib/types/resources.ts` (likely location)
- **Referenced in:** ResourcesList, ResourceCard, CreateResourceModal

### Database Tables (Supabase)
- `resources` table
- `resource_links` table (for resource linking)

---

## 2. API KEYS TAB - Complete File Inventory

### Navigation Structure
- **Parent Page:** `/profile` (Profile/Settings page)
- **Current Tabs in Profile:** Account, API Keys, Usage, Billing
- **Tab Location:** Lines 277-280 in profile/page.tsx

### Components (API Keys System)
```
/components/api-keys/
├── ApiKeyList.tsx              - List of user's API keys with revoke button
└── CreateApiKeyModal.tsx       - Modal to create new API keys
```

### Features:
- Create new API keys
- View key prefix (partial display for security)
- See creation date and last used date
- Revoke/delete keys
- Security: Keys prefixed display

### Related Hooks
- **Location:** `/hooks/useApiKeys.ts` (likely)
- **Functions:** useApiKeys hook with CRUD operations

### API Routes (API Key Management)
- `/app/api/keys/route.ts` (presumed)
- `/app/api/user/profile/route.ts` (may include key operations)

### Database Tables
- `api_keys` table (stores user API keys)
- Columns: id, user_id, name, prefix, secret_hash, created_at, last_used_at, revoked_at

---

## 3. ANALYTICS SUBTAB - Complete File Inventory

### Page Structure
- **Parent Page:** `/Users/federicodeponte/bulk-gpt-mvp-code/app/(authenticated)/analytics/page.tsx`
  - Actually this is NOT the page referenced. The analytics tab is on the HOME page (dashboard)
- **Actual Location:** Home/Dashboard page with tabs (lines 844-862 in home/page.tsx)
- **Tab Name:** "Analytics" tab with BarChart3 icon
- **Sibling Tab:** "Executions" tab (MUST STAY)

### Main Analytics Component
- **Location:** `/components/dashboard/AnalyticsDashboard.tsx`
- **Status:** Dynamically imported with lazy loading
- **Size:** Heavy component with recharts library
- **Features:**
  - Token usage statistics
  - Model breakdown charts
  - Cost calculations
  - Date range filtering
  - Peak usage analysis
  - Comparison widgets
  - Export capabilities (CSV, JSON, PNG, PDF)

### Analytics Components (Dependencies)
```
/components/dashboard/
├── AnalyticsDashboard.tsx      - Main analytics dashboard
├── DateRangePicker.tsx          - Date range selector
├── InsightsPanel.tsx            - Insights and annotations
├── ComparisonWidget.tsx         - Comparison views
└── ChartModal.tsx               - Expanded chart views
```

### Chart Components (Recharts Dependencies)
```
/components/charts/
├── LazyChartComponents.ts       - Lazy-loaded recharts
├── CustomTooltip.tsx            - Custom tooltip for charts
└── ChartModal.tsx               - Modal for full-size charts
```

### Utilities (Analytics-specific)
```
/lib/utils/
├── cost-calculator.ts           - Token cost calculations
├── chart-export.ts              - Export charts as PNG/PDF
├── chart-annotations.ts         - Peak usage, averages
├── data-export.ts               - Export analytics data (CSV, JSON)
├── model-utils.ts               - Model name normalization
└── chart-export.ts              - SVG to PNG/PDF conversion
```

### Hooks (Analytics-specific)
```
/hooks/
├── useDashboardPreferences.ts   - Save user preferences
└── useSavedFilters.ts           - Save filter states
```

### API Routes (Analytics Data)
```
/app/api/dashboard/
├── stats/route.ts               - Dashboard statistics
└── recent-runs/route.ts         - Recent batch runs
```

### Database Queries
- Queries `batches` table for aggregation
- Queries `batch_results` table for token/model data
- Aggregates by date, model, status

### Features to Remove:
- Token usage charts
- Model breakdown analytics
- Cost calculations
- Peak usage analysis
- Comparison widgets
- Analytics export (CSV, JSON, PNG, PDF)
- Date range filtering for analytics
- Insights panel

### Features to KEEP (Executions Tab):
- Execution history table
- Status badges
- Progress indicators
- Download results button
- Search and filter for executions
- Batch statistics (Total, Completed, Failed, Success Rate)

---

## 4. CURRENT NAVIGATION STRUCTURE

### Main Nav Links (from nav.tsx lines 110-116)
```
Primary Navigation:
- /context         - CONTEXT
- /agents          - AGENTS
- /resources       - RESOURCES    ← TO ARCHIVE
- /analytics       - ANALYTICS    ← TO ARCHIVE (Tab within Home)
- /admin           - ADMIN (conditional, admin users only)
```

### Profile Dropdown Menu
```
- Profile (links to /profile)
  ├── Account Info
  ├── API Keys         ← TO ARCHIVE
  ├── Usage & Limits
  ├── Billing & Invoices
```

### Home/Dashboard Tabs (home/page.tsx)
```
Two tabs:
- Analytics tab      ← TO ARCHIVE (only this tab)
- Executions tab    ← KEEP
```

---

## 5. ARCHIVE VS KEEP DECISION MATRIX

### TO ARCHIVE:
| Item | Location | Impact | Size |
|------|----------|--------|------|
| Resources Page | `/app/(authenticated)/resources/page.tsx` | ~83 lines | Core page |
| Resources Navigation Link | `nav.tsx` lines 102-103, 113 | High | 2 lines |
| Resources Components | `components/resources/*` | Very High | 9 files |
| Resources API Routes | `app/api/resources/**` | High | 4 route files |
| API Keys Tab | Profile page lines 277-280 | Medium | 4 lines + components |
| API Keys Components | `components/api-keys/*` | Medium | 2 files |
| API Keys Hook | `hooks/useApiKeys.ts` | Medium | 1 file |
| Analytics Tab | Home page lines 845-852 | Medium | Tab definition |
| AnalyticsDashboard | `components/dashboard/AnalyticsDashboard.tsx` | Very High | 700+ lines |
| Analytics Components | `components/dashboard/(various)` | High | Multiple files |
| Analytics Charts | `components/charts/*` | High | Multiple files |
| Analytics Utilities | `lib/utils/(analytics-related)` | High | Multiple files |
| Analytics Hooks | `hooks/use(Dashboard/Filters)*.ts` | Medium | 2 files |
| Analytics Routes | `app/api/dashboard/**` | Medium | 2 route files |

### TO KEEP:
| Item | Location | Reason |
|------|----------|--------|
| Executions Tab | Home page lines 853-858 | Core functionality |
| Dashboard Stats | Lines 481-508 in home/page.tsx | Shows execution metrics |
| Batch History Table | Lines 510-838 | Lists all batch executions |
| Download Functionality | Lines 322-401 | Export execution results |
| Status Badges | StatusBadgeWrapper | Indicate batch status |
| Progress Display | ProgressDisplay component | Show batch progress |

---

## 6. DEPENDENCIES TO CONSIDER

### External Libraries Used by Features to Archive:
- `recharts` - Used heavily by Analytics Dashboard
- `date-fns` - Date manipulation for analytics
- `sonner` - Toast notifications
- `lucide-react` - Icons

**Note:** These libraries are used elsewhere, so don't remove globally.

### Internal Dependencies:
- `@/lib/supabase/client` - Database queries (used everywhere)
- `@/components/ui/*` - Shared UI components (use everywhere)
- Toast notifications via `sonner` (used everywhere)

---

## 7. FILE COUNT SUMMARY

### Files to Archive:

**Page Files:** 1
- `/app/(authenticated)/resources/page.tsx`

**Component Files:** 13
- Resources folder: 9 files
- API Keys folder: 2 files
- Dashboard folder (analytics-specific): 2 files

**Hook Files:** 3
- `useApiKeys.ts`
- `useDashboardPreferences.ts`
- `useSavedFilters.ts`

**Utility Files:** ~6
- All `analytics-*` utilities
- All `cost-*` utilities
- `chart-export.ts`

**API Route Files:** 6
- `app/api/resources/**` (4 files)
- `app/api/dashboard/**` (2 files)
- Potential API key routes

**Configuration/Types:** ~2
- Type definitions in `lib/types/resources.ts`
- Related schemas

**Navigation Changes:** 1
- `components/layout/nav.tsx` (remove Resources link)
- `app/(authenticated)/home/page.tsx` (remove Analytics tab)
- `app/(authenticated)/profile/page.tsx` (remove API Keys tab)

**Total: ~30+ files to archive**

---

## 8. DIRECTORY STRUCTURE TO CREATE FOR ARCHIVE

```
/archive/
├── components/
│   ├── resources/               (9 files)
│   ├── api-keys/               (2 files)
│   └── dashboard/
│       └── (analytics-specific files)
├── api/
│   ├── resources/               (4 route files)
│   └── dashboard/               (2 route files)
├── hooks/
│   ├── useApiKeys.ts
│   ├── useDashboardPreferences.ts
│   └── useSavedFilters.ts
├── lib/
│   ├── types/
│   │   └── resources.ts
│   └── utils/
│       ├── (analytics-related utilities)
│       └── (cost-related utilities)
└── pages/
    └── resources/
        └── page.tsx
```

---

## 9. CLEANUP CHECKLIST

After archiving, verify these locations are updated:

### Navigation Changes:
- [ ] Remove `/resources` link from `nav.tsx` line 113
- [ ] Remove resources prefetch from `handleNavHover` in `nav.tsx` lines 102-103
- [ ] Remove Analytics tab from `home/page.tsx` lines 845-852
- [ ] Remove API Keys tab from `profile/page.tsx` lines 277-280

### Import Cleanup:
- [ ] Search for imports of `ResourcesList` component
- [ ] Search for imports of `ApiKeyList` component
- [ ] Search for imports of `AnalyticsDashboard` component
- [ ] Remove unused chart components if not used elsewhere

### Database (Verify Still Exists):
- [ ] `resources` table (keep or migrate to archive DB?)
- [ ] `resource_links` table
- [ ] `api_keys` table
- [ ] Batch statistics queries (keep for executions)

### Test Updates:
- [ ] Update navigation tests to remove Resources
- [ ] Update profile tests to remove API Keys tab
- [ ] Update dashboard tests to remove Analytics tab

---

## 10. CURRENT ACTIVE PAGES (TO KEEP)

These pages will remain and should NOT be archived:

| Page | Route | Purpose |
|------|-------|---------|
| Home/Dashboard | `/` (authenticated) | Batch history & executions |
| Agents | `/agents` | AI agent management |
| Context | `/context` | Business context files |
| Profile | `/profile` (minus API Keys tab) | Account & usage settings |
| Billing | Part of `/profile` | Invoices & plans |
| Schedules | `/schedules` | Scheduled batch runs |
| Auth | `/auth` | Login/signup |
| Admin | `/admin` | Admin panel (conditional) |
| Output | `/output` | Batch output (if exists) |

---

## Conclusion

**Total Archive Scope:**
- 30+ files across pages, components, hooks, utilities, and API routes
- 3 navigation modifications
- Multiple component dependencies to untangle
- Heavy recharts/analytics library usage to potentially reduce

**Risk Level:** MEDIUM-HIGH (Analytics is integrated with Dashboard)
**Implementation Effort:** 2-3 hours (with testing)

