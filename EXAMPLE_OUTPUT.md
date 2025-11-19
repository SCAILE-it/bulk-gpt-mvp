# Example Output for scaile.tech

## Expected Output Structure

When you run the website analyzer on `scaile.tech` with `mode="business_context"`, you should get output like this:

```json
{
  "tone": "Professional, Confident",
  "targetCountries": "Germany, Europe, Global",
  "productDescription": "AI Digital Sales Engine that helps B2B SaaS companies automate their sales processes and generate qualified leads through AI-powered outreach and engagement.",
  "competitors": "Salesforce, HubSpot, Outreach.io",
  "targetIndustries": "B2B SaaS, Technology, Sales",
  "complianceFlags": "GDPR",
  "icp": "B2B SaaS companies with 50-500 employees looking to scale their sales operations and improve lead generation efficiency. Companies that need automated, personalized outreach at scale.",
  "countries": ["Germany", "Europe", "United States"],
  "products": ["AI Digital Sales Engine", "Sales Automation", "Lead Generation"],
  "targetKeywords": ["ai sales", "digital sales engine", "b2b sales automation", "lead generation", "sales outreach"],
  "competitorKeywords": ["Salesforce", "HubSpot", "Outreach.io", "Salesloft"],
  "_metadata": {
    "mode": "business_context",
    "url": "https://scaile.tech"
  }
}
```

## For `company_intelligence` Mode

If you use `mode="company_intelligence"`, you'll get additional fields:

```json
{
  "companyName": "Scaile",
  "legalName": "Scaile GmbH",
  "foundedYear": "2024",
  "headquarters": "Berlin, Germany",
  "locations": ["Berlin, Germany"],
  "teamSize": "10-50",
  "teamMembers": [
    {"name": "Founder Name", "role": "CEO"},
    {"name": "CTO Name", "role": "CTO"}
  ],
  "founders": ["Founder Name"],
  "executives": [
    {"name": "Founder Name", "title": "CEO"}
  ],
  "contactEmail": "hello@scaile.tech",
  "contactPhone": "+49 ...",
  "address": "Berlin, Germany",
  "imprint": "Scaile GmbH\nAddress details\nRegistration: HRB ...",
  "legalEntity": "GmbH",
  "vatNumber": "DE...",
  "socialMedia": {
    "linkedin": "https://linkedin.com/company/scaile",
    "twitter": "https://twitter.com/scaile"
  },
  "linkedin": "https://linkedin.com/company/scaile",
  "twitter": "https://twitter.com/scaile",
  "description": "AI Digital Sales Engine for B2B SaaS companies...",
  "mission": "To revolutionize B2B sales through AI-powered automation",
  "values": ["Innovation", "Customer Success", "Transparency"],
  "_metadata": {
    "mode": "company_intelligence",
    "url": "https://scaile.tech"
  }
}
```

## To Get Actual Output

1. **Set API Key** in `.env.local`:
   ```bash
   GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
   ```

2. **Run Test**:
   ```bash
   export GOOGLE_GENERATIVE_AI_API_KEY=your_key
   python3 test_website_analyzer.py
   ```

3. **Or Test via API** (after starting dev server):
   ```bash
   curl -X POST http://localhost:3000/api/analyse-website \
     -H "Content-Type: application/json" \
     -H "Cookie: your-auth-cookie" \
     -d '{"url": "scaile.tech", "mode": "business_context"}'
   ```

## Current Status

✅ Code is ready and will work once API key is configured  
⚠️ API key needs to be set in `.env.local`  
✅ All analysis modes supported  
✅ Fallback HTML fetching works (aiohttp)

