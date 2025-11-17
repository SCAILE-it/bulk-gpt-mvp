# Design Tokens Standard

**Last Updated:** January 2025  
**Purpose:** Standardize design tokens across the application for consistency and maintainability

## Background Colors

### Standard Background Tokens
- `bg-background` - Main page background
- `bg-card` - Card/surface backgrounds
- `bg-secondary` - Secondary sections (default opacity: 100%)
- `bg-muted` - Muted/disabled backgrounds
- `bg-accent` - Accent/hover backgrounds

### Background Opacity Standards
**Standardize to these values only:**

#### For Subtle Sections (Cards, Panels)
- `bg-secondary/40` - **Standard for dashboard widgets, cards, panels**
- `bg-secondary/50` - **Standard for hover states, active sections**

#### For Overlays and Modals
- `bg-background/80` - **Standard for backdrop overlays**
- `bg-background/95` - **Standard for modal backgrounds**

#### For Hover States
- `bg-accent/50` - **Standard for hover backgrounds**
- `bg-accent/20` - **Standard for subtle hover**

**❌ Deprecated:** `bg-secondary/30`, `bg-secondary/20`, `bg-secondary/10`, `bg-secondary/70`, `bg-secondary/80`, `bg-secondary/90`

## Border Colors

### Standard Border Tokens
- `border-border` - Default borders (opacity: 100%)
- `border-primary` - Primary/accent borders
- `border-destructive` - Error borders

### Border Opacity Standards
**Standardize to these values only:**

#### For Standard Borders
- `border-border` - **Standard for all borders** (no opacity needed)
- `border-border/50` - **Standard for subtle dividers** (only when needed)

#### For Accent Borders
- `border-primary/20` - **Standard for primary accent borders**
- `border-primary/10` - **Standard for subtle primary borders**

**❌ Deprecated:** `border-border/30`, `border-border/20`, `border-border/10`, `border-border/70`, `border-border/80`, `border-border/90`

## Text Colors

### Standard Text Tokens
- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary/muted text
- `text-primary` - Primary/accent text
- `text-destructive` - Error text

### Text Opacity Standards
- `text-muted-foreground/70` - **Standard for subtle secondary text**
- `text-muted-foreground/60` - **Standard for very subtle text**
- `text-foreground/80` - **Standard for slightly muted primary text**

## Spacing

### Standard Spacing Scale (4px grid)
- `p-1` / `gap-1` - 4px
- `p-2` / `gap-2` - 8px
- `p-3` / `gap-3` - 12px
- `p-4` / `gap-4` - 16px
- `p-6` / `gap-6` - 24px
- `p-8` / `gap-8` - 32px

**Standard Padding Patterns:**
- Cards/Panels: `p-4` (16px) or `p-6` (24px)
- Sections: `py-3 px-4` or `py-4 px-6`
- Buttons: `px-3 py-2` or `px-4 py-2`

## Migration Guide

### Background Colors
```tsx
// ❌ Old
bg-secondary/30
bg-secondary/20
bg-secondary/70

// ✅ New
bg-secondary/40  // For cards/panels
bg-secondary/50  // For hover/active states
```

### Border Colors
```tsx
// ❌ Old
border-border/30
border-border/20
border-border/70

// ✅ New
border-border     // Standard borders
border-border/50  // Subtle dividers (use sparingly)
```

## Usage Examples

### Dashboard Widgets
```tsx
<div className="bg-secondary/40 border border-border rounded-lg p-4">
  {/* Widget content */}
</div>
```

### Cards/Panels
```tsx
<div className="bg-card border border-border rounded-lg p-6">
  {/* Card content */}
</div>
```

### Hover States
```tsx
<button className="hover:bg-accent/50 border border-border">
  {/* Button content */}
</button>
```

