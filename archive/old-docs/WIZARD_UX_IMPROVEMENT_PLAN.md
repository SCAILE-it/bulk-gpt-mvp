# 🎯 Wizard UX Improvement Plan

**Status**: Ready for Implementation
**Timeline**: 4 phases, ~4-6 weeks
**Approach**: Iterative, Test-Driven, DRY, SOLID, KISS, Minimal Code Changes

---

## 🎨 Philosophy: Maximum Impact, Minimum Code

### Core Principles
1. **Reuse existing components** - Leverage shadcn/ui primitives already in codebase
2. **Extract utilities** - DRY approach for common patterns
3. **Test first** - TDD for each iteration
4. **Ship incrementally** - Each phase is deployable
5. **Measure impact** - User testing after each phase

---

## 📊 Success Metrics

**Before**: 6/10 SaaS quality
**Target**: 9/10 SaaS quality
**Critical Metrics**:
- Zero "what went wrong?" user questions
- 95%+ task completion rate
- < 5% error rate
- Positive feedback on design

---

## 🚀 Phase 1: Critical Fixes (Week 1-2)

**Goal**: Fix the 4 critical issues that make users confused
**Impact**: 6/10 → 7.5/10
**Lines of Code**: ~300-400 (mostly in existing files)

### 1.1 Show Real Input Data in Results Table

**Problem**: Results show `{}` instead of actual input values
**Solution**: Parse and display meaningful input data

**Files to Modify**:
- `components/wizard/StepResults.tsx` (50-75 lines modified)

**Approach**:
```typescript
// BEFORE (current)
<td className="px-4 py-2">
  {JSON.stringify(row.input_data)}
</td>

// AFTER (new utility)
// 1. Create utility: lib/utils/display-input-data.ts (~30 lines)
export function formatInputData(inputData: Record<string, any>): {
  primary: string;
  secondary: string;
  details: Array<{ key: string; value: string }>;
}

// 2. Use in StepResults.tsx (~20 lines)
<td className="px-4 py-2">
  <div className="space-y-1">
    <p className="font-medium text-sm">{formatted.primary}</p>
    <p className="text-xs text-gray-600">{formatted.secondary}</p>
    <details className="text-xs">
      <summary className="cursor-pointer">View all</summary>
      {formatted.details.map(d => <div>{d.key}: {d.value}</div>)}
    </details>
  </div>
</td>
```

**Tests**:
```bash
# Unit test: lib/utils/__tests__/display-input-data.test.ts (~50 lines)
- formatInputData with simple object
- formatInputData with nested object
- formatInputData with missing keys
- formatInputData with empty object
```

**Code Impact**:
- New: 1 utility file (~30 lines)
- Modified: StepResults.tsx (~20 lines changed)
- Tests: 1 test file (~50 lines)
- **Total**: ~100 lines

---

### 1.2 Add Inline Validation with Helpful Errors

**Problem**: Validation errors shown only at top of page (easy to miss)
**Solution**: Inline validation as user types

**Files to Modify**:
- `components/wizard/StepConfigure.tsx` (75-100 lines modified)

**Approach**:
```typescript
// 1. Create validation hook: hooks/usePromptValidation.ts (~80 lines)
export function usePromptValidation(prompt: string, columns: string[]) {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    const debounced = debounce(() => {
      const errs = validatePrompt(prompt, columns);
      setErrors(errs);
    }, 300);
    debounced();
  }, [prompt, columns]);

  return { errors, hasErrors: errors.length > 0 };
}

// 2. Use in StepConfigure.tsx (~40 lines)
const { errors, hasErrors } = usePromptValidation(prompt, columns);

<Textarea
  value={prompt}
  onChange={(e) => setPrompt(e.target.value)}
  className={hasErrors ? 'border-red-500 focus:ring-red-500' : ''}
/>
{errors.map(error => (
  <ValidationError key={error.type} error={error} />
))}
```

**Reuse Existing**:
- `components/ui/alert.tsx` (already exists)
- Use `AlertCircle` icon from lucide-react

**Tests**:
```bash
# Unit test: hooks/__tests__/usePromptValidation.test.ts (~80 lines)
- Validates missing variables
- Validates invalid variables
- Validates empty prompt
- Debounces validation calls
- Returns correct error types
```

**Code Impact**:
- New: 1 hook file (~80 lines)
- New: 1 component `ValidationError.tsx` (~40 lines, reuses Alert)
- Modified: StepConfigure.tsx (~40 lines changed)
- Tests: 1 test file (~80 lines)
- **Total**: ~240 lines

---

### 1.3 Better Error Messages with Recovery Options

**Problem**: Generic "failed to generate" with no guidance
**Solution**: Explain WHY failed and HOW to fix

**Files to Modify**:
- `components/wizard/StepResults.tsx` (50-75 lines modified)

**Approach**:
```typescript
// 1. Create error helper: lib/utils/error-messages.ts (~60 lines)
export function getErrorExplanation(error: string): {
  message: string;
  reason: string;
  fix: string;
  canRetry: boolean;
}

// Example mapping
const errorMap = {
  'timeout': {
    message: 'Generation timed out',
    reason: 'AI model took longer than 30 seconds',
    fix: 'Try a simpler prompt or reduce context',
    canRetry: true
  },
  // ... more error types
};

// 2. Use in StepResults.tsx (~30 lines)
<td className="px-4 py-2">
  {row.status === 'error' ? (
    <ErrorExplanation
      error={row.error}
      onRetry={() => handleRetry(row.id)}
    />
  ) : (
    <div>{row.output_data}</div>
  )}
</td>
```

**Reuse Existing**:
- `components/ui/button.tsx` (for retry button)
- `components/ui/alert.tsx` (for error display)

**Tests**:
```bash
# Unit test: lib/utils/__tests__/error-messages.test.ts (~60 lines)
- Maps known errors correctly
- Handles unknown errors gracefully
- Returns correct retry flag
- Formats user-friendly messages
```

**Code Impact**:
- New: 1 utility file (~60 lines)
- New: 1 component `ErrorExplanation.tsx` (~50 lines, reuses Alert + Button)
- Modified: StepResults.tsx (~30 lines changed)
- Tests: 1 test file (~60 lines)
- **Total**: ~200 lines

---

### 1.4 Add Visual Hierarchy with Cards

**Problem**: Everything blends together, no clear focus
**Solution**: Use Card components with proper elevation

**Files to Modify**:
- `components/wizard/StepUpload.tsx` (30-40 lines modified)
- `components/wizard/StepConfigure.tsx` (40-50 lines modified)
- `components/wizard/StepResults.tsx` (30-40 lines modified)

**Approach**:
```typescript
// NO NEW CODE - just wrap existing content in Card components

// BEFORE
<div className="space-y-4">
  <h2>Upload CSV</h2>
  <div>Dropzone...</div>
</div>

// AFTER (reuse existing Card)
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Upload CSV</CardTitle>
  </CardHeader>
  <CardContent>
    <div>Dropzone...</div>
  </CardContent>
</Card>
```

**Reuse Existing**:
- `components/ui/card.tsx` (already exists)
- No new components needed

**Tests**:
```bash
# E2E test: Update existing tests to check for card structure
# No new unit tests needed (using existing components)
```

**Code Impact**:
- Modified: StepUpload.tsx (~30 lines, wrapping only)
- Modified: StepConfigure.tsx (~40 lines, wrapping only)
- Modified: StepResults.tsx (~30 lines, wrapping only)
- **Total**: ~100 lines (mostly imports and wrapping)

---

**Phase 1 Summary**:
- **Total New Lines**: ~540 lines (utilities, components, tests)
- **Total Modified Lines**: ~200 lines (existing files)
- **Files Added**: 6 (3 utilities, 2 components, 3 tests)
- **Files Modified**: 3 (Step components)
- **Impact**: Critical issues fixed, 7.5/10 quality

---

## 🎨 Phase 2: High-Priority UX (Week 3-4)

**Goal**: Modern, polished interface
**Impact**: 7.5/10 → 8.5/10
**Lines of Code**: ~400-500

### 2.1 Modern File Upload with Visual States

**Problem**: Upload looks dated (2018 vibes)
**Solution**: Modern drag-drop with animations

**Files to Modify**:
- `components/wizard/StepUpload.tsx` (100-125 lines modified)

**Approach**:
```typescript
// 1. Create upload hook: hooks/useFileUpload.ts (~100 lines)
export function useFileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrop = useCallback((e: DragEvent) => {
    // ... drag-drop logic
  }, []);

  return { isDragging, isUploading, progress, handleDrop, ... };
}

// 2. Use in StepUpload.tsx (~80 lines changed)
const { isDragging, isUploading, ... } = useFileUpload();

<div className={cn(
  "border-2 rounded-lg transition-all",
  isDragging ? "border-blue-500 bg-blue-50 scale-[1.02]" : "border-dashed",
  "hover:border-gray-400 hover:bg-gray-50"
)}>
  {isUploading ? <UploadProgress /> : <UploadPrompt />}
</div>
```

**Reuse Existing**:
- `components/ui/button.tsx`
- Use `FileSpreadsheet`, `Loader2` icons from lucide-react
- Use `cn` utility from `lib/utils.ts`

**Tests**:
```bash
# Unit test: hooks/__tests__/useFileUpload.test.ts (~80 lines)
- Handles drag enter/leave
- Validates file type
- Tracks upload progress
- Handles errors
```

**Code Impact**:
- New: 1 hook file (~100 lines)
- Modified: StepUpload.tsx (~80 lines changed)
- Tests: 1 test file (~80 lines)
- **Total**: ~260 lines

---

### 2.2 Processing Mode Cards with Cost/Time

**Problem**: "Test (5 rows)" vs "Full" - which to pick?
**Solution**: Card-based selection with clear info

**Files to Modify**:
- `components/wizard/StepConfigure.tsx` (60-80 lines modified)

**Approach**:
```typescript
// 1. Create ProcessingModeCard component (~80 lines)
// components/wizard/ProcessingModeCard.tsx
interface ProcessingModeCardProps {
  mode: 'test' | 'full';
  rowCount: number;
  selected: boolean;
  onSelect: () => void;
}

export function ProcessingModeCard({ mode, rowCount, selected, onSelect }) {
  const config = mode === 'test'
    ? { rows: Math.min(5, rowCount), time: '~15s', cost: '$0.01' }
    : { rows: rowCount, time: estimateTime(rowCount), cost: estimateCost(rowCount) };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-blue-500 bg-blue-50"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <h3 className="font-semibold">{mode === 'test' ? 'Test Mode' : 'Full Processing'}</h3>
        {mode === 'test' && <Badge>Recommended</Badge>}
        <p className="text-2xl font-bold text-blue-600">{config.rows} rows</p>
        <p className="text-sm text-gray-600">{config.time} • {config.cost}</p>
      </CardContent>
    </Card>
  );
}

// 2. Use in StepConfigure.tsx (~40 lines changed)
<div className="grid grid-cols-2 gap-4">
  <ProcessingModeCard mode="test" ... />
  <ProcessingModeCard mode="full" ... />
</div>
```

**Reuse Existing**:
- `components/ui/card.tsx`
- `components/ui/badge.tsx`
- `lib/utils/cn.ts`

**Tests**:
```bash
# Unit test: components/wizard/__tests__/ProcessingModeCard.test.ts (~60 lines)
- Renders test mode correctly
- Renders full mode correctly
- Handles selection
- Shows correct estimates
```

**Code Impact**:
- New: 1 component file (~80 lines)
- New: 1 utility `estimateTime/Cost` (~30 lines)
- Modified: StepConfigure.tsx (~40 lines changed)
- Tests: 1 test file (~60 lines)
- **Total**: ~210 lines

---

### 2.3 Contextual Help & Onboarding

**Problem**: First-time users have no guidance
**Solution**: Progressive disclosure with hints

**Files to Modify**:
- `components/wizard/StepConfigure.tsx` (40-50 lines modified)

**Approach**:
```typescript
// 1. Create HelpTip component (~40 lines)
// components/wizard/HelpTip.tsx
export function HelpTip({ title, children }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex gap-3">
        <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <div>
          <p className="font-medium text-blue-900">{title}</p>
          <div className="text-sm text-blue-700 mt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

// 2. Use in StepConfigure.tsx (~30 lines added)
<HelpTip title="Pro tip: Use variables in your prompt">
  Reference CSV columns with {{`{{column_name}}`}}.
  Example: "Write a bio for {{`{{name}}`}} at {{`{{company}}`}}"
</HelpTip>
```

**Reuse Existing**:
- Use `Lightbulb` icon from lucide-react
- Tailwind classes (no new styles)

**Tests**:
```bash
# Unit test: components/wizard/__tests__/HelpTip.test.ts (~40 lines)
- Renders title and children
- Has correct styling
- Icon displays
```

**Code Impact**:
- New: 1 component file (~40 lines)
- Modified: StepConfigure.tsx (~30 lines added)
- Modified: StepUpload.tsx (~20 lines added)
- Tests: 1 test file (~40 lines)
- **Total**: ~130 lines

---

**Phase 2 Summary**:
- **Total New Lines**: ~540 lines
- **Total Modified Lines**: ~230 lines
- **Files Added**: 5 (2 components, 2 hooks, 3 tests)
- **Files Modified**: 3 (Step components)
- **Impact**: Modern UX, 8.5/10 quality

---

## 🎉 Phase 3: Success States & Animations (Week 5)

**Goal**: Delightful, celebratory experience
**Impact**: 8.5/10 → 9/10
**Lines of Code**: ~200-300

### 3.1 Success Celebration State

**Problem**: Success feels invisible
**Solution**: Celebratory completion message

**Files to Modify**:
- `components/wizard/StepResults.tsx` (40-50 lines modified)

**Approach**:
```typescript
// 1. Create SuccessBanner component (~60 lines)
// components/wizard/SuccessBanner.tsx
export function SuccessBanner({ rowsCompleted }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-50 border border-green-200 rounded-lg p-6"
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-green-900">
            All {rowsCompleted} rows processed successfully!
          </h3>
          <p className="text-sm text-green-700">Your results are ready to export</p>
        </div>
      </div>
    </motion.div>
  );
}

// 2. Use in StepResults.tsx (~20 lines added)
{successRate === 100 && rowsCompleted > 0 && (
  <SuccessBanner rowsCompleted={rowsCompleted} />
)}
```

**Dependencies**:
- Add `framer-motion` (~500KB, standard for React animations)
- Use `Check` icon from lucide-react

**Tests**:
```bash
# Unit test: components/wizard/__tests__/SuccessBanner.test.ts (~40 lines)
- Renders with correct count
- Has success styling
- Animates on mount
```

**Code Impact**:
- New: 1 component file (~60 lines)
- Modified: StepResults.tsx (~20 lines added)
- Tests: 1 test file (~40 lines)
- **Total**: ~120 lines

---

### 3.2 Smooth Transitions & Micro-interactions

**Problem**: Instant transitions feel jarring
**Solution**: Smooth animations throughout

**Files to Modify**:
- `components/wizard/StepUpload.tsx` (20-30 lines modified)
- `components/wizard/StepConfigure.tsx` (20-30 lines modified)
- `components/wizard/WizardNav.tsx` (30-40 lines modified)

**Approach**:
```typescript
// Use framer-motion for transitions (already added in 3.1)

// StepUpload.tsx - Fade in preview
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  {/* Preview content */}
</motion.div>

// StepConfigure.tsx - Slide in advanced options
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: 'auto', opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
>
  {/* Advanced options */}
</motion.div>

// WizardNav.tsx - Scale on hover
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  {/* Step button */}
</motion.div>
```

**Reuse Existing**:
- `framer-motion` (added in 3.1)
- No new components

**Tests**:
```bash
# E2E test: Update existing tests
# Check animations don't break functionality
```

**Code Impact**:
- Modified: StepUpload.tsx (~25 lines, wrapping in motion)
- Modified: StepConfigure.tsx (~25 lines, wrapping in motion)
- Modified: WizardNav.tsx (~35 lines, wrapping in motion)
- **Total**: ~85 lines (minimal changes)

---

### 3.3 Loading States & Progress Indicators

**Problem**: No feedback during processing
**Solution**: Clear loading states throughout

**Files to Modify**:
- `components/wizard/StepResults.tsx` (50-60 lines modified)

**Approach**:
```typescript
// 1. Create ProcessingState component (~80 lines)
// components/wizard/ProcessingState.tsx
export function ProcessingState({ progress, phase, estimatedTime }) {
  const phases = [
    { label: 'Defining output structure', status: 'complete' },
    { label: 'Processing rows', status: 'active' },
    { label: 'Generating results', status: 'pending' }
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <div>
            <p className="font-medium">Processing your data...</p>
            <p className="text-sm text-gray-600">
              {progress.current} of {progress.total} rows ({progress.percent}%)
            </p>
          </div>
        </div>

        <Progress value={progress.percent} className="mb-4" />

        <div className="space-y-2">
          {phases.map(phase => (
            <PhaseIndicator key={phase.label} {...phase} />
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Estimated time remaining: {estimatedTime}
        </p>
      </CardContent>
    </Card>
  );
}

// 2. Use in StepResults.tsx (~30 lines changed)
{isProcessing ? (
  <ProcessingState progress={progress} ... />
) : (
  <ResultsTable results={results} />
)}
```

**Reuse Existing**:
- `components/ui/progress.tsx` (likely already exists, if not ~30 lines)
- `components/ui/card.tsx`
- `Loader2` icon from lucide-react

**Tests**:
```bash
# Unit test: components/wizard/__tests__/ProcessingState.test.ts (~60 lines)
- Renders progress correctly
- Shows phase indicators
- Updates on progress change
- Estimates time correctly
```

**Code Impact**:
- New: 1 component file (~80 lines)
- New: 1 sub-component `PhaseIndicator` (~40 lines)
- Modified: StepResults.tsx (~30 lines changed)
- Tests: 1 test file (~60 lines)
- **Total**: ~210 lines

---

**Phase 3 Summary**:
- **Total New Lines**: ~340 lines
- **Total Modified Lines**: ~150 lines
- **Files Added**: 5 (3 components, 2 tests)
- **Files Modified**: 4 (Step components + Nav)
- **Dependencies Added**: framer-motion (~500KB)
- **Impact**: Delightful UX, 9/10 quality

---

## ✨ Phase 4: Polish & Accessibility (Week 6)

**Goal**: Perfect accessibility and mobile experience
**Impact**: 9/10 → 9.5/10 (110% quality)
**Lines of Code**: ~150-200

### 4.1 Keyboard Shortcuts

**Problem**: Power users want keyboard navigation
**Solution**: Common shortcuts (Cmd+Enter, Escape, etc.)

**Files to Modify**:
- `components/wizard/StepConfigure.tsx` (30-40 lines modified)

**Approach**:
```typescript
// 1. Create keyboard hook: hooks/useKeyboardShortcuts.ts (~60 lines)
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = `${e.metaKey ? 'cmd+' : ''}${e.ctrlKey ? 'ctrl+' : ''}${e.key}`;
      const action = shortcuts[key];
      if (action) {
        e.preventDefault();
        action();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

// 2. Use in StepConfigure.tsx (~20 lines added)
useKeyboardShortcuts({
  'cmd+Enter': handleSubmit,
  'ctrl+Enter': handleSubmit,
  'Escape': handleBack,
});
```

**Reuse Existing**:
- Pure React hooks
- No dependencies

**Tests**:
```bash
# Unit test: hooks/__tests__/useKeyboardShortcuts.test.ts (~50 lines)
- Handles cmd+Enter
- Handles ctrl+Enter
- Handles Escape
- Prevents default behavior
```

**Code Impact**:
- New: 1 hook file (~60 lines)
- Modified: StepConfigure.tsx (~20 lines added)
- Tests: 1 test file (~50 lines)
- **Total**: ~130 lines

---

### 4.2 ARIA Labels & Screen Reader Support

**Problem**: Not accessible to screen reader users
**Solution**: Proper ARIA labels throughout

**Files to Modify**:
- All 3 step components (10-15 lines each)

**Approach**:
```typescript
// Add ARIA labels to interactive elements

// BEFORE
<button onClick={handleNext}>Continue</button>

// AFTER
<button
  onClick={handleNext}
  aria-label="Continue to configure prompt"
>
  Continue
</button>

// Add live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {error && <p role="alert">{error}</p>}
</div>

// Add progress announcements
<div aria-live="polite" aria-atomic="true" className="sr-only">
  Processing {progress.current} of {progress.total} rows
</div>
```

**Reuse Existing**:
- HTML5 semantic elements
- ARIA attributes (no dependencies)

**Tests**:
```bash
# E2E test with accessibility testing
# Use @axe-core/playwright for automated a11y checks
npx playwright test --project=chromium --grep a11y
```

**Code Impact**:
- Modified: StepUpload.tsx (~12 lines, add ARIA)
- Modified: StepConfigure.tsx (~15 lines, add ARIA)
- Modified: StepResults.tsx (~15 lines, add ARIA)
- Modified: WizardNav.tsx (~10 lines, add ARIA)
- **Total**: ~52 lines (minimal, mostly attributes)

---

### 4.3 Mobile Responsive Refinements

**Problem**: Some layouts break on mobile
**Solution**: Responsive refinements

**Files to Modify**:
- `components/wizard/StepResults.tsx` (20-30 lines modified)

**Approach**:
```typescript
// Make results table responsive

// BEFORE
<table className="w-full">
  <thead>...</thead>
  <tbody>...</tbody>
</table>

// AFTER
<div className="overflow-x-auto">
  <table className="w-full min-w-[600px]">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>

// Add mobile-specific card view (optional)
<div className="block md:hidden">
  {results.map(row => (
    <ResultCard key={row.id} {...row} />
  ))}
</div>
<div className="hidden md:block">
  <ResultsTable results={results} />
</div>
```

**Reuse Existing**:
- Tailwind responsive classes
- No dependencies

**Tests**:
```bash
# E2E test: Test on mobile viewport
npx playwright test --project=mobile
```

**Code Impact**:
- Modified: StepResults.tsx (~25 lines, responsive wrappers)
- Modified: StepConfigure.tsx (~15 lines, grid adjustments)
- **Total**: ~40 lines

---

**Phase 4 Summary**:
- **Total New Lines**: ~110 lines
- **Total Modified Lines**: ~112 lines
- **Files Added**: 2 (1 hook, 1 test)
- **Files Modified**: 5 (All step components + Nav)
- **Impact**: Accessible, mobile-perfect, 9.5/10 quality

---

## 📊 Total Code Impact Summary

### Overall Statistics

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 | **Total** |
|--------|---------|---------|---------|---------|-----------|
| New Lines | 540 | 540 | 340 | 110 | **1,530** |
| Modified Lines | 200 | 230 | 150 | 112 | **692** |
| Files Added | 6 | 5 | 5 | 2 | **18** |
| Files Modified | 3 | 3 | 4 | 5 | **15** |

### File Breakdown

**New Files (18)**:
- Utilities: 4 files (~180 lines)
- Components: 8 files (~550 lines)
- Hooks: 3 files (~240 lines)
- Tests: 11 files (~560 lines)

**Modified Files (15)**:
- StepUpload.tsx: ~140 lines changed
- StepConfigure.tsx: ~220 lines changed
- StepResults.tsx: ~200 lines changed
- WizardNav.tsx: ~75 lines changed
- Minor: ~57 lines across other files

### Dependencies Added

- `framer-motion` (Phase 3) - ~500KB gzipped
- `@axe-core/playwright` (Phase 4, dev) - Testing only

**Total Production Dependencies**: 1 (framer-motion, industry standard)

---

## 🧪 Testing Strategy

### Test-Driven Approach

**For Each Feature**:
1. Write test first (TDD)
2. Implement feature
3. Ensure test passes
4. Refactor if needed

### Test Coverage Goals

- Unit tests: 85%+ coverage
- Integration tests: All user flows
- E2E tests: Critical paths
- Accessibility tests: WCAG 2.1 AA

### Testing Pyramid

```
       E2E Tests (5-10)
      ----------------
   Integration Tests (15-20)
  --------------------------
 Unit Tests (30-40 components/utils)
----------------------------------
```

---

## 🚀 Implementation Workflow

### Per-Phase Workflow

```bash
# 1. Create feature branch
git checkout -b wizard-ux-phase-1

# 2. For each feature in phase:
#    a. Write test
touch lib/utils/__tests__/display-input-data.test.ts
npm run test lib/utils/__tests__/display-input-data.test.ts -- --watch

#    b. Implement feature
touch lib/utils/display-input-data.ts
# Write implementation

#    c. Ensure tests pass
npm run test

#    d. Update component to use feature
vim components/wizard/StepResults.tsx

#    e. Manual test in browser
npm run dev
# Test at http://localhost:3000/wizard

# 3. Run full test suite
npm run test:all

# 4. E2E tests
npm run test:e2e

# 5. Commit
git add .
git commit -m "feat(wizard): Phase 1 - Critical fixes

- Show real input data in results table
- Add inline validation with helpful errors
- Better error messages with recovery options
- Add visual hierarchy with cards

Resolves #123"

# 6. Deploy to staging
git push origin wizard-ux-phase-1
# Create PR, review, merge

# 7. User testing
# Gather feedback, iterate if needed
```

### Between Phases

1. Deploy phase to staging
2. User testing (internal or beta users)
3. Gather metrics and feedback
4. Adjust next phase if needed
5. Ship to production before starting next phase

---

## 📈 Success Validation

### After Each Phase

**Automated Checks**:
```bash
# TypeScript compilation
npx tsc --noEmit

# Linting
npm run lint

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Build
npm run build

# Bundle size check
npm run analyze
```

**Manual Checks**:
- [ ] Test all user flows manually
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile (iOS, Android)
- [ ] Test with keyboard only
- [ ] Test with screen reader (VoiceOver, NVDA)

**User Validation**:
- [ ] 3-5 internal users complete full flow
- [ ] Collect feedback via form
- [ ] Track completion rate
- [ ] Track time to complete
- [ ] Track error rate

### Rollback Plan

```bash
# If critical issues found
git revert [commit-hash]
git push origin main

# Or feature flag
NEXT_PUBLIC_FEATURE_NEW_WIZARD_UX=false
```

---

## 🎯 Iterative Refinement

### After Phase 1

**Metrics to Check**:
- Can users see what input data failed? (Yes/No)
- Do users understand validation errors? (Confusion rate)
- Do users retry failed rows? (Retry rate)
- Do users comment on improved design? (Qualitative)

**Adjust Phase 2 Based On**:
- If validation errors still confusing → Add more examples
- If users still miss errors → Make them more prominent
- If users don't retry → Improve retry UX

### After Phase 2

**Metrics to Check**:
- Upload success rate
- Time to upload
- Test vs Full mode selection (which chosen more?)
- Help tip engagement (expand rate)

**Adjust Phase 3 Based On**:
- If users confused by mode selection → Adjust copy
- If help tips ignored → Try different placement
- If upload feels slow → Optimize

### After Phase 3

**Metrics to Check**:
- User delight (qualitative feedback)
- Completion celebrations noticed? (survey)
- Animation performance (FPS, jank)

**Adjust Phase 4 Based On**:
- If animations distracting → Reduce
- If success state missed → Make more prominent
- If loading states unclear → Add more detail

---

## 🔄 DRY, SOLID, KISS Compliance

### DRY (Don't Repeat Yourself)

**Approach**:
- ✅ Extract common validation logic → `usePromptValidation` hook
- ✅ Extract error formatting → `error-messages.ts` utility
- ✅ Extract input display → `display-input-data.ts` utility
- ✅ Reuse existing UI components (Card, Alert, Button)
- ✅ Single source of truth for processing logic

### SOLID Principles

**Single Responsibility**:
- ✅ Each component does ONE thing (ProcessingModeCard = show mode)
- ✅ Each hook does ONE thing (useFileUpload = handle file uploads)
- ✅ Each utility does ONE thing (formatInputData = format data)

**Open/Closed**:
- ✅ Components accept props for extension
- ✅ Utilities work with generic types
- ✅ Easy to add new error types without changing base code

**Liskov Substitution**:
- ✅ All card components interchangeable
- ✅ All validation hooks follow same interface

**Interface Segregation**:
- ✅ Small, focused prop interfaces
- ✅ No component forced to accept unused props

**Dependency Inversion**:
- ✅ Components depend on props/hooks, not implementations
- ✅ Hooks depend on interfaces, not concrete types

### KISS (Keep It Simple, Stupid)

**Approach**:
- ✅ Reuse existing components (shadcn/ui)
- ✅ No complex state machines (simple useState)
- ✅ No new routing (use existing)
- ✅ No new API endpoints (use existing)
- ✅ Minimal dependencies (only framer-motion)
- ✅ Tailwind classes (no custom CSS)
- ✅ Standard patterns (hooks, components)

---

## 💰 Cost-Benefit Analysis

### Time Investment

| Phase | Dev Time | Testing Time | Total |
|-------|----------|--------------|-------|
| Phase 1 | 3-4 days | 1-2 days | 1 week |
| Phase 2 | 4-5 days | 1-2 days | 1.5 weeks |
| Phase 3 | 2-3 days | 1 day | 1 week |
| Phase 4 | 2-3 days | 1 day | 1 week |
| **Total** | **11-15 days** | **4-6 days** | **4-6 weeks** |

### Expected Impact

**Quantitative**:
- Task completion rate: 60% → 95% (+58%)
- Error rate: 20% → 5% (-75%)
- Time to complete: 5 min → 2 min (-60%)
- Support tickets: 10/week → 2/week (-80%)

**Qualitative**:
- User satisfaction: "Confusing" → "Easy and delightful"
- Professional appearance: 6/10 → 9.5/10
- Competitive positioning: Internal tool → SaaS product
- Team confidence: Hesitant to demo → Proud to demo

### ROI Calculation

**Investment**: 4-6 weeks dev time
**Return**:
- Reduced support: ~8 hours/week saved
- Increased conversions: +35% completion rate
- Improved reputation: Positive word-of-mouth
- Team morale: Proud of product

**Break-even**: ~2-3 months (via reduced support + increased usage)

---

## 🎯 Final Checklist

### Before Starting

- [ ] Review this plan with team
- [ ] Set up staging environment
- [ ] Set up user testing group (5-10 people)
- [ ] Set up analytics tracking
- [ ] Create feature flag for gradual rollout
- [ ] Document baseline metrics

### During Implementation

- [ ] Follow TDD approach (tests first)
- [ ] Commit after each feature (small commits)
- [ ] Deploy to staging after each phase
- [ ] Gather user feedback between phases
- [ ] Track metrics continuously
- [ ] Document any deviations from plan

### After Completion

- [ ] Full E2E test suite passing
- [ ] Accessibility audit passing (WCAG 2.1 AA)
- [ ] Performance metrics acceptable (Core Web Vitals)
- [ ] User testing positive (>90% satisfaction)
- [ ] Documentation updated
- [ ] Team trained on new UX
- [ ] Gradual rollout plan ready (feature flag)
- [ ] Monitoring and alerting configured

---

## 🚀 Ready to Ship?

This plan is:
- ✅ **Iterative** - 4 phases, each shippable
- ✅ **Test-driven** - TDD for all features
- ✅ **DRY** - Reuse utilities, components, hooks
- ✅ **SOLID** - Single responsibility, modular
- ✅ **KISS** - Simple solutions, minimal dependencies
- ✅ **Modular** - Independent components and utilities
- ✅ **Clean** - Clear structure, consistent patterns
- ✅ **Minimal** - 1,530 new lines (for 4-6 weeks of features)

**Average**: ~255 lines per week (very lean for the value delivered)

**Next Step**: Review plan → Create Phase 1 branch → Start with test for display-input-data.ts

---

**Let's build the best wizard UX in the industry!** 🎨✨
