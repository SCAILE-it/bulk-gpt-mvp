# Detailed Archive File List - Exact Paths

## 1. RESOURCES PAGE - All Files to Archive

### Page Component
```
/Users/federicodeponte/bulk-gpt-mvp-code/app/(authenticated)/resources/page.tsx
```

### Resource Components (in /components/resources/)
```
/Users/federicodeponte/bulk-gpt-mvp-code/components/resources/ResourcesList.tsx
/Users/federicodeponte/bulk-gpt-mvp-code/components/resources/ResourceCard.tsx
/Users/federicodeponte/bulk-gpt-mvp-code/components/resources/ResourceDetail.tsx
/Users/federicodeponte/bulk-gpt-mvp-code/components/resources/CreateResourceModal.tsx
/Users/federicodeponte/bulk-gpt-mvp-code/components/resources/ContentEditor.tsx
/Users/federicodeponte/bulk-gpt-mvp-code/components/resources/ResourceFilters.tsx
/Users/federicodeponte/bulk-gpt-mvp-code/components/resources/BulkActionsBar.tsx
/Users/federicodeponte/bulk-gpt-mvp-code/components/resources/ResourceLinker.tsx
/Users/federicodeponte/bulk-gpt-mvp-code/components/resources/AnalyticsDataDisplay.tsx
```

### API Routes for Resources
```
/Users/federicodeponte/bulk-gpt-mvp-code/app/api/resources/route.ts
/Users/federicodeponte/bulk-gpt-mvp-code/app/api/resources/bulk/route.ts
/Users/federicodeponte/bulk-gpt-mvp-code/app/api/resources/[id]/route.ts
/Users/federicodeponte/bulk-gpt-mvp-code/app/api/resources/[id]/link/route.ts
```

### Type Definitions (to search)
```
/Users/federicodeponte/bulk-gpt-mvp-code/lib/types/resources.ts (if exists)
```

---

## 2. API KEYS TAB - All Files to Archive

### Components in /components/api-keys/
```
/Users/federicodeponte/bulk-gpt-mvp-code/components/api-keys/ApiKeyList.tsx
/Users/federicodeponte/bulk-gpt-mvp-code/components/api-keys/CreateApiKeyModal.tsx
```

### Hooks
```
/Users/federicodeponte/bulk-gpt-mvp-code/hooks/useApiKeys.ts
```

### API Routes (to search for)
```
/Users/federicodeponte/bulk-gpt-mvp-code/app/api/keys/route.ts (if exists)
```

---

## 3. ANALYTICS TAB - All Files to Archive

### Main Analytics Component
```
/Users/federicodeponte/bulk-gpt-mvp-code/components/dashboard/AnalyticsDashboard.tsx
```

### Related Dashboard Components
```
/Users/federicodeponte/bulk-gpt-mvp-code/components/dashboard/DateRangePicker.tsx
/Users/federicodeponte/bulk-gpt-mvp-code/components/dashboard/InsightsPanel.tsx
/Users/federicodeponte/bulk-gpt-mvp-code/components/dashboard/ComparisonWidget.tsx
```

### Chart Components
```
/Users/federicodeponte/bulk-gpt-mvp-code/components/charts/LazyChartComponents.ts
/Users/federicodeponte/bulk-gpt-mvp-code/components/charts/CustomTooltip.tsx
/Users/federicodeponte/bulk-gpt-mvp-code/components/charts/ChartModal.tsx
```

### Hooks (Dashboard/Analytics)
```
/Users/federicodeponte/bulk-gpt-mvp-code/hooks/useDashboardPreferences.ts
/Users/federicodeponte/bulk-gpt-mvp-code/hooks/useSavedFilters.ts
```

### Utility Files
```
/Users/federicodeponte/bulk-gpt-mvp-code/lib/utils/cost-calculator.ts
/Users/federicodeponte/bulk-gpt-mvp-code/lib/utils/chart-export.ts
/Users/federicodeponte/bulk-gpt-mvp-code/lib/utils/chart-annotations.ts
/Users/federicodeponte/bulk-gpt-mvp-code/lib/utils/data-export.ts (if analytics-only)
/Users/federicodeponte/bulk-gpt-mvp-code/lib/utils/model-utils.ts
```

### API Routes
```
/Users/federicodeponte/bulk-gpt-mvp-code/app/api/dashboard/stats/route.ts
/Users/federicodeponte/bulk-gpt-mvp-code/app/api/dashboard/recent-runs/route.ts
```

---

## 4. FILES TO MODIFY (NOT Archive - Just Edit)

### Navigation Component - Remove Resources Link
```
File: /Users/federicodeponte/bulk-gpt-mvp-code/components/layout/nav.tsx

Changes:
- Line 102-103: Remove resources prefetch from handleNavHover
- Line 113: Remove { href: '/resources', label: 'RESOURCES' } from navLinks array
```

### Profile Page - Remove API Keys Tab
```
File: /Users/federicodeponte/bulk-gpt-mvp-code/app/(authenticated)/profile/page.tsx

Changes:
- Line 16: Remove import of ApiKeyList
- Lines 199-210: Remove apiKeysContent variable
- Lines 277-280: Remove API Keys tab from tabs array
```

### Home/Dashboard Page - Remove Analytics Tab
```
File: /Users/federicodeponte/bulk-gpt-mvp-code/app/(authenticated)/home/page.tsx

Changes:
- Line 22-32: Remove AnalyticsDashboard dynamic import
- Lines 473-475: Remove analyticsContent variable
- Lines 845-852: Remove Analytics tab from tabs array
```

---

## 5. DIRECTORY STRUCTURE ALREADY EXISTS

These directories should be moved to archive:
```
/Users/federicodeponte/bulk-gpt-mvp-code/components/resources/     (9 files)
/Users/federicodeponte/bulk-gpt-mvp-code/components/api-keys/      (2 files)
/Users/federicodeponte/bulk-gpt-mvp-code/app/api/resources/        (4 files in subdirs)
```

---

## 6. SEARCH PATTERNS FOR FINDING ALL REFERENCES

Use these search patterns to find all references to archive:

### Resources References
```
grep -r "ResourcesList" --include="*.tsx" --include="*.ts"
grep -r "ResourceCard" --include="*.tsx" --include="*.ts"
grep -r "CreateResourceModal" --include="*.tsx" --include="*.ts"
grep -r "'/resources'" --include="*.tsx" --include="*.ts"
grep -r "\"/resources\"" --include="*.tsx" --include="*.ts"
grep -r "api/resources" --include="*.tsx" --include="*.ts"
```

### API Keys References
```
grep -r "ApiKeyList" --include="*.tsx" --include="*.ts"
grep -r "CreateApiKeyModal" --include="*.tsx" --include="*.ts"
grep -r "useApiKeys" --include="*.tsx" --include="*.ts"
grep -r "api-keys" --include="*.tsx" --include="*.ts"
```

### Analytics References
```
grep -r "AnalyticsDashboard" --include="*.tsx" --include="*.ts"
grep -r "useDashboardPreferences" --include="*.tsx" --include="*.ts"
grep -r "useSavedFilters" --include="*.tsx" --include="*.ts"
grep -r "cost-calculator" --include="*.tsx" --include="*.ts"
grep -r "chart-export" --include="*.tsx" --include="*.ts"
```

---

## 7. EXECUTION STEPS TO ARCHIVE

### Step 1: Create Archive Directory
```bash
mkdir -p /Users/federicodeponte/bulk-gpt-mvp-code/archive/components/resources
mkdir -p /Users/federicodeponte/bulk-gpt-mvp-code/archive/components/api-keys
mkdir -p /Users/federicodeponte/bulk-gpt-mvp-code/archive/components/dashboard
mkdir -p /Users/federicodeponte/bulk-gpt-mvp-code/archive/components/charts
mkdir -p /Users/federicodeponte/bulk-gpt-mvp-code/archive/api/resources
mkdir -p /Users/federicodeponte/bulk-gpt-mvp-code/archive/api/dashboard
mkdir -p /Users/federicodeponte/bulk-gpt-mvp-code/archive/hooks
mkdir -p /Users/federicodeponte/bulk-gpt-mvp-code/archive/lib/utils
mkdir -p /Users/federicodeponte/bulk-gpt-mvp-code/archive/pages
```

### Step 2: Move Component Files
```bash
# Resources components
mv /Users/federicodeponte/bulk-gpt-mvp-code/components/resources/* \
   /Users/federicodeponte/bulk-gpt-mvp-code/archive/components/resources/

# API Keys components
mv /Users/federicodeponte/bulk-gpt-mvp-code/components/api-keys/* \
   /Users/federicodeponte/bulk-gpt-mvp-code/archive/components/api-keys/

# Analytics components (selective)
mv /Users/federicodeponte/bulk-gpt-mvp-code/components/dashboard/AnalyticsDashboard.tsx \
   /Users/federicodeponte/bulk-gpt-mvp-code/archive/components/dashboard/
```

### Step 3: Move API Routes
```bash
# Resources API routes
mv /Users/federicodeponte/bulk-gpt-mvp-code/app/api/resources/* \
   /Users/federicodeponte/bulk-gpt-mvp-code/archive/api/resources/

# Dashboard stats API (analytics specific)
mv /Users/federicodeponte/bulk-gpt-mvp-code/app/api/dashboard/stats/route.ts \
   /Users/federicodeponte/bulk-gpt-mvp-code/archive/api/dashboard/
```

### Step 4: Move Hooks
```bash
mv /Users/federicodeponte/bulk-gpt-mvp-code/hooks/useApiKeys.ts \
   /Users/federicodeponte/bulk-gpt-mvp-code/archive/hooks/
```

### Step 5: Move Page
```bash
mkdir -p /Users/federicodeponte/bulk-gpt-mvp-code/archive/pages/authenticated/resources
mv /Users/federicodeponte/bulk-gpt-mvp-code/app/'(authenticated)'/resources/page.tsx \
   /Users/federicodeponte/bulk-gpt-mvp-code/archive/pages/authenticated/resources/
```

### Step 6: Edit Navigation Files
- Edit nav.tsx to remove Resources link and prefetch
- Edit profile/page.tsx to remove API Keys tab
- Edit home/page.tsx to remove Analytics tab (keep Executions)

---

## 8. Verification Steps

After archiving, run these checks:

```bash
# Verify Resources components are archived
test -f /Users/federicodeponte/bulk-gpt-mvp-code/components/resources/ResourcesList.tsx && echo "MISSING: Should be archived" || echo "OK: Archived"

# Verify API Keys are archived
test -f /Users/federicodeponte/bulk-gpt-mvp-code/components/api-keys/ApiKeyList.tsx && echo "MISSING: Should be archived" || echo "OK: Archived"

# Verify no broken imports
grep -r "from.*resources" /Users/federicodeponte/bulk-gpt-mvp-code/app --include="*.tsx" --include="*.ts" | grep -v archive

grep -r "from.*api-keys" /Users/federicodeponte/bulk-gpt-mvp-code/app --include="*.tsx" --include="*.ts" | grep -v archive

# Verify navigation files were edited
grep -n "RESOURCES" /Users/federicodeponte/bulk-gpt-mvp-code/components/layout/nav.tsx || echo "OK: Resources removed from nav"

# Verify Profile no longer has API Keys tab
grep -n "api-keys" /Users/federicodeponte/bulk-gpt-mvp-code/app/'(authenticated)'/profile/page.tsx || echo "OK: API Keys removed from profile"

# Verify Home still has Executions
grep -n "executions" /Users/federicodeponte/bulk-gpt-mvp-code/app/'(authenticated)'/home/page.tsx || echo "WARNING: Executions may have been removed"
```

