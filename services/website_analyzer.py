"""Website analyzer service - standalone version (no Modal, no v2 dependencies).

Analyzes company websites with configurable modes using Gemini AI.
Supports business_context, seo, competitor, company_intelligence, full, and custom analysis modes.
"""

import json
import logging
import os
from typing import Any, Dict, List, Literal, Optional
from urllib.parse import urlparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Analysis mode definitions
ANALYSIS_MODES = {
    "business_context": {
        "name": "Business Context",
        "description": "Extract business context variables for GTM and content generation",
        "fields": [
            "tone", "targetCountries", "productDescription", "competitors",
            "targetIndustries", "complianceFlags", "icp", "countries",
            "products", "targetKeywords", "competitorKeywords"
        ]
    },
    "seo": {
        "name": "SEO Analysis",
        "description": "Extract SEO-related information: keywords, meta tags, content structure",
        "fields": [
            "metaTitle", "metaDescription", "primaryKeywords", "secondaryKeywords",
            "contentStructure", "headings", "internalLinks", "externalLinks"
        ]
    },
    "competitor": {
        "name": "Competitor Analysis",
        "description": "Focus on competitor information and positioning",
        "fields": [
            "competitors", "competitorKeywords", "marketPosition", "differentiators",
            "pricingModel", "targetAudience", "valueProposition"
        ]
    },
    "full": {
        "name": "Full Analysis",
        "description": "Comprehensive analysis including all available fields",
        "fields": "all"
    },
    "company_intelligence": {
        "name": "Company Intelligence",
        "description": "Extract comprehensive company data: imprint, team, contact info, legal details",
        "fields": [
            "companyName", "legalName", "foundedYear", "headquarters", "locations",
            "teamSize", "teamMembers", "founders", "executives", "contactEmail",
            "contactPhone", "address", "imprint", "legalEntity", "vatNumber",
            "registrationNumber", "socialMedia", "linkedin", "twitter", "github",
            "crunchbase", "funding", "investors", "companyType", "industry",
            "description", "mission", "values", "culture", "careersPage"
        ]
    },
    "custom": {
        "name": "Custom Analysis",
        "description": "Extract only specified custom fields",
        "fields": []
    }
}

# System prompts for different modes
BUSINESS_CONTEXT_PROMPT = """You are an expert at analyzing company websites and extracting business context.

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

Return ONLY a valid JSON object with these fields. If a field cannot be determined, omit it or set arrays to empty arrays []."""

SEO_PROMPT = """You are an SEO expert analyzing a website. Extract the following SEO-related information:

1. **Meta Title**: The main title tag (if present)
2. **Meta Description**: The meta description tag (if present)
3. **Primary Keywords**: Main keywords the site targets (array)
4. **Secondary Keywords**: Supporting keywords (array)
5. **Content Structure**: Overview of content organization
6. **Headings**: Main headings structure (H1, H2, H3)
7. **Internal Links**: Key internal linking patterns
8. **External Links**: Notable external links mentioned

Return ONLY a valid JSON object with these fields."""

COMPETITOR_PROMPT = """You are a competitive intelligence expert. Analyze the website and extract competitor information:

1. **Competitors**: Competitors mentioned or implied (comma-separated string)
2. **Competitor Keywords**: Competitor brand names mentioned (array)
3. **Market Position**: How the company positions itself in the market
4. **Differentiators**: Key differentiators mentioned
5. **Pricing Model**: Pricing information or model mentioned
6. **Target Audience**: Target audience description
7. **Value Proposition**: Main value proposition statement

Return ONLY a valid JSON object with these fields."""

COMPANY_INTELLIGENCE_PROMPT = """You are an expert at extracting comprehensive company intelligence from websites.

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

Return ONLY a valid JSON object with these fields. If a field cannot be determined, omit it or set arrays to empty arrays []."""

FULL_PROMPT = """You are a comprehensive business analyst. Extract ALL available information from the website:

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

Return ONLY a valid JSON object with all available fields."""


def _get_prompt_for_mode(mode: str, custom_fields: Optional[List[str]] = None) -> str:
    """Get the appropriate system prompt based on analysis mode."""
    if mode == "business_context":
        return BUSINESS_CONTEXT_PROMPT
    elif mode == "seo":
        return SEO_PROMPT
    elif mode == "competitor":
        return COMPETITOR_PROMPT
    elif mode == "company_intelligence":
        return COMPANY_INTELLIGENCE_PROMPT
    elif mode == "full":
        return FULL_PROMPT
    elif mode == "custom":
        if not custom_fields:
            return BUSINESS_CONTEXT_PROMPT
        fields_desc = ", ".join([f"**{field}**" for field in custom_fields])
        return f"""You are an expert at analyzing company websites. Extract the following custom fields:

{fields_desc}

Return ONLY a valid JSON object with these fields. If a field cannot be determined, omit it or set arrays to empty arrays []."""
    else:
        return BUSINESS_CONTEXT_PROMPT


def _get_fields_for_mode(mode: str, custom_fields: Optional[List[str]] = None) -> List[str]:
    """Get the list of fields to extract based on analysis mode."""
    if mode == "business_context":
        return ANALYSIS_MODES["business_context"]["fields"]
    elif mode == "seo":
        return ANALYSIS_MODES["seo"]["fields"]
    elif mode == "competitor":
        return ANALYSIS_MODES["competitor"]["fields"]
    elif mode == "company_intelligence":
        return ANALYSIS_MODES["company_intelligence"]["fields"]
    elif mode == "full":
        return "all"
    elif mode == "custom":
        return custom_fields or []
    else:
        return ANALYSIS_MODES["business_context"]["fields"]


def _clean_response(parsed: Dict[str, Any], expected_fields: List[str]) -> Dict[str, Any]:
    """Clean and validate response based on expected fields."""
    result = {}
    
    if expected_fields == "all":
        # Full mode - return all fields found
        for key, value in parsed.items():
            if isinstance(value, str) and value.strip():
                result[key] = value.strip()
            elif isinstance(value, list):
                cleaned = [item.strip() for item in value if isinstance(item, str) and item.strip()]
                if cleaned:
                    result[key] = cleaned
            elif value is not None:
                result[key] = value
    else:
        # Specific mode - only return requested fields
        for field in expected_fields:
            if field in parsed:
                value = parsed[field]
                if isinstance(value, str) and value.strip():
                    result[field] = value.strip()
                elif isinstance(value, list):
                    cleaned = [item.strip() for item in value if isinstance(item, str) and item.strip()]
                    if cleaned:
                        result[field] = cleaned
                elif value is not None:
                    result[field] = value
    
    return result


async def analyze_website(
    url: str,
    mode: Literal["business_context", "seo", "competitor", "full", "company_intelligence", "custom"] = "business_context",
    custom_fields: Optional[List[str]] = None,
    use_google_search: bool = True,
    max_content_length: int = 50000,
) -> Dict[str, Any]:
    """Analyze a website URL and extract company context information.

    Standalone version - uses direct Gemini API calls (no v2 dependencies).

    Args:
        url: Website URL to analyze (e.g., "example.com" or "https://example.com")
        mode: Analysis mode (default: "business_context")
        custom_fields: List of custom field names to extract (required if mode="custom")
        use_google_search: Whether to use Google Search Grounding (default: True)
        max_content_length: Maximum characters of website content to analyze (default: 50000)

    Returns:
        Dictionary with extracted fields based on mode
    """
    try:
        import google.generativeai as genai
    except ImportError as e:
        raise ImportError(f"Missing required dependency: {e}. Install with: pip install google-generativeai")
    
    # Try crawl4ai, fallback to requests if not available
    try:
        from crawl4ai import AsyncWebCrawler
        USE_CRAWL4AI = True
    except ImportError:
        try:
            import aiohttp
            USE_CRAWL4AI = False
        except ImportError:
            raise ImportError("Missing required dependency: Install either 'crawl4ai' or 'aiohttp'. Recommended: pip install crawl4ai")

    # Get API key from environment
    api_key = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY") or os.environ.get("GOOGLE_AI_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_AI_API_KEY not found in environment")

    # Validate URL
    if not url or not isinstance(url, str) or not url.strip():
        raise ValueError("URL is required and must be a non-empty string")
    
    # Normalize and validate URL format
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    
    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            raise ValueError("Invalid URL format: missing domain")
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Invalid URL scheme: only http and https are allowed")
    except Exception as e:
        logger.warning(f"Invalid URL: {url}, error: {e}")
        raise ValueError(f"Invalid URL format: {str(e)}")

    # Validate mode
    valid_modes = ["business_context", "seo", "competitor", "full", "company_intelligence", "custom"]
    if mode not in valid_modes:
        raise ValueError(f"Invalid mode. Must be one of: {', '.join(valid_modes)}")

    # Validate custom_fields for custom mode
    if mode == "custom" and (not custom_fields or not isinstance(custom_fields, list) or len(custom_fields) == 0):
        raise ValueError("custom_fields parameter is required when mode='custom'")

    # Build extraction prompt
    system_prompt = _get_prompt_for_mode(mode, custom_fields)
    expected_fields = _get_fields_for_mode(mode, custom_fields)
    
    logger.info(f"Starting website analysis: url={url}, mode={mode}, use_google_search={use_google_search}")
    
    # Fetch HTML content
    try:
        logger.debug(f"Fetching HTML from: {url}")
        
        if USE_CRAWL4AI:
            # Use crawl4ai for JS-rendered pages
            async with AsyncWebCrawler(verbose=False, headless=True, browser_type="chromium") as crawler:
                crawl_result = await crawler.arun(
                    url=url,
                    bypass_cache=True,
                    timeout=30,
                    wait_for="networkidle",
                    delay_before_return_html=2.0,
                    js_code=["window.scrollTo(0, document.body.scrollHeight);"],
                )
                
                if not crawl_result.success:
                    error_msg = "Failed to access the URL. Please check that the URL is valid and accessible."
                    if "ERR_NAME_NOT_RESOLVED" in str(crawl_result.error_message):
                        error_msg = "Domain not found. Please check the URL is correct."
                    elif "ERR_CONNECTION_REFUSED" in str(crawl_result.error_message):
                        error_msg = "Connection refused. The website may be down or blocking requests."
                    elif "ERR_CONNECTION_TIMED_OUT" in str(crawl_result.error_message):
                        error_msg = "Connection timed out. The website took too long to respond."
                    logger.error(f"Failed to fetch HTML: {url}, error: {crawl_result.error_message}")
                    raise ValueError(error_msg)
                
                html_content = crawl_result.markdown or crawl_result.html or ""
        else:
            # Fallback: use aiohttp for simple HTML fetching (no JS rendering)
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status != 200:
                        raise ValueError(f"Failed to fetch URL: HTTP {response.status}")
                    html_content = await response.text()
        
        if not html_content:
            logger.error(f"No content retrieved from URL: {url}")
            raise ValueError("No content retrieved from URL")
        
        logger.debug(f"HTML fetched: {url}, content_length={len(html_content)}")
    except Exception as e:
        logger.error(f"Exception during HTML fetch: {url}, error: {str(e)}", exc_info=True)
        raise

    # Use Gemini API for analysis
    try:
        logger.debug(f"Starting Gemini analysis: {url}")
        genai.configure(api_key=api_key)
        
        extraction_prompt = f"""{system_prompt}

---

Website URL: {url}

Website HTML Content:
{html_content[:max_content_length]}

{"Analyze this website content and use web search to find additional information about this company, their products, competitors, and market position. Then extract the requested information and return JSON." if use_google_search else "Extract the requested information from the website content and return JSON."}"""

        # Try new API first (v0.2.0+)
        try:
            from google.generativeai import GenerativeModel
            try:
                model = GenerativeModel('gemini-2.0-flash-exp')
            except:
                model = GenerativeModel('gemini-1.5-flash')
            
            generation_config = {
                "temperature": 0,
                "max_output_tokens": 8192,
                "response_mime_type": "application/json",
            }
            
            if use_google_search:
                try:
                    response = model.generate_content(
                        extraction_prompt,
                        generation_config=generation_config,
                        tools=[{"google_search": {}}] if hasattr(genai, 'types') else None,
                    )
                except:
                    logger.warning("Grounding not available, falling back to standard generation")
                    response = model.generate_content(extraction_prompt, generation_config=generation_config)
            else:
                response = model.generate_content(extraction_prompt, generation_config=generation_config)
            
            response_text = response.text.strip()
        except (ImportError, AttributeError):
            # Old API (v0.1.0rc1) - use generate_text with direct REST API call
            logger.debug("Using legacy API - trying REST API directly")
            try:
                import requests
                import json as json_lib
                
                # Use REST API directly for newer API keys
                api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                
                payload = {
                    "contents": [{
                        "parts": [{"text": extraction_prompt}]
                    }],
                    "generationConfig": {
                        "temperature": 0,
                        "maxOutputTokens": 8192,
                        "responseMimeType": "application/json"
                    }
                }
                
                response = requests.post(api_url, json=payload, timeout=30)
                response.raise_for_status()
                
                result = response.json()
                if 'candidates' in result and len(result['candidates']) > 0:
                    candidate = result['candidates'][0]
                    if 'content' in candidate and 'parts' in candidate['content']:
                        response_text = candidate['content']['parts'][0].get('text', '').strip()
                    else:
                        raise ValueError("Unexpected response format from Gemini API")
                else:
                    raise ValueError("No candidates in Gemini API response")
                    
            except ImportError:
                # Fallback to old generate_text API
                try:
                    model_name = 'models/gemini-1.5-flash'
                    response = genai.generate_text(
                        model=model_name,
                        prompt=extraction_prompt,
                        temperature=0,
                        max_output_tokens=8192,
                    )
                    response_text = response.result.strip() if hasattr(response, 'result') else str(response).strip()
                except Exception as e:
                    logger.error(f"Legacy API failed: {e}")
                    raise ValueError(f"Failed to generate content with Gemini API: {str(e)}")
            except Exception as e:
                logger.error(f"REST API failed: {e}")
                raise ValueError(f"Failed to generate content with Gemini API: {str(e)}")

        # Parse response
        
        # Clean markdown code blocks
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        elif response_text.startswith("```"):
            response_text = response_text.replace("```", "").strip()
        
        try:
            extracted_data = json.loads(response_text)
            if not isinstance(extracted_data, dict):
                logger.error(f"Invalid response type: {url}, response_type={type(extracted_data).__name__}")
                raise ValueError("Response is not a JSON object")
            logger.debug(f"Gemini analysis success: {url}, fields_extracted={len(extracted_data)}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {url}, error={str(e)}, response_preview={response_text[:200]}")
            raise ValueError(f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        logger.error(f"Exception during Gemini analysis: {url}, error={str(e)}", exc_info=True)
        raise

    # Clean and validate response
    try:
        cleaned_result = _clean_response(extracted_data, expected_fields)
        
        # Add metadata
        cleaned_result["_metadata"] = {
            "mode": mode,
            "url": url,
        }
        
        logger.info(f"Website analysis success: {url}, mode={mode}, fields_returned={len(cleaned_result)}")
        return cleaned_result
    except Exception as e:
        logger.error(f"Error during response cleanup: {url}, error={str(e)}", exc_info=True)
        raise

