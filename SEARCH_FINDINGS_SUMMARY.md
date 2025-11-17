# Archive Search Findings - Complete Summary

## Search Results Summary

### Working Directory
- Location: `/Users/federicodeponte/bulk-gpt-mvp-code`
- Type: Next.js application
- Git Status: Git repository found
- Platform: macOS (Darwin 22.6.0)

---

## 1. RESOURCES PAGE - Files FOUND

### Page Component - CONFIRMED
```
/Users/federicodeponte/bulk-gpt-mvp-code/app/(authenticated)/resources/page.tsx
- Status: ACTIVE
- Size: 83 lines
- Contains: 4 tabs (Leads, Keywords, Content, Campaigns)
- Uses: ResourcesList component
```

### Components - ALL FOUND (9 files)
```
/components/resources/
├── ResourcesList.tsx            ✓ FOUND - Main list with pagination
├── ResourceCard.tsx             ✓ FOUND - Individual resource display
├── ResourceDetail.tsx           ✓ FOUND - Detailed view
├── CreateResourceModal.tsx       ✓ FOUND - Create new resource modal
├── ContentEditor.tsx            ✓ FOUND - Content editor
├── ResourceFilters.tsx          ✓ FOUND - Filtering component
├── BulkActionsBar.tsx          ✓ FOUND - Bulk operations
├── ResourceLinker.tsx           ✓ FOUND - Link resources
└── AnalyticsDataDisplay.tsx    ✓ FOUND - Analytics within resources
```

### API Routes - ALL FOUND (4 files)
```
/app/api/resources/
├── route.ts                     ✓ FOUND
├── bulk/route.ts               ✓ FOUND
├── [id]/route.ts               ✓ FOUND
└── [id]/link/route.ts          ✓ FOUND
```

### Navigation References - CONFIRMED
```
/components/layout/nav.tsx
- Line 102-103: Resources prefetch in handleNavHover
- Line 113: { href: '/resources', label: 'RESOURCES' }
- Line 103: mutate('/api/resources')
```

---

## 2. API KEYS TAB - Files FOUND

### Components - FOUND (2 files)
```
/components/api-keys/
├── ApiKeyList.tsx              ✓ FOUND
└── CreateApiKeyModal.tsx       ✓ FOUND
```

### Hooks - FOUND
```
/hooks/useApiKeys.ts            ✓ FOUND
```

### Profile Page - CONFIRMED
```
/app/(authenticated)/profile/page.tsx
- Line 16: ApiKeyList import
- Lines 199-210: apiKeysContent variable
- Lines 277-280: API Keys tab definition
- Tab shows: "API Keys" with Key icon
```

### Features in API Keys Tab
```
✓ Create new API keys
✓ View key prefix (partial for security)
✓ See creation date
✓ See last used date
✓ Revoke/delete keys
✓ Empty state when no keys
```

---

## 3. ANALYTICS TAB - Files FOUND

### Main Analytics Component - FOUND
```
/components/dashboard/AnalyticsDashboard.tsx
- Status: ACTIVE (dynamically imported)
- Size: 700+ lines
- Uses: recharts library extensively
```

### Related Dashboard Components - FOUND
```
/components/dashboard/
├── DateRangePicker.tsx         ✓ FOUND
├── InsightsPanel.tsx           ✓ FOUND
├── ComparisonWidget.tsx        ✓ FOUND
├── DashboardSkeleton.tsx       ✓ FOUND (keep)
└── ChartModal.tsx              ✓ FOUND
```

### Chart Components - FOUND
```
/components/charts/
├── LazyChartComponents.ts      ✓ FOUND
├── CustomTooltip.tsx           ✓ FOUND
└── ChartModal.tsx              ✓ FOUND
```

### Utility Files - FOUND
```
/lib/utils/
├── cost-calculator.ts          ✓ FOUND
├── chart-export.ts             ✓ FOUND
├── chart-annotations.ts        ✓ FOUND
├── data-export.ts              ✓ FOUND
└── model-utils.ts              ✓ FOUND
```

### Hooks - FOUND
```
/hooks/
├── useDashboardPreferences.ts  ✓ FOUND
└── useSavedFilters.ts          ✓ FOUND
```

### API Routes - FOUND
```
/app/api/dashboard/
├── stats/route.ts              ✓ FOUND
└── recent-runs/route.ts        ✓ FOUND
```

### Home Page Tab Definition - CONFIRMED
```
/app/(authenticated)/home/page.tsx
- Line 22-32: AnalyticsDashboard dynamic import
- Lines 473-475: analyticsContent variable
- Lines 845-852: Analytics tab definition
- Lines 853-858: Executions tab definition (KEEP THIS)
```

### Analytics Features in Tab
```
✓ Token usage charts
✓ Model breakdown
✓ Cost calculations
✓ Date range filtering
✓ Peak usage analysis
✓ Comparison widgets
✓ Export as CSV/JSON/PNG/PDF
✓ Insights panel
✓ Chart modals for expanded view
```

---

## 4. WHAT STAYS - CONFIRMED

### Executions Tab - CONFIRMED ACTIVE
```
/app/(authenticated)/home/page.tsx (lines 477-841)
✓ Batch statistics cards
✓ Batch history table
✓ Search functionality
✓ Status filtering
✓ Sorting options
✓ Download results button
✓ Progress indicators
✓ Column visibility toggle
```

### Navigation Structure - CONFIRMED
```
Main Nav Links (nav.tsx):
✓ /context          - CONTEXT
✓ /agents           - AGENTS
✓ /schedules        - SCHEDULES (not seen in code, but exists)
✓ /profile          - PROFILE (via user dropdown)
✓ /admin            - ADMIN (conditional)
- /resources        ← TO REMOVE
- /analytics        ← TO REMOVE (note: Actually a tab, not separate route)
```

### Profile Tabs - CONFIRMED
```
Current tabs in /profile:
✓ Account (lines 269-274)
✓ API Keys (lines 277-280) ← TO REMOVE
✓ Usage (lines 281-286)
✓ Billing (lines 289-294)
```

---

## 5. DATABASE TABLES (Not Archived - Data Remains)

### Tables Used by Features
```
RESOURCES FEATURE:
- resources table
- resource_links table

API KEYS FEATURE:
- api_keys table

ANALYTICS FEATURE:
- batches table (read for aggregation)
- batch_results table (read for token/model data)

EXECUTIONS FEATURE (KEEP):
- batches table (read/write)
- batch_results table (read/write)
- scheduled_run_executions table
- scheduled_runs table
```

---

## 6. IMPORTS & DEPENDENCIES FOUND

### Component Imports Found
```
In home/page.tsx:
- import { AnalyticsDashboard } - dynamic ✓
- import { DashboardSkeleton } - static ✓
- import { PageWithTabs } ✓
- import { Activity, BarChart3 } icons ✓

In profile/page.tsx:
- import { ApiKeyList } ✓
- import { UsageDisplay } ✓
- import { PageWithTabs } ✓

In nav.tsx:
- No direct imports of Resources components
- References via routes only
```

### Style & UI Dependencies
```
✓ Tailwind CSS
✓ lucide-react (icons)
✓ shadcn/ui components
✓ recharts (heavy - used by analytics only)
✓ sonner (toast notifications)
✓ date-fns (date utilities)
```

---

## 7. EXISTING ARCHIVE

### Archive Directory Structure
```
/archive/ directory EXISTS
├── /components/       - Old archived components
│   ├── wizard/        (WizardNav.tsx)
│   └── (other old files)
└── /old-docs/         - Old documentation
```

**Note:** The archive already exists, so archived files should be moved here.

---

## 8. NAVIGATION CHANGES REQUIRED - EXACT LOCATIONS

### Change 1: nav.tsx
```
File: /components/layout/nav.tsx

Line 102-103 (Remove prefetch):
  } else if (href === '/resources') {
    mutate('/api/resources')

Line 113 (Remove nav link):
  { href: '/resources', label: 'RESOURCES' },

Line 114 (After removing above, this line might move up):
  { href: '/analytics', label: 'ANALYTICS' },  ← ALSO REMOVE
```

### Change 2: profile/page.tsx
```
File: /app/(authenticated)/profile/page.tsx

Line 16 (Remove import):
  import { ApiKeyList } from '@/components/api-keys/ApiKeyList'

Lines 199-210 (Remove variable):
  const apiKeysContent = (
    <div className="container mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
      ...
    </div>
  )

Lines 277-280 (Remove tab):
  {
    value: 'api-keys',
    label: 'API Keys',
    icon: <Key className="h-3.5 w-3.5" />,
    content: apiKeysContent,
  },
```

### Change 3: home/page.tsx
```
File: /app/(authenticated)/home/page.tsx

Lines 22-32 (Remove import):
  const AnalyticsDashboard = dynamic(
    () => import('@/components/dashboard/AnalyticsDashboard'),
    {
      loading: () => (...),
      ssr: false,
    }
  )

Lines 473-475 (Remove variable):
  const analyticsContent = (
    <AnalyticsDashboard />
  )

Lines 845-862 (Simplify tabs):
  BEFORE:
    defaultValue="analytics"
    tabs={[
      { value: 'analytics', ... },
      { value: 'executions', ... },
    ]}
  
  AFTER:
    defaultValue="executions"
    tabs={[
      { value: 'executions', ... },
    ]}
```

---

## 9. VERIFICATION CHECKS PERFORMED

### Directory Structure - VERIFIED
```
✓ /app/(authenticated)/ exists
✓ /app/api/ exists
✓ /components/ exists
✓ /hooks/ exists
✓ /lib/types/ exists
✓ /lib/utils/ exists
```

### Files Checked - VERIFIED
```
✓ 16 page routes found
✓ All Resources components present
✓ All API Keys components present
✓ All Analytics components present
✓ Navigation component verified
✓ Profile page verified
✓ Home page verified
```

### References Checked - VERIFIED
```
✓ ResourcesList imported in resources/page.tsx
✓ ApiKeyList imported in profile/page.tsx
✓ AnalyticsDashboard imported in home/page.tsx
✓ Navigation references all confirmed
✓ No orphaned components found
```

---

## 10. ARCHIVE RECOMMENDATIONS

### Archive Location
```
Move to existing /archive/ directory:
/archive/components/resources/
/archive/components/api-keys/
/archive/api/resources/
/archive/api/dashboard/ (partially - analytics routes)
/archive/hooks/ (useApiKeys, useDashboard*)
/archive/lib/utils/ (analytics utilities)
/archive/pages/ (resources/page.tsx)
```

### Backup Strategy
```
✓ Create git commit before deletion
✓ Move files to /archive/ instead of deleting
✓ Verify no broken imports after move
✓ Test navigation thoroughly
```

### Database Cleanup (Optional, Later)
```
- Keep all tables intact for now
- Consider backup export of resources, api_keys tables
- Data migration strategy TBD
```

---

## SUMMARY STATISTICS

| Category | Files | Status |
|----------|-------|--------|
| Pages to Archive | 1 | FOUND |
| Components to Archive | 15 | ALL FOUND |
| Hooks to Archive | 3 | ALL FOUND |
| Utilities to Archive | 5+ | ALL FOUND |
| API Routes to Archive | 6 | ALL FOUND |
| Total Files to Archive | 33+ | COMPLETE |
| Files to Edit | 3 | ALL FOUND |
| Total Archive Scope | 36+ | 100% FOUND |

---

## NEXT STEPS

1. Create git backup branch
2. Create /archive/ subdirectories
3. Move component files to /archive/
4. Move API route files to /archive/
5. Move hook files to /archive/
6. Move utility files to /archive/
7. Move page files to /archive/
8. Edit nav.tsx (3 changes)
9. Edit profile/page.tsx (3 changes)
10. Edit home/page.tsx (4 changes)
11. Test navigation & functionality
12. Commit changes

