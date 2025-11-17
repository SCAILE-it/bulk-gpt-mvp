/**
 * Design Tokens
 * 
 * Centralized design system tokens for consistent styling.
 * Based on Cursor-inspired design principles.
 */

/**
 * Typography Scale
 * Standard text sizes following design system
 */
export const typography = {
  xs: 'text-xs',      // 12px
  sm: 'text-sm',      // 14px
  base: 'text-base',  // 16px
  lg: 'text-lg',      // 18px
  xl: 'text-xl',      // 20px
  '2xl': 'text-2xl',  // 24px
  '3xl': 'text-3xl',  // 30px
} as const

/**
 * Spacing Scale (4px/8px grid)
 * Standard spacing values following 4px/8px grid system
 */
export const spacing = {
  // Padding/Margin values (multiples of 4px)
  '0': '0',
  '0.5': 'p-0.5',     // 2px
  '1': 'p-1',         // 4px
  '1.5': 'p-1.5',     // 6px
  '2': 'p-2',         // 8px
  '2.5': 'p-2.5',     // 10px
  '3': 'p-3',         // 12px
  '4': 'p-4',         // 16px
  '5': 'p-5',         // 20px
  '6': 'p-6',         // 24px
  '8': 'p-8',         // 32px
  
  // Gap values
  gap: {
    '0': 'gap-0',
    '0.5': 'gap-0.5',   // 2px
    '1': 'gap-1',       // 4px
    '1.5': 'gap-1.5',   // 6px
    '2': 'gap-2',       // 8px
    '2.5': 'gap-2.5',   // 10px
    '3': 'gap-3',       // 12px
    '4': 'gap-4',       // 16px
    '6': 'gap-6',       // 24px
    '8': 'gap-8',       // 32px
  },
  
  // Space-y values (vertical spacing)
  spaceY: {
    '1': 'space-y-1',   // 4px
    '2': 'space-y-2',   // 8px
    '3': 'space-y-3',   // 12px
    '4': 'space-y-4',   // 16px
    '6': 'space-y-6',   // 24px
  },
} as const

/**
 * Border Radius Scale
 * Standard border radius values
 */
export const borderRadius = {
  none: 'rounded-none',
  sm: 'rounded-sm',     // 4px
  md: 'rounded-md',     // 6px
  lg: 'rounded-lg',     // 8px
  xl: 'rounded-xl',     // 12px
  '2xl': 'rounded-2xl', // 16px
  full: 'rounded-full',
} as const

/**
 * Color Tokens Reference
 * Use CSS variables from globals.css
 */
export const colors = {
  // Background colors - use design tokens
  background: {
    primary: 'bg-background',
    secondary: 'bg-secondary',
    card: 'bg-card',
    popover: 'bg-popover',
    muted: 'bg-muted',
    accent: 'bg-accent',
  },
  
  // Text colors - use design tokens
  text: {
    primary: 'text-foreground',
    secondary: 'text-muted-foreground',
    accent: 'text-accent-foreground',
    destructive: 'text-destructive',
  },
  
  // Border colors - use design tokens
  border: {
    default: 'border-border',
    input: 'border-input',
    ring: 'border-ring',
  },
} as const

/**
 * Helper function to get standardized spacing class
 */
export function getSpacing(multiplier: number): string {
  const spacingMap: Record<number, string> = {
    0: 'p-0',
    1: 'p-1',      // 4px
    2: 'p-2',      // 8px
    3: 'p-3',      // 12px
    4: 'p-4',      // 16px
    5: 'p-5',      // 20px
    6: 'p-6',      // 24px
    8: 'p-8',      // 32px
  }
  return spacingMap[multiplier] || `p-${multiplier}`
}

/**
 * Helper function to get standardized gap class
 */
export function getGap(multiplier: number): string {
  const gapMap: Record<number, string> = {
    0: 'gap-0',
    1: 'gap-1',    // 4px
    2: 'gap-2',    // 8px
    3: 'gap-3',    // 12px
    4: 'gap-4',    // 16px
    6: 'gap-6',    // 24px
    8: 'gap-8',    // 32px
  }
  return gapMap[multiplier] || `gap-${multiplier}`
}

