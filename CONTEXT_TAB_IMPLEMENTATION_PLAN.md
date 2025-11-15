# Context Tab Implementation Plan (Revised)

## Correct Architecture

### Navigation Structure
- **Context** (new `/context` page) - Manage company context variables
- **Bulk Agent** (`/bulk` page) - Process CSV files with AI
- **Executions** (`/dashboard` page) - View batch results

### User Flow
1. User goes to **Context** page → Sets up company context (tone, countries, product, etc.)
2. User goes to **Bulk Agent** page → Uploads CSV, writes prompt
3. In **Task** section (PromptSection), user sees:
   - CSV column variables: `{{name}}`, `{{email}}`, etc.
   - Context variables: `{{context.tone}}`, `{{context.targetCountries}}`, etc.
4. User can click either type to insert into prompt
5. When processing, context is included automatically

## Implementation Plan

### Phase 1: Create Context Page

**File**: `app/(authenticated)/context/page.tsx`

**Features**:
- Form to manage all 6 context variables
- Save to localStorage (or database)
- Similar layout to other pages
- Auto-save on change

**Context Variables**:
```typescript
interface ContextVariables {
  tone?: string
  targetCountries?: string
  productDescription?: string
  competitors?: string
  targetIndustries?: string
  complianceFlags?: string
}
```

### Phase 2: Update Navigation

**File**: `components/layout/nav.tsx`

**Changes**:
- Add "Context" link (line 54)
- Change "RUN" to "Bulk Agent"
- Keep "EXECUTIONS" as is
- Update active state logic

```typescript
const navLinks = [
  { href: '/context', label: 'Context' },
  { href: '/bulk', label: 'Bulk Agent' },
  { href: '/dashboard', label: 'Executions' },
]
```

### Phase 3: Create Context Storage Hook

**File**: `hooks/useContextStorage.ts` (new)

**Features**:
- Load/save context variables from localStorage
- Provide context to other components
- Type-safe interface

### Phase 4: Enhance PromptSection

**File**: `components/bulk/PromptSection.tsx`

**Changes**:
- Import `useContextStorage` hook
- Show context variables alongside CSV columns
- Format context variables as `{{context.variableName}}`
- Allow inserting context variables into prompt
- Visual distinction between CSV vars and context vars

**UI Changes**:
- Add section separator: "CSV Variables" | "Context Variables"
- Context variables styled differently (maybe different color)
- Both types clickable to insert

### Phase 5: Update BulkProcessor

**File**: `components/bulk/BulkProcessor.tsx`

**Changes**:
- Import `useContextStorage` hook
- Get context variables
- Format context as string for API
- Pass to `batchProcessor.startBatch()`

**Context Format for API**:
```typescript
const formatContextString = (vars: ContextVariables): string => {
  const parts: string[] = []
  if (vars.tone) parts.push(`Tone: ${vars.tone}`)
  if (vars.targetCountries) parts.push(`Target Countries: ${vars.targetCountries}`)
  // ... etc
  return parts.join('\n')
}
```

### Phase 6: Update AI Optimization

**File**: `app/api/optimize-job/route.ts`

**Changes**:
- Accept `contextVariables` parameter
- Include in optimization prompt
- AI can suggest using context variables

## Files to Create

1. `app/(authenticated)/context/page.tsx` - Context management page
2. `components/context/ContextForm.tsx` - Form component for context variables
3. `hooks/useContextStorage.ts` - Context storage hook

## Files to Modify

1. `components/layout/nav.tsx` - Add Context tab, rename RUN to Bulk Agent
2. `components/bulk/PromptSection.tsx` - Show context variables
3. `components/bulk/BulkProcessor.tsx` - Use context in processing
4. `app/api/optimize-job/route.ts` - Accept context in optimization
5. `lib/types.ts` - Export ContextVariables type

## Context Variable Naming

For prompts, context variables will be:
- `{{context.tone}}`
- `{{context.targetCountries}}`
- `{{context.productDescription}}`
- `{{context.competitors}}`
- `{{context.targetIndustries}}`
- `{{context.complianceFlags}}`

This distinguishes them from CSV columns and makes it clear they're context variables.

## Storage Strategy

- **Short-term**: localStorage (like `useJobContext`)
- **Future**: Database table for persistence across devices
- **Hook**: `useContextStorage` abstracts storage layer

## Next Steps

1. ✅ Architecture clarified
2. ⏳ Create Context page
3. ⏳ Create Context storage hook
4. ⏳ Update navigation
5. ⏳ Enhance PromptSection to show context variables
6. ⏳ Update BulkProcessor to use context
7. ⏳ Test end-to-end flow
