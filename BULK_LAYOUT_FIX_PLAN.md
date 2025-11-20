# Bulk Processor Layout Fix - Action Buttons Position

## Problem
User reports that action buttons (Test, Process All) are showing in the RIGHT panel instead of in a BOTTOM toolbar that spans the full width.

## Current Structure (BROKEN)
```
Desktop grid (2-column)
├── LEFT PANEL
│   ├── Configuration sections (Input/Task/Output)
│   └── ACTIONS toolbar (sticky bottom) <-- WRONG LOCATION
└── RIGHT PANEL
    └── Results
```

##  Expected Structure (from user screenshot)
```
Desktop grid (2-column)
├── LEFT PANEL
│   └── Configuration sections (Input/Task/Output)
└── RIGHT PANEL
    └── Results
ACTIONS toolbar (outside grid, full width at bottom) <-- CORRECT LOCATION
```

## Root Cause
The ACTIONS section (lines 2243-2350) is currently INSIDE the LEFT PANEL. Because it uses `sticky bottom-0`, it sticks to the bottom of the LEFT panel's container, not the viewport. This causes layout issues where buttons may appear in unexpected locations.

## Solution
Move the ACTIONS section OUTSIDE the desktop grid so it spans the full width at the bottom of the viewport, appearing below both the LEFT and RIGHT panels.

## Implementation Steps
1. Find where LEFT PANEL closes (should be before RIGHT PANEL starts at line 2352)
2. Move ACTIONS section (lines 2243-2350) to AFTER the desktop grid closes
3. Ensure proper indentation and closing tags
4. Test at all breakpoints (767px, 768px, 900px, 1024px)

## Files to Modify
- `components/bulk/BulkProcessor.tsx`

