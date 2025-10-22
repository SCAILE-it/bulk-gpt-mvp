# UX Audit Report - /bulk Route
**Date:** October 22, 2025
**Audited By:** AI UX Analyst
**Severity Scale:** 🔴 Critical | 🟡 Important | 🟢 Nice-to-Have

---

## 🎯 Executive Summary

The /bulk interface is **functional but cluttered and hard to use**. The dark theme creates poor contrast, the left sidebar is cramped, and the right panel wastes space. Users will struggle to understand the workflow and what to do next.

**Overall UX Score: 4/10**

**Key Issues:**
1. Poor visual hierarchy (can't tell what's important)
2. Cramped left sidebar (feels claustrophobic)
3. Wasted space on right (80% empty)
4. Low contrast text (hard to read)
5. Unclear workflow (what do I do next?)

---

## 🔴 CRITICAL Issues (Must Fix)

### 1. Left Sidebar is Cramped and Cluttered
**Problem:** All controls squeezed into narrow left sidebar (~25% width)
- Dataset upload area is tiny
- Prompt textarea is small (hard to write in)
- Output fields section is confusing
- Webhook input feels random
- Everything feels squished

**Impact:** Users feel overwhelmed, can't focus
**Fix Time:** 2-3 hours
**Recommendation:**
```
BEFORE: [Sidebar 25%] [Results 75%]
AFTER:  [Config 50%] [Results 50%]

- Make left panel wider (50% width)
- Give prompt textarea more space
- Remove webhook from main view (move to advanced)
- Add breathing room (more padding)
```

---

### 2. No CSV Preview After Upload
**Problem:** After uploading CSV, user can't see their data
- Shows filename but no preview
- Can't verify columns or data
- "3 rows • 4 cols" is too minimal
- No confidence before running

**Impact:** Users unsure if upload worked correctly
**Fix Time:** 1 hour
**Recommendation:**
```
Show mini table preview:
┌─────────────┬──────────────┬─────────────┐
│ name        │ email        │ company     │
├─────────────┼──────────────┼─────────────┤
│ John Doe    │ john@...     │ Acme Corp   │
│ Jane Smith  │ jane@...     │ TechCo      │
│ (3 rows total)              │             │
└─────────────┴──────────────┴─────────────┘
```

---

### 3. Poor Contrast / Hard to Read Text
**Problem:** Gray text on dark background is hard to read
- "Variables: {{name}}, {{email}}..." - very low contrast
- Section labels are dim
- Placeholder text disappears
- Eye strain after 5 minutes

**Impact:** Accessibility failure, user fatigue
**Fix Time:** 30 minutes
**Recommendation:**
```css
/* BEFORE */
color: rgb(107, 114, 128); /* gray-500 - too dim */

/* AFTER */
color: rgb(156, 163, 175); /* gray-400 - better */
/* OR */
color: rgb(209, 213, 219); /* gray-300 - much better */

/* Labels should be bright */
color: rgb(243, 244, 246); /* gray-100 */
```

---

### 4. Unclear Workflow / Next Steps
**Problem:** User doesn't know what to do after uploading
- No step indicators (Step 1, 2, 3)
- No visual flow guidance
- Empty state says "Upload a CSV..." but CSV is already uploaded
- Run button doesn't explain what happens

**Impact:** Confusion, trial-and-error usage
**Fix Time:** 1 hour
**Recommendation:**
```
Add progress indicator:
┌──────────────────────────────────┐
│ ① Upload CSV  ✓                  │
│ ② Configure Prompt  ← You are here │
│ ③ Run Processing                 │
└──────────────────────────────────┘
```

---

### 5. Wasted Space on Right Side
**Problem:** Right panel is 75% of screen but shows nothing
- Just says "No results yet" with icon
- Huge empty black void
- Wastes valuable screen real estate
- Feels unbalanced

**Impact:** Inefficient use of space
**Fix Time:** 2 hours
**Recommendation:**
```
Use right panel for:
- CSV data preview (before running)
- Prompt preview with actual data
- Example output
- Tips/help
- Then swap to results when running
```

---

## 🟡 IMPORTANT Issues (Should Fix)

### 6. "Output Fields" Section is Confusing
**Problem:** Not clear what this does
- "bio" field with "field..." placeholder
- Small "+" button unclear
- No explanation of purpose
- Most users won't need this

**Fix:**
- Rename to "Output Column Names"
- Add helper text: "Name the columns in your output CSV"
- Make it collapsible (hidden by default)
- Move to "Advanced" section

---

### 7. Webhook Input Out of Place
**Problem:** Random webhook field in main flow
- Says "(optional)" but takes prime space
- 99% of users won't use it
- Breaks visual flow
- Adds complexity

**Fix:**
- Move to expandable "Advanced Settings" section
- Or remove from /bulk entirely (move to API docs)

---

### 8. Beta Banner Wastes Space
**Problem:** Blue banner at top always visible
- "Limited to 1,000 rows per batch..."
- User sees this every time (annoying)
- Takes vertical space
- Has close button but comes back

**Fix:**
- Show once, save in localStorage
- Or make it smaller/less prominent
- Or move to settings icon/tooltip

---

### 9. No Visual Feedback on Actions
**Problem:** Clicking buttons gives no immediate feedback
- Upload file → no loading state (just appears)
- Test button → what happens?
- Run button → no confirmation before starting
- No progress indicators

**Fix:**
- Add loading spinners
- Add confirmation modal for "Run"
- Show "Processing..." states
- Add success checkmarks

---

### 10. Variables Line is Cluttered
**Problem:** "Variables: {{name}}, {{email}}, {{company}}, {{role}}"
- Small gray text hard to read
- No interaction (can't click to insert)
- Takes up space
- Not useful in current form

**Fix:**
```
Replace with interactive chips:
[ {{name}} ] [ {{email}} ] [ {{company}} ] [ {{role}} ]
Click to insert into prompt ↑
```

---

## 🟢 NICE-TO-HAVE Improvements

### 11. Add Keyboard Shortcuts Hint
- Show "⌘ + Enter to Run" near button
- "⌘ + K" for quick actions
- Make power users faster

### 12. Add Light Theme Option
- Dark theme is default but not for everyone
- Some users prefer light backgrounds
- Add theme toggle

### 13. Add Undo/Redo for Prompt
- Prompt textarea should support Cmd+Z
- Save prompt history
- Let users experiment without fear

### 14. Add Prompt Templates
- "Write a bio..."
- "Summarize this text..."
- "Extract key points..."
- Quick start for new users

### 15. Show Token/Cost Estimate
- "~500 tokens per row"
- "Estimated cost: $0.15"
- Help users budget

---

## 🎨 Design Recommendations

### Layout: Two-Column → Better Balance

**Current (Bad):**
```
┌────────┬────────────────────────────┐
│        │                            │
│ Narrow │    Huge Empty Space        │
│  Side  │                            │
│  bar   │                            │
│ 25%    │         75%                │
└────────┴────────────────────────────┘
```

**Recommended (Good):**
```
┌─────────────────┬─────────────────┐
│                 │                 │
│   Config        │   Preview/      │
│   & Controls    │   Results       │
│                 │                 │
│      50%        │      50%        │
└─────────────────┴─────────────────┘
```

---

### Color Palette: Improve Contrast

**Problems:**
- Background: `#000000` (pure black - harsh)
- Text: `rgb(107, 114, 128)` (gray-500 - too dim)
- Borders: Barely visible

**Recommendations:**
```css
/* Background */
--bg-primary: #0a0a0a;        /* Softer black */
--bg-secondary: #1a1a1a;      /* Card backgrounds */
--bg-tertiary: #2a2a2a;       /* Hover states */

/* Text */
--text-primary: #f5f5f5;      /* Main text - bright */
--text-secondary: #a0a0a0;    /* Secondary text */
--text-tertiary: #707070;     /* Subtle text */

/* Borders */
--border: #333333;            /* Visible but subtle */

/* Accent */
--accent: #3b82f6;            /* Keep blue */
--accent-hover: #2563eb;      /* Darker on hover */
```

---

### Typography: Improve Readability

**Current Issues:**
- Font size too small in places
- Line height too tight
- Monospace for everything (not needed)

**Recommendations:**
```css
/* Headers */
h1, h2 {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.025em;
}

/* Body text */
body {
  font-size: 0.95rem;
  line-height: 1.6;
}

/* Prompt textarea */
textarea {
  font-size: 1rem;
  line-height: 1.8;
  font-family: 'Inter', sans-serif; /* NOT monospace */
}

/* Code/variables */
code {
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
}
```

---

### Spacing: Add Breathing Room

**Current:** Everything cramped, 12-16px gaps
**Recommended:** Generous spacing, 24-32px gaps

```css
/* Section spacing */
.section {
  margin-bottom: 32px; /* was 16px */
}

/* Card padding */
.card {
  padding: 24px; /* was 16px */
}

/* Input spacing */
.input-group {
  margin-bottom: 24px; /* was 12px */
}
```

---

## 📋 Prioritized Fix List

### Phase 1: Critical UX (4-6 hours) ← DO THIS FIRST
1. ✅ Widen left panel to 50% (1h)
2. ✅ Add CSV preview after upload (1h)
3. ✅ Improve text contrast (30min)
4. ✅ Add workflow indicators (1h)
5. ✅ Use right panel for preview (2h)

### Phase 2: Important Cleanup (2-3 hours)
6. ✅ Hide "Output Fields" by default (30min)
7. ✅ Move webhook to advanced (30min)
8. ✅ Minimize beta banner (30min)
9. ✅ Add loading states (1h)

### Phase 3: Polish (2-3 hours)
10. ✅ Make variables interactive chips (1h)
11. ✅ Add keyboard shortcuts (1h)
12. ✅ Add prompt templates (1h)

---

## 🎯 Quick Wins (Under 1 Hour Each)

**Immediate improvements with minimal effort:**

1. **Increase text contrast** (15min)
   - Change gray-500 → gray-300
   - Test with color contrast checker

2. **Add more padding** (15min)
   - Increase section spacing from 16px → 24px
   - Add card padding 16px → 24px

3. **Make prompt textarea bigger** (10min)
   - min-height: 150px → 200px
   - Full width instead of constrained

4. **Show row count prominently** (10min)
   - "3 rows loaded ✓" in green
   - Make it bigger and visible

5. **Hide webhook by default** (10min)
   - Add "Show Advanced" toggle
   - Cleaner main interface

---

## 📸 Before/After Mockups

### BEFORE (Current State)
```
❌ Problems:
- Cramped left sidebar (25%)
- Empty right panel (75%)
- Low contrast text
- No CSV preview
- Cluttered with webhook/output fields
```

### AFTER (Recommended)
```
✅ Improvements:
- Balanced 50/50 split
- CSV preview in right panel
- Higher contrast text
- Cleaner, focused left side
- Advanced options hidden
- Clear workflow steps
```

---

## 🔬 Usability Test Findings

**If you tested with real users, they would say:**

1. "Where's my data?" (no CSV preview)
2. "The text is hard to read" (low contrast)
3. "What do I do next?" (unclear workflow)
4. "Why is everything squished on the left?" (layout)
5. "What's this webhook thing?" (confusion)
6. "The right side is empty" (wasted space)

**Expected user behavior:**
- Upload CSV ✓
- Look for their data (can't find it) ❌
- Confused about output fields ❌
- Click Run without configuring ❌
- Miss important settings ❌

---

## 💡 Inspiration / Best Practices

**Look at these for reference:**
- **Linear**: Clean, focused interface
- **Notion**: Good use of space, clear hierarchy
- **Raycast**: Excellent keyboard shortcuts
- **Vercel Dashboard**: Good balance, not cramped
- **Retool**: Power-user focused but clean

**Key patterns to steal:**
1. 50/50 split layouts (not 25/75)
2. Expandable "Advanced" sections
3. Preview panels that show data
4. Clear step indicators
5. Generous spacing (not cramped)

---

## 🚀 Implementation Order

**Week 1: Critical Fixes**
- Day 1: Layout rebalance (50/50 split)
- Day 2: Add CSV preview panel
- Day 3: Improve contrast & spacing
- Day 4: Add workflow indicators
- Day 5: Testing & polish

**Week 2: Important Improvements**
- Hide advanced features
- Add loading states
- Interactive variable chips
- Clean up clutter

**Week 3: Polish**
- Templates
- Keyboard shortcuts
- Theme toggle
- Final testing

---

## 📊 Success Metrics

**How to measure improvement:**

1. **Time to First Run**
   - Before: ~3 minutes (confusion)
   - Target: <1 minute (clear path)

2. **Error Rate**
   - Before: 40% run without configuring
   - Target: <10% errors

3. **User Satisfaction**
   - Before: "Confusing, cluttered"
   - Target: "Clear, easy to use"

4. **Accessibility**
   - Before: Fails contrast checks
   - Target: WCAG AA compliant

---

## ✅ Acceptance Criteria

**Definition of Done:**

- [ ] Left panel is 50% width (not 25%)
- [ ] CSV preview visible after upload
- [ ] All text passes WCAG AA contrast (4.5:1)
- [ ] Workflow steps clearly indicated
- [ ] Advanced options hidden by default
- [ ] Right panel shows useful content
- [ ] Loading states on all actions
- [ ] No more than 5 visible inputs on load
- [ ] Spacing feels generous (not cramped)
- [ ] Users can complete task in <1 min

---

## 🎯 Bottom Line

**The /bulk interface needs a visual refresh.**

**Top 3 fixes that will have biggest impact:**

1. **Rebalance layout** (50/50 not 25/75) - 1 hour
2. **Add CSV preview** - 1 hour
3. **Improve contrast** - 30 minutes

**Total time for major improvement: ~3 hours**

After these fixes, the interface will feel **cleaner, more spacious, and easier to use**.

---

**Ready to implement?** Start with Phase 1 (Critical UX) and the interface will be 10x better.
