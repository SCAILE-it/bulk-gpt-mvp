# YC-Grade Design Specification - Bulk GPT Processor

## 🧭 DESIGN GOAL

**From:** Functional developer tool (MVP-level polish)
**To:** YC-grade *power-user platform* — efficient, intentional, confident UI

**Benchmark References:** Linear, Vercel, Cursor, n8n
**Design Principles:** Dark, minimal, high contrast, purpose-built for technical users

---

## 🎨 1. VISUAL DESIGN SYSTEM

### Surface Layers (3-Level Depth System)

**Current Problem:** Flat zinc-950 everywhere — no visual hierarchy
**YC Solution:** Use subtle surface contrast for depth (NOT shadows)

```tsx
// App Shell
bg-zinc-950

// Sidebar Panels, Major Sections
bg-zinc-900

// Cards, Inputs, Nested Elements
bg-zinc-800/40
```

**Why:** Linear and Cursor rely on **depth through subtle contrast**, not shadows. This instantly adds hierarchy.

**Implementation:**
- App background: `bg-zinc-950`
- Left sidebar container: `bg-zinc-900`
- Form sections (prompt, output fields): `bg-zinc-800/40 rounded-lg p-3`
- Results table header: `bg-zinc-900/95`

---

### Borders (Blended Overlays)

**Current Problem:** Pure zinc borders feel "outlined" and disconnected
**YC Solution:** Blended white overlays create "fused" feel

```tsx
// BEFORE
border-zinc-800/60

// AFTER
border-white/5
```

**Why:** Makes UI feel cohesive rather than segmented. Used extensively in Linear.

**Implementation:**
- All section borders: `border-white/5`
- Dividers: `border-t border-white/5`
- Input borders: `border border-white/5`
- Card outlines: `border border-white/5`

---

### Typography (Precision Font Pairing)

**Current Problem:** Generic sans-serif, sizes too small (10-12px)
**YC Solution:** Geist Sans + Geist Mono (or Inter + JetBrains Mono), +1px size bump

| Font System | UI Elements | Code/Data |
|-------------|-------------|-----------|
| **Option 1 (Recommended)** | Geist Sans | Geist Mono |
| **Option 2** | Inter | JetBrains Mono |

**Size Scale:**
| Element | Current | New | Font | Weight | Color |
|---------|---------|-----|------|--------|-------|
| Headings | 14px | 15px | Geist Sans | 500 | `text-zinc-200` |
| Labels | 11px | 12px | Geist Sans | 500 | `text-zinc-400` |
| Body | 12px | 13px | Geist Sans | 400 | `text-zinc-300` |
| Code/Prompt | 12px | 13px | Geist Mono | 400 | `text-zinc-100` |
| Placeholders | 11px | 12px | Geist Sans | 400 | `text-zinc-500` |

**Why:** YC-grade feel comes from **microprecision typography**. Linear, Cursor use these exact pairs.

**Implementation:**
```tsx
// Install fonts
npm install @vercel/font

// Add to layout
import { GeistSans, GeistMono } from '@vercel/font'

// CSS classes
className={`${GeistSans.className} text-sm font-medium text-zinc-400`}
className={`${GeistMono.className} text-sm text-zinc-100`}
```

---

### Accent Colors (Blue Theme Refinement)

**Current:** `blue-500` flat accent
**YC Solution:** Layered blue with hover/active states + inner glow

```tsx
// Primary accent
text-blue-400      // Hover
text-blue-500      // Default
text-blue-600      // Active

bg-blue-600        // Default button
bg-blue-500        // Hover
bg-blue-700        // Active

// Add 1px inner glow on hover
hover:shadow-[inset_0_1px_0_rgba(96,165,250,0.2)]
```

**Why:** Adds depth and tactile feedback without being heavy.

---

### Focus Rings (Glow Effect)

**Current:** `ring-blue-500/50` (simple ring)
**YC Solution:** Glow ring with shadow

```tsx
// BEFORE
focus:ring-1 focus:ring-blue-500/50

// AFTER
focus:ring-1 focus:ring-blue-500/40
focus:shadow-[0_0_4px_rgba(59,130,246,0.4)]
```

**Why:** Makes interactions feel **alive** and responsive. Used in Cursor heavily.

---

### Shadows (Subtle Elevation)

**Current:** No shadows (good!)
**YC Addition:** Light drop shadows ONLY on floating panels

```tsx
// Sticky header
shadow-[0_1px_4px_rgba(0,0,0,0.4)]

// Modal/Popover (if added later)
shadow-[0_8px_24px_rgba(0,0,0,0.4)]
```

**Why:** Linear-like elevation without heaviness. Use sparingly.

---

## 🧱 2. STRUCTURE & HIERARCHY

### Problem
Sections ("Dataset", "Prompt", "Output Fields") are visually flat — no vertical rhythm or breathing structure.

### Solution: Section Blocks

```tsx
<section className="border-t border-white/5 pt-4 mt-6">
  <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
    Prompt Template
  </h3>
  <div className="rounded-lg bg-zinc-900/50 border border-white/5 p-3">
    {/* Content */}
  </div>
</section>
```

**Pattern:**
1. Section header: `text-[11px] uppercase tracking-wider text-zinc-500`
2. Content container: `bg-zinc-900/50 border border-white/5 rounded-lg p-3`
3. Spacing: `pt-4 mt-6` between sections
4. Divider: `border-t border-white/5`

**Apply to:**
- Dataset upload section
- Prompt configuration
- Output schema
- Webhooks
- API Access

---

### Sidebar Refinement

**Changes:**
1. **Collapse lesser-used areas** behind accordions:
   - API Access (collapse by default)
   - Webhooks (collapse by default)
   - Keep Dataset, Prompt, Output Fields always visible

2. **Pin CTA buttons at bottom:**
```tsx
<div className="sticky bottom-0 p-6 border-t border-white/5 bg-zinc-950/95 backdrop-blur-md">
  <div className="flex gap-2">
    {/* Test + Run buttons */}
  </div>
</div>
```

**Add blur background:** `backdrop-blur-md bg-zinc-950/95`

---

### Results Panel

**Changes:**

1. **Fixed header with subtle gradient fade:**
```tsx
<div className="sticky top-0 bg-gradient-to-b from-zinc-900 to-zinc-900/95 backdrop-blur-md border-b border-white/5">
  {/* Header content */}
</div>
```

2. **Active job rows with left accent bar:**
```tsx
<tr className="relative border-b border-white/5 hover:bg-zinc-800/40 transition-colors">
  {/* For processing rows */}
  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500/50" />
  {/* Row content */}
</tr>
```

---

## 🔠 3. TYPOGRAPHY SYSTEM

### Font Installation

```bash
npm install @vercel/font
```

```tsx
// app/layout.tsx
import { GeistSans, GeistMono } from '@vercel/font'

export default function RootLayout({ children }) {
  return (
    <html className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
}
```

### CSS Variables

```css
/* tailwind.config.ts */
theme: {
  extend: {
    fontFamily: {
      sans: ['var(--font-geist-sans)'],
      mono: ['var(--font-geist-mono)'],
    }
  }
}
```

### Usage Patterns

```tsx
// Headings
<h1 className="text-[15px] font-medium text-zinc-200">Bulk Processor</h1>

// Labels
<label className="text-xs font-medium text-zinc-400">Prompt</label>

// Body text
<p className="text-sm text-zinc-300">Description text</p>

// Code/Data
<code className="font-mono text-sm text-zinc-100">{{name}}</code>

// Placeholders
<input placeholder="Enter value" className="placeholder:text-zinc-500" />
```

**Key Rule:** Avoid bolding (font-weight: 700). Use weight contrast (400 vs 500 only).

---

## 🧩 4. INTERACTIVE ELEMENTS

### Inputs (Textareas, Text Inputs)

```tsx
<textarea className="
  w-full min-h-[120px]
  px-3 py-2.5
  bg-zinc-900/70
  border border-white/5
  rounded-lg
  text-sm text-zinc-100
  font-mono
  placeholder:text-zinc-500
  focus:outline-none
  focus:ring-1
  focus:ring-blue-500/40
  focus:shadow-[0_0_4px_rgba(59,130,246,0.4)]
  transition-all duration-150 ease-out
" />
```

**Changes:**
- Background: `bg-zinc-900/70` (layered surface)
- Border: `border-white/5` (blended overlay)
- Padding: `py-2.5` (was `py-2` — slightly more breathing room)
- Focus: glow ring + shadow
- Transition: `transition-all duration-150 ease-out`

---

### Buttons

**Primary (Run, Process):**
```tsx
<button className="
  px-4 py-2.5
  bg-blue-600
  hover:bg-blue-500
  active:bg-blue-700
  text-white text-sm font-medium
  rounded-md
  transition-all duration-150 ease-out
  hover:shadow-[inset_0_1px_0_rgba(96,165,250,0.2)]
  disabled:opacity-50
  disabled:cursor-not-allowed
">
  Run (142)
</button>
```

**Secondary (Test, Export):**
```tsx
<button className="
  px-4 py-2.5
  bg-zinc-800
  hover:bg-zinc-700
  active:bg-zinc-900
  text-zinc-200 text-sm font-medium
  rounded-md
  transition-all duration-150 ease-out
  disabled:opacity-50
  disabled:cursor-not-allowed
">
  Test
</button>
```

**Ghost (Minor actions):**
```tsx
<button className="
  px-3 py-1.5
  text-zinc-400 text-xs
  hover:bg-zinc-800/40
  hover:text-zinc-300
  rounded-md
  transition-all duration-150 ease-out
">
  Show curl command →
</button>
```

**Micro-interaction (Optional):**
```tsx
// Add Framer Motion
import { motion } from 'framer-motion'

<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="..."
>
  Run
</motion.button>
```

---

### Dropzone (File Upload)

```tsx
<div className={`
  border border-dashed rounded-lg p-8 text-center cursor-pointer
  transition-all duration-200
  ${isDragActive
    ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
    : file
    ? 'border-white/10 bg-zinc-900/50'
    : 'border-white/5 hover:border-white/10 hover:bg-zinc-900/30'
  }
`}>
  <Upload className="h-5 w-5 mx-auto mb-2 text-zinc-600" />
  <p className="text-xs text-zinc-400">
    {isDragActive ? 'Drop here' : file ? file.name : 'Drop CSV file'}
  </p>
</div>
```

**Changes:**
- Border: `border-white/5` default, `border-white/10` hover
- Active state: add glow `shadow-[0_0_12px_rgba(59,130,246,0.2)]`
- Transition: `transition-all duration-200`

---

## 📊 5. DATA DENSITY (Results Table)

### Current Problem
- Dense table is good for power users but lacks breathing room
- Same row color makes scanning hard
- Flat cells feel static

### YC Solution

```tsx
<table className="w-full text-sm">
  <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-md border-b border-white/5">
    <tr>
      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Name</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Output</th>
    </tr>
  </thead>
  <tbody>
    {results.map((result, i) => (
      <tr
        key={result.id}
        className={`
          relative border-b border-white/5
          hover:bg-zinc-800/40
          transition-colors duration-150
          cursor-pointer
          ${i % 2 === 0 ? 'bg-zinc-900/40' : 'bg-transparent'}
        `}
      >
        {/* Processing row accent bar */}
        {result.status === 'processing' && (
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500/50" />
        )}

        <td className="px-4 py-3">
          {result.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
          {result.status === 'failed' && <XCircle className="h-4 w-4 text-red-400" />}
          {result.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
        </td>

        <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
          {result.input.name}
        </td>

        <td className="px-4 py-3 text-zinc-300 text-xs leading-relaxed">
          <span className="line-clamp-2">{result.output}</span>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

**Key Changes:**
1. **Row padding:** `py-3` (was `py-2`)
2. **Alternating rows:** `bg-zinc-900/40` every other row
3. **Hover state:** `hover:bg-zinc-800/40 transition-colors`
4. **Cursor feedback:** `cursor-pointer`
5. **Processing accent:** Left `2px` blue bar on active rows
6. **Icon colors:** Consistent gray/blue tint (no color overload)
7. **Line height:** `leading-relaxed` for readability

---

## 🧘 6. EMPTY STATES

### Current
Generic centered text with icon — needs more polish.

### YC Solution

```tsx
<div className="flex flex-col items-center justify-center py-20 text-center">
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <FileText className="w-10 h-10 text-zinc-600 mb-3" />
    <p className="text-sm font-medium text-zinc-300">No results yet</p>
    <p className="text-xs text-zinc-500 mt-1 max-w-xs">
      Upload a CSV, configure your prompt, and click Run to start processing
    </p>
  </motion.div>
</div>
```

**Changes:**
1. **Replace emoji** with minimal Lucide icon
2. **Add fade-in animation:** `opacity 0→1` over 0.3s (Framer Motion)
3. **Visual silence:** No color, no borders, no gradients
4. **Tone:** Helpful but not playful
5. **Max width:** Constrain description to `max-w-xs` for readability

---

## ⚡ 7. IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Visual Design System)
- [ ] Install Geist Sans + Geist Mono fonts (`@vercel/font`)
- [ ] Update `tailwind.config.ts` with font variables
- [ ] Replace all background colors with 3-layer system:
  - [ ] App shell: `bg-zinc-950`
  - [ ] Sidebar: `bg-zinc-900`
  - [ ] Cards/inputs: `bg-zinc-800/40`
- [ ] Replace all borders with `border-white/5`
- [ ] Increase all text sizes by +1px (12→13, 11→12, etc.)
- [ ] Update focus rings to glow effect (`ring-1 ring-blue-500/40 shadow-[0_0_4px_rgba(59,130,246,0.4)]`)

### Phase 2: Structure (Hierarchy & Rhythm)
- [ ] Wrap all sidebar sections in section blocks:
  - [ ] Add section headers: `text-[11px] uppercase tracking-wider text-zinc-500`
  - [ ] Wrap content in: `bg-zinc-900/50 border border-white/5 rounded-lg p-3`
  - [ ] Add dividers: `border-t border-white/5 pt-4 mt-6`
- [ ] Collapse API Access and Webhooks behind accordions
- [ ] Update sticky action buttons with blur background
- [ ] Add gradient fade to results table header
- [ ] Add left accent bars to processing rows

### Phase 3: Interactive Elements
- [ ] Update all inputs:
  - [ ] `bg-zinc-900/70 border border-white/5`
  - [ ] `py-2.5` padding (increase from `py-2`)
  - [ ] Glow focus ring
  - [ ] `transition-all duration-150 ease-out`
- [ ] Update all buttons:
  - [ ] Primary: `bg-blue-600 hover:bg-blue-500 active:bg-blue-700`
  - [ ] Secondary: `bg-zinc-800 hover:bg-zinc-700`
  - [ ] Ghost: `hover:bg-zinc-800/40`
  - [ ] Add `rounded-md` (change from `rounded-lg`)
  - [ ] Add inner glow on hover
- [ ] Update dropzone with glow effect on drag

### Phase 4: Data Display (Table Refinement)
- [ ] Increase row padding to `py-3`
- [ ] Add alternating row backgrounds: `bg-zinc-900/40`
- [ ] Add hover states: `hover:bg-zinc-800/40`
- [ ] Add processing accent bars (left 2px blue)
- [ ] Add cursor pointer
- [ ] Update icon colors (consistent gray/blue)
- [ ] Increase line height: `leading-relaxed`

### Phase 5: Polish (Empty States & Motion)
- [ ] Install Framer Motion: `npm install framer-motion`
- [ ] Update empty states with fade-in animation
- [ ] Replace emoji with Lucide icons
- [ ] Add micro-interactions to buttons (optional)
- [ ] Test all transitions (150ms ease-out)

### Phase 6: Verification
- [ ] Compare side-by-side with Linear
- [ ] Compare side-by-side with Cursor
- [ ] Compare side-by-side with Vercel
- [ ] Typography contrast check (400 vs 500 weights)
- [ ] Focus ring visibility check
- [ ] Hover state feedback check
- [ ] Mobile/responsive check (if applicable)

---

## 🧠 8. OPTIONAL ENHANCEMENTS (Linear-Level Perfection)

### 1px Keylines (Instead of Full Borders)
```tsx
// Subtle inset highlight
shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
```

### Framer Motion Section Transitions
```tsx
<motion.section
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: 'easeOut' }}
>
  {/* Section content */}
</motion.section>
```

### Blurred Glass Header
```tsx
<header className="
  sticky top-0 z-50
  border-b border-white/5
  bg-zinc-950/80
  backdrop-blur-md
  supports-[backdrop-filter]:bg-zinc-950/60
">
  {/* Header content */}
</header>
```

### Command Palette (⌘K)
Even if read-only, signals "power tool" to users.

```tsx
// Install
npm install cmdk

// Implement
import { Command } from 'cmdk'

// Trigger with ⌘K
useHotkeys('mod+k', () => setOpen(true))
```

---

## 📸 BEFORE/AFTER COMPARISON

### Typography
**Before:**
```tsx
<h1 className="text-sm font-semibold">Bulk Processor</h1>
<label className="text-xs text-zinc-400">Prompt</label>
```

**After:**
```tsx
<h1 className="text-[15px] font-medium text-zinc-200">Bulk Processor</h1>
<label className="text-xs font-medium text-zinc-400">Prompt</label>
```

### Inputs
**Before:**
```tsx
<textarea className="
  bg-zinc-900/50 border border-zinc-800
  focus:ring-1 focus:ring-blue-500/50
" />
```

**After:**
```tsx
<textarea className="
  bg-zinc-900/70 border border-white/5
  focus:ring-1 focus:ring-blue-500/40
  focus:shadow-[0_0_4px_rgba(59,130,246,0.4)]
  transition-all duration-150 ease-out
" />
```

### Buttons
**Before:**
```tsx
<button className="bg-blue-600 hover:bg-blue-500 rounded-lg">
  Run
</button>
```

**After:**
```tsx
<button className="
  bg-blue-600 hover:bg-blue-500 active:bg-blue-700
  rounded-md
  hover:shadow-[inset_0_1px_0_rgba(96,165,250,0.2)]
  transition-all duration-150 ease-out
">
  Run (142)
</button>
```

### Table Rows
**Before:**
```tsx
<tr className="border-b border-zinc-800/30">
  <td className="px-4 py-2">...</td>
</tr>
```

**After:**
```tsx
<tr className="
  relative border-b border-white/5
  hover:bg-zinc-800/40
  transition-colors duration-150
  cursor-pointer
  bg-zinc-900/40
">
  {isProcessing && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500/50" />}
  <td className="px-4 py-3">...</td>
</tr>
```

---

## 🎯 SUCCESS METRICS

### Visual Hierarchy
- ✅ Can you distinguish 3 surface layers at a glance?
- ✅ Do sections have clear rhythm and spacing?
- ✅ Are labels distinct from body text?

### Interaction Feedback
- ✅ Do inputs glow when focused?
- ✅ Do buttons feel responsive (hover/active states)?
- ✅ Can you see table row highlighting on hover?

### Professional Polish
- ✅ Does typography feel precise (not generic)?
- ✅ Are borders subtle but visible?
- ✅ Does it match Linear/Cursor/Vercel aesthetic?

### Power User Efficiency
- ✅ Is data density maintained (not too spacious)?
- ✅ Are keyboard shortcuts still prominent?
- ✅ Can you scan results table quickly?

---

## 📦 DEPENDENCIES

```bash
# Install required packages
npm install @vercel/font framer-motion cmdk
```

```json
// package.json additions
{
  "dependencies": {
    "@vercel/font": "^1.0.0",
    "framer-motion": "^11.0.0",
    "cmdk": "^1.0.0"
  }
}
```

---

## 🚀 NEXT STEPS

1. **Review this spec** with team/designer
2. **Create visual mockup** (optional - can be done in Figma or as annotated screenshot)
3. **Implement Phase 1-3** (foundation + structure + interactions)
4. **User test** with power users
5. **Implement Phase 4-5** (data display + polish)
6. **Compare with Linear** side-by-side
7. **Ship YC-grade UI** 🎉

---

**Target:** Transform from "functional MVP" → "Linear-level polish"
**Timeline:** 2-3 days of focused implementation
**Complexity:** Medium (CSS-heavy, minimal React changes)
