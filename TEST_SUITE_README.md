# Comprehensive Output Quality & Performance Test Suite

## Overview

Production-grade test suite for validating output quality, performance, and stress testing of the Bulk GPT application.

## Features

### ✅ Test Coverage

1. **23 Different Test Scenarios**
   - Simple text analysis
   - AI-optimized prompts
   - Complex multi-column outputs
   - Product descriptions & SEO
   - Employee profiles & assessments
   - Customer segmentation & personalization
   - Tool integration (web search, etc.)

2. **Multiple CSV Files (16 total)**
   - `public/examples/sample-input.csv` - Basic person data (3 rows)
   - `test-data/products.csv` - Product catalog (10 rows)
   - `test-data/products-large.csv` - Large product catalog (20 rows)
   - `test-data/employees.csv` - Employee database (10 rows)
   - `test-data/customers.csv` - Customer data (10 rows)
   - `test-data/articles.csv` - Article/blog posts (10 rows)
   - `test-data/reviews.csv` - Product reviews (10 rows)
   - `test-data/companies.csv` - Company database (10 rows)
   - `test-data/events.csv` - Event listings (10 rows)
   - `test-data/invoices.csv` - Invoice records (10 rows)
   - `test-data/contacts.csv` - Contact database (10 rows)
   - `test-data/special-chars.csv` - Special characters test (10 rows)
   - `test-data/minimal.csv` - Minimal data test (3 rows)
   - `test-data/mixed-types.csv` - Mixed data types (5 rows)
   - `test-data/empty-fields.csv` - Empty fields handling (10 rows)

3. **Dual Testing Methods**
   - **API Tests (Headless)**: Direct API calls for speed
   - **UI Tests**: End-to-end browser automation

4. **Performance Metrics**
   - Optimization duration (AI processing time)
   - Processing duration (batch creation)
   - Poll duration (time to completion)
   - Total duration (end-to-end)
   - Rows per second throughput

5. **Output Quality Analysis**
   - Column completeness validation
   - Output length analysis
   - Quality scoring (0-100)
   - Issue identification per row

6. **Stress Testing**
   - Concurrent requests (10 simultaneous)
   - Large file processing (50 rows)
   - Rate limit handling
   - Error recovery

## Usage

### Quick Test (Recommended First)
Fast validation test (~30 seconds):
```bash
node test-quick-api.js
```

### Using Test Runner Script
```bash
# Quick test
./test-runner.sh quick

# Full comprehensive suite
./test-runner.sh full

# Stress tests only
./test-runner.sh stress
```

### Full Test Suite
```bash
# Run first 5 scenarios (default)
node test-comprehensive-output-quality.js

# Run all scenarios
TEST_ALL=true node test-comprehensive-output-quality.js
```

### With Custom Configuration
```bash
TEST_URL=https://your-app.vercel.app \
TEST_EMAIL=your@email.com \
TEST_PASSWORD=yourpassword \
node test-comprehensive-output-quality.js
```

### Output
- Results are logged to console
- Full runs save to `test-results-YYYYMMDD-HHMMSS.log`
- Quick test shows immediate results

## Test Scenarios

### Sample Input Tests
1. **Simple Text Analysis** - Basic prompt with manual columns
2. **AI-Optimized Simple** - AI selects columns and tools
3. **Complex Multi-Column** - Multiple output columns
4. **AI-Optimized Complex** - AI handles complex prompts

### Product Tests
5. **Product Descriptions** - E-commerce descriptions
6. **Product SEO Optimization** - SEO titles, meta descriptions
7. **AI Product Analysis** - AI-driven product insights

### Employee Tests
8. **Employee Profiles** - LinkedIn-style profiles
9. **Employee Skill Assessment** - Skills and training recommendations

### Customer Tests
10. **Customer Segmentation** - VIP/Regular/New segments
11. **Customer Personalization** - Personalized marketing messages

### Tool Tests
12. **With Tools - Web Search** - External tool integration

### Additional CSV File Tests
13. **Article Summarization** - Article/blog content processing
14. **Review Sentiment Analysis** - Product review analysis
15. **Company Profiles** - Company data enrichment
16. **Event Descriptions** - Event marketing copy
17. **Invoice Summaries** - Financial document processing
18. **Contact Enrichment** - Contact data enhancement
19. **Large Product Catalog** - Large dataset processing (20 rows)
20. **Special Characters Handling** - Unicode and special char handling
21. **Minimal Data** - Edge case with minimal columns
22. **Mixed Data Types** - Various data types (JSON, booleans, dates)
23. **Empty Fields Handling** - Missing data graceful handling

## Metrics Collected

- **API Tests**: Success rate, duration, optimization time, processing time
- **UI Tests**: Success rate, duration
- **Stress Tests**: Concurrent success rate, large file throughput
- **Quality Scores**: Output completeness, length, accuracy

## Expected Output

```
═══════════════════════════════════════════════════════
  COMPREHENSIVE OUTPUT QUALITY & PERFORMANCE TEST
═══════════════════════════════════════════════════════

🔐 Authenticating...
✓ Authentication successful

📡 API TESTS (Headless, Direct)
═══════════════════════════════════════════════════════

🧪 Test: Simple Text Analysis
  📄 CSV: 3 rows, 3 columns
  ⚡ Processing: 1234ms
  ✅ Completed: 3/3 rows
  ⏱️  Total duration: 45678ms (45.68s)
  📊 Quality Score: 95/100

...

═══════════════════════════════════════════════════════
  TEST SUMMARY
═══════════════════════════════════════════════════════

📡 API TESTS:
   Passed: 10/12
   Average Duration: 45.23s
   Average Quality Score: 92.5/100

🖥️  UI TESTS:
   Passed: 1/1
   Average Duration: 52.34s

🔥 STRESS TESTS:
   concurrent: 8/10 passed in 1495ms
   large_file: ✓ 50 rows in 2340ms (21.4 rows/sec)
```

## Notes

- Tests run sequentially to avoid rate limits
- Each test waits for batch completion (up to 5 minutes)
- Authentication is handled automatically (sign-in or sign-up)
- Results are analyzed for quality and completeness
- Stress tests validate system under load

## Files Created

- `test-comprehensive-output-quality.js` - Main test suite
- `test-data/products.csv` - Product test data
- `test-data/employees.csv` - Employee test data
- `test-data/customers.csv` - Customer test data

