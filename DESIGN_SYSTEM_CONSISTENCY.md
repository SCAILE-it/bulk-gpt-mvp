# Design System Consistency Guide

## Overview
This document outlines the standardized design tokens and patterns used throughout the application to ensure visual consistency.

## Typography Scale

Use these standard text sizes:

- `text-xs` - 12px - Labels, captions, helper text
- `text-sm` - 14px - Secondary text, small buttons
- `text-base` - 16px - Body text, default size
- `text-lg` - 18px - Subheadings
- `text-xl` - 20px - Section headings
- `text-2xl` - 24px - Page titles
- `text-3xl` - 30px - Hero text

**Avoid:** Custom text sizes like `text-[13px]` or `text-[15px]`

## Spacing System (4px/8px Grid)

### Padding
- `p-1` - 4px
- `p-2` - 8px
- `p-3` - 12px
- `p-4` - 16px
- `p-5` - 20px
- `p-6` - 24px
- `p-8` - 32px

### Responsive Padding
- Use responsive padding for mobile: `p-4 sm:p-6`
- Container padding: `px-4 sm:px-6` or `px-3 sm:px-4 md:px-6`

### Gap
- `gap-1` - 4px
- `gap-2` - 8px
- `gap-3` - 12px
- `gap-4` - 16px
- `gap-6` - 24px

### Space Y (Vertical spacing between children)
- `space-y-2` - 8px
- `space-y-3` - 12px
- `space-y-4` - 16px
- `space-y-6` - 24px

**Avoid:** Arbitrary spacing values like `space-y-[10px]` or `gap-[7px]`

## Border Radius

Standard border radius values:

- `rounded-sm` - 4px - Small elements, badges
- `rounded-md` - 6px - **Default** - Cards, buttons, inputs
- `rounded-lg` - 8px - Large cards, modals
- `rounded-xl` - 12px - Special cases only
- `rounded-2xl` - 16px - Very large containers
- `rounded-full` - Pills, avatars

**Default:** Use `rounded-md` for most elements (cards, containers, buttons)

## Color Tokens

### Background Colors
Use design tokens from CSS variables:

- `bg-background` - Main background
- `bg-secondary` - Secondary background (cards, sections)
- `bg-card` - Card background
- `bg-muted` - Muted background
- `bg-accent` - Accent/hover background
- `bg-popover` - Popover/dropdown background

**Avoid:** Custom colors like `bg-zinc-950` or `bg-gray-900`

### Text Colors
- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary text
- `text-accent-foreground` - Accent text
- `text-destructive` - Error/destructive text

### Border Colors
- `border-border` - Default border
- `border-input` - Input borders
- `border-ring` - Focus ring color

**Avoid:** Custom border colors like `border-white/5` or `border-gray-800`

## Component Consistency

### Buttons
- Always use `Button` component from `@/components/ui/button`
- Use standard variants: `default`, `outline`, `secondary`, `ghost`, `destructive`
- Standard sizes: `sm`, `default`, `lg`, `icon`

### Inputs
- Always use `Input` component from `@/components/ui/input`
- Use `Textarea` for multi-line input
- Wrap with `FormField` for validation feedback

### Cards/Containers
- Standard padding: `p-4 sm:p-6`
- Standard border radius: `rounded-md`
- Standard border: `border border-border`
- Standard background: `bg-secondary/40` or `bg-card`

## Responsive Patterns

### Mobile-First Approach
- Base styles for mobile
- Use `sm:` prefix for tablet (640px+)
- Use `md:` prefix for desktop (768px+)
- Use `lg:` prefix for large desktop (1024px+)

### Common Responsive Patterns
```tsx
// Padding
className="p-4 sm:p-6"

// Spacing
className="space-y-4 sm:space-y-6"

// Grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"

// Text
className="text-sm sm:text-base"
```

## Best Practices

1. **Use Design Tokens** - Always prefer design tokens over custom values
2. **Follow Grid System** - Stick to 4px/8px grid for spacing
3. **Consistent Radius** - Use `rounded-md` as default
4. **Responsive First** - Design for mobile, enhance for desktop
5. **Component Library** - Use UI components instead of custom elements

## Files Reference

- Design Tokens: `lib/design-tokens.ts`
- Consistency Helpers: `lib/consistency-helpers.ts`
- Global Styles: `app/globals.css`

