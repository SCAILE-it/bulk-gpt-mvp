# Quick Reference Guide

## Component Usage

### Skeleton Loaders
```tsx
import { AutoSkeleton } from '@/components/ui/auto-skeleton'

<AutoSkeleton isLoading={isLoading}>
  <YourComponent />
</AutoSkeleton>
```

### Empty States
```tsx
import { EmptyState } from '@/components/ui/empty-state'

<EmptyState
  icon={Icon}
  title="No items"
  description="Get started by creating your first item"
  action={{
    label: 'Create Item',
    onClick: () => router.push('/create')
  }}
/>
```

### Error Boundaries
```tsx
import { DataErrorBoundary } from '@/components/ErrorBoundary'

<DataErrorBoundary errorMessage="Failed to load data">
  <YourComponent />
</DataErrorBoundary>
```

### Form Fields with Validation
```tsx
import { FormField } from '@/components/ui/form-field'
import { useRealtimeValidation } from '@/hooks/useRealtimeValidation'

const { value, errors, setValue, setTouched } = useRealtimeValidation({
  rules: { required: true, minLength: 3 }
})

<FormField
  label="Email"
  error={errors[0]}
  required
>
  <Input
    value={value}
    onChange={(e) => setValue(e.target.value)}
    onBlur={() => setTouched(true)}
    aria-invalid={errors.length > 0}
  />
</FormField>
```

### Disabled Button Tooltips
```tsx
import { DisabledButtonTooltip } from '@/components/ui/disabled-button-tooltip'

<DisabledButtonTooltip disabledReason="Please fill in all required fields">
  <Button disabled={!isValid}>Submit</Button>
</DisabledButtonTooltip>
```

### Success States
```tsx
import { SuccessState } from '@/components/ui/success-state'

<SuccessState
  icon={CheckCircle}
  title="Success!"
  description="Your changes have been saved"
  autoDismiss={3000}
/>
```

### Toast Notifications
```tsx
import { showSuccessToast, showErrorToast, showCelebrationToast } from '@/lib/toast-helpers'

showSuccessToast('Operation completed successfully')
showErrorToast('Something went wrong')
showCelebrationToast('Batch completed! 🎉')
```

### Mobile Detection
```tsx
import { useMobile } from '@/hooks/useMobile'

const { isMobile } = useMobile()

<div className={isMobile ? 'p-4' : 'p-6'}>
  Content
</div>
```

### Focus Management
```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap'

const ref = useRef<HTMLDivElement>(null)
useFocusTrap({
  ref,
  enabled: isOpen,
  onEscape: handleClose,
  returnFocus: true
})
```

### Screen Reader Announcements
```tsx
import { announce } from '@/lib/announcements'

announce('Data loaded successfully')
announceUrgent('Error occurred')
```

---

## Design Tokens

### Spacing
```tsx
// Padding
className="p-4 sm:p-6"  // Responsive padding

// Gap
className="gap-4"  // 16px gap

// Space Y
className="space-y-4 sm:space-y-6"  // Responsive vertical spacing
```

### Border Radius
```tsx
className="rounded-md"  // Default (6px)
className="rounded-lg"  // Large (8px)
className="rounded-xl"  // Extra large (12px)
```

### Typography
```tsx
className="text-xs"   // 12px - Labels
className="text-sm"   // 14px - Secondary text
className="text-base" // 16px - Body (default)
className="text-lg"   // 18px - Subheadings
className="text-xl"   // 20px - Section headings
className="text-2xl"  // 24px - Page titles
```

### Colors
```tsx
// Background
className="bg-background"      // Main background
className="bg-secondary"       // Secondary background
className="bg-card"            // Card background

// Text
className="text-foreground"           // Primary text
className="text-muted-foreground"    // Secondary text
className="text-accent-foreground"   // Accent text

// Border
className="border-border"  // Default border
```

---

## Accessibility Checklist

- ✅ All interactive elements have `aria-label` or visible text
- ✅ All form inputs have associated labels
- ✅ Error messages use `aria-describedby`
- ✅ Focus indicators visible (WCAG AA)
- ✅ Skip links for main content
- ✅ Keyboard navigation supported
- ✅ Screen reader announcements for dynamic content

---

## Performance Best Practices

### Code Splitting
```tsx
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
})
```

### Lazy Loading Charts
```tsx
import { LazyLineChart, LazyLine } from '@/components/charts/LazyChartComponents'

<LazyLineChart data={data}>
  <LazyLine dataKey="value" />
</LazyLineChart>
```

### Animation Performance
- Use `transform` and `opacity` (GPU-accelerated)
- Avoid animating `width`, `height`, `top`, `left`
- Use `will-change` sparingly

---

## Common Patterns

### Responsive Container
```tsx
<div className="container mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
  Content
</div>
```

### Card Component
```tsx
<div className="bg-secondary/40 border border-border rounded-md p-4 sm:p-6">
  Content
</div>
```

### Button with Touch Target
```tsx
<Button className="min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px]">
  Click
</Button>
```

### Table with Mobile Scroll
```tsx
<div className="overflow-x-auto -mx-4 sm:mx-0 touch-pan-x">
  <table className="min-w-[600px] sm:min-w-0">
    {/* Table content */}
  </table>
</div>
```

---

## File Locations

### Components
- UI Components: `components/ui/`
- Page Components: `components/[page-name]/`
- Layout: `components/layout/`

### Hooks
- Custom Hooks: `hooks/`

### Utilities
- Helpers: `lib/`
- Types: `lib/types/`

### Styles
- Global Styles: `app/globals.css`
- Design Tokens: `lib/design-tokens.ts`

---

## Quick Links

- [Full Documentation](./UX_UI_IMPROVEMENTS_COMPLETE.md)
- [Changelog](./CHANGELOG_UX_UI.md)
- [Design System Guide](./DESIGN_SYSTEM_CONSISTENCY.md)
- [Performance Guide](./PERFORMANCE_OPTIMIZATIONS.md)
