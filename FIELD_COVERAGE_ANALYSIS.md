# Website Analyzer - UI Form Field Coverage Analysis

## ✅ Covered Fields (Extracted from Website)

| UI Form Field | Analyzer Output Location | Status |
|--------------|-------------------------|--------|
| **Tone** | `Business Context → Tone` | ✅ Extracted |
| **ICP (Ideal Customer Profile)** | `Business Context → ICP` | ✅ Extracted |
| **Value Proposition** | `Competitive Intelligence → Value Proposition` | ✅ Extracted |
| **Target Countries** | `Business Context → Target Countries` or `Countries` | ✅ Extracted |
| **Products** | `Business Context → Products` | ✅ Extracted |
| **Product Description** | `Business Context → Product Description` | ✅ Extracted |
| **Competitors** | `Business Context → Competitors` | ✅ Extracted |
| **Target Industries** | `Business Context → Target Industries` | ✅ Extracted |
| **Compliance Flags** | `Business Context → Compliance Flags` | ✅ Extracted |
| **Target Keywords** | `Business Context → Target Keywords` | ✅ Extracted |
| **Competitor Keywords** | `Business Context → Competitor Keywords` | ✅ Extracted |
| **Marketing Goals** | `Business Context → Marketing Goals` | ✅ **NEWLY ADDED** |

## ❌ NOT Extracted (Classification Fields)

| UI Form Field | Reason | Recommendation |
|--------------|--------|----------------|
| **GTM Playbook** | This is a **classification**, not data extracted from a website. It requires AI analysis of ICP, products, and countries to determine the GTM motion (sales-led, PLG, hybrid, etc.). | **Remove from website analysis form** - Handle via separate GTM classification service (already exists in codebase) |
| **Product Type** | This is a **classification**, not data extracted from a website. It requires AI analysis to categorize (devtools, sales_marketing, fintech, etc.). | **Remove from website analysis form** - Handle via separate GTM classification service (already exists in codebase) |

## Summary

- **12/14 fields covered** (86% coverage)
- **2 fields are classifications** (not extractable from website content)
- **Marketing Goals** has been added to the extraction prompt

## Recommendations

1. ✅ **Keep all 12 extractable fields** - They're all useful and extractable from websites
2. ❌ **Remove GTM Playbook and Product Type** from the website analysis form - These should be:
   - Auto-classified after website analysis completes (using existing GTM classification service)
   - Or handled in a separate "GTM Classification" section of the UI
3. ✅ **Marketing Goals** extraction is now included - Will extract goals like "Generate qualified leads", "Increase brand awareness", etc. from website content

## Next Steps

1. Update UI form to remove GTM Playbook and Product Type from website analysis
2. Add auto-classification trigger after website analysis completes
3. Test Marketing Goals extraction with real websites
