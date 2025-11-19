# Bulk Agent Context Field Recommendations

## Current Context Fields (Already Implemented)

The bulk agent currently uses these context variables from `useContextStorage()`:

1. **tone** - Writing style/voice
2. **targetCountries** - Geographic markets
3. **productDescription** - Product/service overview
4. **competitors** - Main competitors
5. **targetIndustries** - Target industries
6. **complianceFlags** - Compliance standards

These are injected into prompts via `{{context.variableName}}` syntax and sent as a formatted string to the API.

---

## Recommended Additional Context Fields

### 🎯 **High Priority - Directly Impact Content Quality**

#### 1. **Value Proposition** ✅ (Already extracted from website)
- **Why**: Core messaging that should appear in all bulk content
- **Use Case**: "Our product helps {{context.valueProposition}}"
- **Example**: "We replace manual outreach with AI-powered sales automation"

#### 2. **ICP (Ideal Customer Profile)** ✅ (Already extracted)
- **Why**: Helps personalize content for target audience
- **Use Case**: "Write for {{context.icp}}"
- **Example**: "B2B SaaS companies with 50-500 employees seeking sales automation"

#### 3. **Marketing Goals** ✅ (Already extracted)
- **Why**: Aligns content with campaign objectives
- **Use Case**: "Content should support {{context.marketingGoals}}"
- **Example**: ["Generate qualified leads", "Increase brand awareness"]

#### 4. **Company Name** ✅ (Should be extracted)
- **Why**: Personalization and branding
- **Use Case**: "From {{context.companyName}}"
- **Example**: "SCAILE Technologies"

#### 5. **Company Website** ✅ (Should be extracted)
- **Why**: Reference in content, credibility
- **Use Case**: "Visit {{context.companyWebsite}}"
- **Example**: "https://scaile.tech"

---

### 📧 **Medium Priority - Enhance Personalization**

#### 6. **Call-to-Action (CTA)**
- **Why**: Consistent CTAs across bulk content
- **Use Case**: "End with {{context.cta}}"
- **Example**: "Book a demo", "Start free trial", "Download guide"
- **Type**: String or dropdown (common CTAs)

#### 7. **Offer/Promotion Details**
- **Why**: Campaign-specific offers
- **Use Case**: "Mention {{context.offer}}"
- **Example**: "20% off first month", "Free consultation", "Limited-time discount"
- **Type**: Text field

#### 8. **Campaign Name/Purpose**
- **Why**: Context for content generation
- **Use Case**: "This is for {{context.campaignName}} campaign"
- **Example**: "Q1 Product Launch", "Holiday Promotion", "Webinar Follow-up"
- **Type**: Text field

#### 9. **Content Length Preference**
- **Why**: Control output length
- **Use Case**: "Generate {{context.contentLength}} content"
- **Example**: "short" (50-100 words), "medium" (100-200), "long" (200+)
- **Type**: Dropdown

#### 10. **Output Format/Style**
- **Why**: Consistent formatting
- **Use Case**: "Format as {{context.outputFormat}}"
- **Example**: "email", "linkedin_message", "bio", "summary", "bullet_points"
- **Type**: Dropdown

---

### 🎨 **Lower Priority - Brand & Guidelines**

#### 11. **Brand Voice Guidelines**
- **Why**: Brand consistency
- **Use Case**: "Follow {{context.brandVoice}}"
- **Example**: "Professional but friendly", "Technical and precise", "Casual and conversational"
- **Type**: Textarea (can overlap with tone, but more detailed)

#### 12. **Do's and Don'ts**
- **Why**: Avoid mistakes, ensure compliance
- **Use Case**: "Avoid {{context.donts}} and emphasize {{context.dos}}"
- **Example**: 
  - Do's: "Mention ROI", "Use data points"
  - Don'ts: "Don't use jargon", "Don't make claims without proof"
- **Type**: Two textareas

#### 13. **Industry-Specific Terminology**
- **Why**: Use correct jargon for target industry
- **Use Case**: "Use {{context.industryTerminology}}"
- **Example**: "SaaS: MRR, churn, CAC", "Healthcare: HIPAA, EHR, patient outcomes"
- **Type**: Textarea

#### 14. **Key Messaging Points**
- **Why**: Ensure important points are included
- **Use Case**: "Always mention {{context.keyMessages}}"
- **Example**: ["AI-powered", "GDPR compliant", "Enterprise-ready"]
- **Type**: Array of strings (like products)

#### 15. **Social Proof/Testimonials**
- **Why**: Add credibility to bulk content
- **Use Case**: "Include {{context.socialProof}}"
- **Example**: "Trusted by 500+ companies", "4.9/5 rating", "Featured in TechCrunch"
- **Type**: Textarea

---

### 🔗 **Contact & Reference Fields**

#### 16. **Contact Email** ✅ (Already extracted)
- **Why**: Include in outreach content
- **Use Case**: "Contact us at {{context.contactEmail}}"

#### 17. **Contact Phone** ✅ (Already extracted)
- **Why**: Include in outreach content
- **Use Case**: "Call us at {{context.contactPhone}}"

#### 18. **LinkedIn URL** ✅ (Already extracted)
- **Why**: Reference in professional content
- **Use Case**: "Connect on {{context.linkedinUrl}}"

#### 19. **Company Address** ✅ (Already extracted)
- **Why**: Location context for local businesses
- **Use Case**: "Based in {{context.address}}"

---

### 📊 **GTM-Specific Context**

#### 20. **GTM Playbook** ✅ (Already extracted)
- **Why**: Adjust content style based on GTM motion
- **Use Case**: "For {{context.gtmPlaybook}} motion, focus on..."
- **Example**: "sales_led" → focus on ROI, "plg" → focus on self-service

#### 21. **Product Type** ✅ (Already extracted)
- **Why**: Industry-specific messaging
- **Use Case**: "As a {{context.productType}} company..."

---

## Implementation Priority

### Phase 1: High Impact, Easy Implementation ✅
- Value Proposition (already extracted)
- ICP (already extracted)
- Marketing Goals (already extracted)
- Company Name (extract from website)
- Company Website (extract from website)

### Phase 2: User-Configurable Fields
- CTA (dropdown)
- Offer/Promotion (text)
- Campaign Name (text)
- Content Length (dropdown)
- Output Format (dropdown)

### Phase 3: Advanced Brand Guidelines
- Brand Voice Guidelines (textarea)
- Do's and Don'ts (two textareas)
- Industry Terminology (textarea)
- Key Messaging Points (array)
- Social Proof (textarea)

---

## Recommended Form Structure

### **Core Business Context** (Auto-extracted from website)
- Company Name
- Company Website
- Value Proposition
- ICP
- Marketing Goals
- Tone
- Target Countries
- Products
- Product Description

### **GTM Classification** (Auto-classified)
- GTM Playbook (dropdown)
- Product Type (dropdown)

### **Campaign Context** (User-configured per campaign)
- Campaign Name
- CTA
- Offer/Promotion
- Content Length
- Output Format

### **Brand Guidelines** (User-configured once)
- Brand Voice Guidelines
- Do's and Don'ts
- Industry Terminology
- Key Messaging Points
- Social Proof

### **Contact & Legal** (Auto-extracted)
- Contact Email
- Contact Phone
- LinkedIn URL
- Company Address
- Legal Entity
- VAT Number

---

## Usage Examples

### Example 1: Bulk Email Outreach
```
Prompt: "Write a personalized email to {{name}} at {{company}}"

Context Used:
- tone: Professional, friendly
- valueProposition: AI-powered sales automation
- icp: B2B SaaS companies with 50-500 employees
- cta: Book a demo
- companyName: SCAILE
- companyWebsite: https://scaile.tech
- contactEmail: info@scaile.tech
```

### Example 2: LinkedIn Message
```
Prompt: "Write a LinkedIn connection message for {{name}}"

Context Used:
- tone: Professional, casual
- valueProposition: AI-powered sales automation
- linkedinUrl: https://linkedin.com/company/scaile
- cta: Let's connect
- contentLength: short
- outputFormat: linkedin_message
```

### Example 3: Company Bio
```
Prompt: "Write a company bio for {{company}}"

Context Used:
- companyName: SCAILE
- productDescription: AI-powered go-to-market machines
- targetIndustries: B2B SaaS, Technology
- socialProof: Trusted by 500+ companies
- keyMessages: ["AI-powered", "GDPR compliant"]
```

---

## Next Steps

1. ✅ **Add extracted fields to context** (Value Proposition, ICP, Marketing Goals, Company Name, Website)
2. ✅ **Add contact fields** (Email, Phone, LinkedIn URL)
3. 🔄 **Add campaign context fields** (CTA, Offer, Campaign Name, Content Length, Output Format)
4. 🔄 **Add brand guidelines section** (Do's/Don'ts, Brand Voice, Terminology)
5. 🔄 **Update BulkProcessor to use new context fields**

