/**
 * Website Analyzer Service
 * Analyzes company websites and extracts structured data using Google Gemini AI
 * Supports multiple analysis modes: business_context, seo, competitor, company_intelligence, full, custom
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Analysis mode definitions
export const ANALYSIS_MODES = {
  business_context: {
    name: 'Business Context',
    description: 'Extract business context variables for GTM and content generation',
    fields: [
      'tone',
      'targetCountries',
      'productDescription',
      'competitors',
      'targetIndustries',
      'complianceFlags',
      'icp',
      'countries',
      'products',
      'targetKeywords',
      'competitorKeywords',
    ],
  },
  seo: {
    name: 'SEO Analysis',
    description: 'Extract SEO-related information: keywords, meta tags, content structure',
    fields: [
      'metaTitle',
      'metaDescription',
      'primaryKeywords',
      'secondaryKeywords',
      'contentStructure',
      'headings',
      'internalLinks',
      'externalLinks',
    ],
  },
  competitor: {
    name: 'Competitor Analysis',
    description: 'Focus on competitor information and positioning',
    fields: [
      'competitors',
      'competitorKeywords',
      'marketPosition',
      'differentiators',
      'pricingModel',
      'targetAudience',
      'valueProposition',
    ],
  },
  company_intelligence: {
    name: 'Company Intelligence',
    description: 'Extract comprehensive company data: imprint, team, contact info, legal details',
    fields: [
      'companyName',
      'legalName',
      'foundedYear',
      'headquarters',
      'locations',
      'teamSize',
      'teamMembers',
      'founders',
      'executives',
      'contactEmail',
      'contactPhone',
      'address',
      'imprint',
      'legalEntity',
      'vatNumber',
      'registrationNumber',
      'socialMedia',
      'linkedin',
      'twitter',
      'github',
      'crunchbase',
      'funding',
      'investors',
      'companyType',
      'industry',
      'description',
      'mission',
      'values',
      'culture',
      'careersPage',
    ],
  },
  full: {
    name: 'Full Analysis',
    description: 'Comprehensive analysis including all available fields',
    fields: 'all',
  },
  custom: {
    name: 'Custom Analysis',
    description: 'Extract only specified custom fields',
    fields: [],
  },
} as const;

export type AnalysisMode = keyof typeof ANALYSIS_MODES;

// System prompts for different modes
const BUSINESS_CONTEXT_PROMPT = `You are an expert at analyzing company websites and extracting business context.

Given a website's HTML content, extract the following information:

**Context Variables:**
1. **Tone**: The communication style/tone used on the website (e.g., "Professional", "Friendly", "Technical", "Casual", "Formal")
2. **Target Countries**: Countries or regions the company targets (comma-separated string, e.g., "US, UK, Canada")
3. **Product Description**: A brief description of the main product or service (2-3 sentences max)
4. **Competitors**: Any competitors mentioned or implied (comma-separated string, e.g., "Salesforce, HubSpot")
5. **Target Industries**: Industries or sectors the company targets (comma-separated string, e.g., "SaaS, Technology, Sales")
6. **Compliance Flags**: Any compliance certifications or standards mentioned (comma-separated string, e.g., "SOC2, GDPR")

**Business Context:**
7. **ICP (Ideal Customer Profile)**: Describe the ideal customer based on website content - company size, industry, pain points, etc. (2-3 sentences)
8. **Countries**: Array of specific countries/regions mentioned (e.g., ["United States", "United Kingdom", "Canada"])
9. **Products**: Array of product names or service offerings mentioned (e.g., ["CRM", "Marketing Automation", "Sales Analytics"])
10. **Target Keywords**: Array of key terms/phrases the company seems to target (e.g., ["crm software", "sales automation", "lead management"])
11. **Competitor Keywords**: Array of competitor names or brands mentioned (e.g., ["Salesforce", "HubSpot", "Pipedrive"])

Return ONLY a valid JSON object with these fields. If a field cannot be determined, omit it or set arrays to empty arrays [].`;

const SEO_PROMPT = `You are an SEO expert analyzing a website. Extract the following SEO-related information:

1. **Meta Title**: The main title tag (if present)
2. **Meta Description**: The meta description tag (if present)
3. **Primary Keywords**: Main keywords the site targets (array)
4. **Secondary Keywords**: Supporting keywords (array)
5. **Content Structure**: Overview of content organization
6. **Headings**: Main headings structure (H1, H2, H3)
7. **Internal Links**: Key internal linking patterns
8. **External Links**: Notable external links mentioned

Return ONLY a valid JSON object with these fields.`;

const COMPETITOR_PROMPT = `You are a competitive intelligence expert. Analyze the website and extract competitor information:

1. **Competitors**: Competitors mentioned or implied (comma-separated string)
2. **Competitor Keywords**: Competitor brand names mentioned (array)
3. **Market Position**: How the company positions itself in the market
4. **Differentiators**: Key differentiators mentioned
5. **Pricing Model**: Pricing information or model mentioned
6. **Target Audience**: Target audience description
7. **Value Proposition**: Main value proposition statement

Return ONLY a valid JSON object with these fields.`;

const COMPANY_INTELLIGENCE_PROMPT = `You are an expert at extracting comprehensive company intelligence from websites.

Extract the following information:

**Company Basics:**
1. **companyName**: The company's trading/brand name
2. **legalName**: Full legal entity name (if different from brand name)
3. **foundedYear**: Year the company was founded (if mentioned)
4. **headquarters**: Main headquarters location (city, country)
5. **locations**: Array of all office locations mentioned (e.g., ["San Francisco, USA", "London, UK"])
6. **companyType**: Type of company (e.g., "Private", "Public", "Startup", "Enterprise")
7. **industry**: Primary industry or sector

**Team Information:**
8. **teamSize**: Approximate team size (if mentioned, e.g., "50-100", "100+")
9. **teamMembers**: Array of team member names and roles found on "About", "Team", or "People" pages (e.g., [{"name": "John Doe", "role": "CEO"}, {"name": "Jane Smith", "role": "CTO"}])
10. **founders**: Array of founder names (e.g., ["John Doe", "Jane Smith"])
11. **executives**: Array of executive/C-suite members (e.g., [{"name": "John Doe", "title": "CEO"}])

**Contact & Legal:**
12. **contactEmail**: Main contact email address
13. **contactPhone**: Main contact phone number
14. **address**: Physical address (street, city, country)
15. **imprint**: Legal imprint information (common in EU websites - includes legal entity, address, registration details)
16. **legalEntity**: Legal entity type and structure (e.g., "GmbH", "Inc.", "Ltd.", "LLC")
17. **vatNumber**: VAT/TAX ID number (if mentioned)
18. **registrationNumber**: Company registration number (if mentioned)

**Social Media & Online Presence:**
19. **socialMedia**: Object with social media links (e.g., {"linkedin": "url", "twitter": "url", "facebook": "url", "instagram": "url"})
20. **linkedin**: LinkedIn company page URL
21. **twitter**: Twitter/X handle or URL
22. **github**: GitHub organization URL (if applicable)
23. **crunchbase**: Crunchbase profile URL (if mentioned)

**Company Details:**
24. **funding**: Funding information if mentioned (e.g., "Series A, $5M", "Bootstrapped", "Seed Round")
25. **investors**: Array of investor names or firms (if mentioned)
26. **description**: Company description/overview (2-3 sentences)
27. **mission**: Company mission statement (if present)
28. **values**: Company values or principles (array)
29. **culture**: Company culture description (if mentioned)
30. **careersPage**: URL to careers/jobs page (if present)

Return ONLY a valid JSON object with these fields. If a field cannot be determined, omit it or set arrays to empty arrays [].`;

const FULL_PROMPT = `You are a comprehensive business analyst. Extract ALL available information from the website:

**Business Context:**
- Tone, Target Countries, Product Description, Competitors, Target Industries, Compliance Flags
- ICP, Countries, Products, Target Keywords, Competitor Keywords

**SEO Information:**
- Meta Title, Meta Description, Primary Keywords, Secondary Keywords, Content Structure, Headings

**Competitive Intelligence:**
- Market Position, Differentiators, Pricing Model, Target Audience, Value Proposition

**Company Intelligence:**
- Company Name, Legal Name, Founded Year, Headquarters, Locations, Company Type, Industry
- Team Size, Team Members, Founders, Executives
- Contact Email, Contact Phone, Address, Imprint, Legal Entity, VAT Number, Registration Number
- Social Media Links (LinkedIn, Twitter, GitHub, Crunchbase), Funding, Investors
- Description, Mission, Values, Culture, Careers Page

Return ONLY a valid JSON object with all available fields.`;

function getPromptForMode(
  mode: AnalysisMode,
  customFields?: string[]
): string {
  switch (mode) {
    case 'business_context':
      return BUSINESS_CONTEXT_PROMPT;
    case 'seo':
      return SEO_PROMPT;
    case 'competitor':
      return COMPETITOR_PROMPT;
    case 'company_intelligence':
      return COMPANY_INTELLIGENCE_PROMPT;
    case 'full':
      return FULL_PROMPT;
    case 'custom':
      if (!customFields || customFields.length === 0) {
        return BUSINESS_CONTEXT_PROMPT;
      }
      const fieldsDesc = customFields.map((f) => `**${f}**`).join(', ');
      return `You are an expert at analyzing company websites. Extract the following custom fields:

${fieldsDesc}

Return ONLY a valid JSON object with these fields. If a field cannot be determined, omit it or set arrays to empty arrays [].`;
    default:
      return BUSINESS_CONTEXT_PROMPT;
  }
}

function getFieldsForMode(
  mode: AnalysisMode,
  customFields?: string[]
): string[] | 'all' {
  if (mode === 'full') {
    return 'all';
  }
  if (mode === 'custom') {
    return customFields || [];
  }
  return ANALYSIS_MODES[mode].fields as string[];
}

function cleanResponse(
  parsed: Record<string, any>,
  expectedFields: string[] | 'all'
): Record<string, any> {
  const result: Record<string, any> = {};

  if (expectedFields === 'all') {
    // Full mode - return all fields found
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim()) {
        result[key] = value.trim();
      } else if (Array.isArray(value)) {
        const cleaned = value
          .filter((item) => typeof item === 'string' && item.trim())
          .map((item: string) => item.trim());
        if (cleaned.length > 0) {
          result[key] = cleaned;
        }
      } else if (value !== null && value !== undefined) {
        result[key] = value;
      }
    }
  } else {
    // Specific mode - only return requested fields
    for (const field of expectedFields) {
      if (field in parsed) {
        const value = parsed[field];
        if (typeof value === 'string' && value.trim()) {
          result[field] = value.trim();
        } else if (Array.isArray(value)) {
          const cleaned = value
            .filter((item) => typeof item === 'string' && item.trim())
            .map((item: string) => item.trim());
          if (cleaned.length > 0) {
            result[field] = cleaned;
          }
        } else if (value !== null && value !== undefined) {
          result[field] = value;
        }
      }
    }
  }

  return result;
}

/**
 * Normalize and validate URL
 */
function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new Error('URL is required and must be a non-empty string');
  }

  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }

  try {
    const urlObj = new URL(normalized);
    if (!urlObj.hostname) {
      throw new Error('Invalid URL format: missing domain');
    }
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL scheme: only http and https are allowed');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid URL format: ${error.message}`);
    }
    throw new Error('Invalid URL format');
  }

  return normalized;
}

/**
 * Fetch HTML content from URL
 */
async function fetchHtml(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch URL: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();
    if (!html || html.length === 0) {
      throw new Error('No content retrieved from URL');
    }

    return html;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error('Connection timed out. The website took too long to respond.');
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('ENOTFOUND')) {
        throw new Error('Domain not found. Please check the URL is correct.');
      }
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error('Connection refused. The website may be down or blocking requests.');
      }
      throw error;
    }
    throw new Error('Failed to fetch website content');
  }
}

export interface AnalyzeWebsiteOptions {
  url: string;
  mode?: AnalysisMode;
  customFields?: string[];
  useGoogleSearch?: boolean; // Note: Gemini can access URLs directly, but we'll use HTML fetch for now
  maxContentLength?: number;
}

/**
 * Analyze a website URL and extract structured data
 */
export async function analyzeWebsite(
  options: AnalyzeWebsiteOptions
): Promise<Record<string, any>> {
  const {
    url,
    mode = 'business_context',
    customFields,
    useGoogleSearch = false, // For now, we'll fetch HTML directly
    maxContentLength = 50000,
  } = options;

  // Validate API key
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY not found in environment');
  }

  // Validate mode
  const validModes: AnalysisMode[] = [
    'business_context',
    'seo',
    'competitor',
    'full',
    'company_intelligence',
    'custom',
  ];
  if (!validModes.includes(mode)) {
    throw new Error(`Invalid mode. Must be one of: ${validModes.join(', ')}`);
  }

  // Validate custom_fields for custom mode
  if (mode === 'custom' && (!customFields || !Array.isArray(customFields) || customFields.length === 0)) {
    throw new Error("customFields parameter is required when mode='custom'");
  }

  // Normalize URL
  const normalizedUrl = normalizeUrl(url);

  // Get prompt and expected fields
  const systemPrompt = getPromptForMode(mode, customFields);
  const expectedFields = getFieldsForMode(mode, customFields);

  // Fetch HTML content
  let htmlContent = '';
  try {
    htmlContent = await fetchHtml(normalizedUrl);
  } catch (error) {
    throw error; // Re-throw fetch errors
  }

  // Truncate HTML if needed
  const truncatedHtml = htmlContent.slice(0, maxContentLength);

  // Build extraction prompt
  const extractionPrompt = `${systemPrompt}

---

Website URL: ${normalizedUrl}

Website HTML Content:
${truncatedHtml}

${useGoogleSearch ? 'Analyze this website content and use web search to find additional information about this company, their products, competitors, and market position. Then extract the requested information and return JSON.' : 'Extract the requested information from the website content and return JSON.'}`;

  // Call Gemini API
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp', // Use latest model with URL access capability
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: extractionPrompt }] }],
      systemInstruction: 'You are an expert business analyst. Extract structured data from the website content and return ONLY valid JSON.',
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    const response = await result.response;
    let responseText = response.text();

    // Clean markdown code blocks if present
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```/g, '').trim();
    }

    // Parse JSON response
    let extractedData: Record<string, any>;
    try {
      extractedData = JSON.parse(responseText);
      if (typeof extractedData !== 'object' || Array.isArray(extractedData)) {
        throw new Error('Response is not a JSON object');
      }
    } catch (parseError) {
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
    }

    // Clean and validate response
    const cleanedResult = cleanResponse(extractedData, expectedFields);

    // Add metadata
    cleanedResult._metadata = {
      mode,
      url: normalizedUrl,
    };

    return cleanedResult;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to analyze website: ${error.message}`);
    }
    throw new Error('Failed to analyze website: Unknown error');
  }
}

