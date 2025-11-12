# Test Data Files

This directory contains diverse CSV files for comprehensive testing of the Bulk GPT application.

## File Overview

### Standard Test Files
- **products.csv** (10 rows) - Basic product catalog with name, description, price, category
- **products-large.csv** (20 rows) - Extended product catalog with additional fields (SKU, weight, dimensions)
- **employees.csv** (10 rows) - Employee database with role, department, experience
- **customers.csv** (10 rows) - Customer records with contact info and registration dates
- **contacts.csv** (10 rows) - Professional contacts with LinkedIn and social media

### Content & Media Files
- **articles.csv** (10 rows) - Blog articles with metadata (word count, publish date, status)
- **reviews.csv** (10 rows) - Product reviews with ratings, text, and engagement metrics

### Business Data Files
- **companies.csv** (10 rows) - Company database with industry, revenue, employee count
- **events.csv** (10 rows) - Event listings with dates, locations, attendee counts
- **invoices.csv** (10 rows) - Invoice records with amounts, due dates, payment status

### Edge Case Files
- **special-chars.csv** (10 rows) - Tests Unicode, emojis, quotes, punctuation, HTML-like content
- **minimal.csv** (3 rows) - Minimal data structure (just ID and name)
- **mixed-types.csv** (5 rows) - Mixed data types including JSON, booleans, dates, arrays
- **empty-fields.csv** (10 rows) - Various combinations of missing/empty fields

## Usage

These files are automatically used by the comprehensive test suite:

```bash
# Run all tests (uses all CSV files)
TEST_ALL=true node test-comprehensive-output-quality.js

# Run quick test (uses sample-input.csv)
node test-quick-api.js
```

## File Characteristics

| File | Rows | Columns | Special Features |
|------|------|---------|------------------|
| products.csv | 10 | 4 | Standard e-commerce data |
| products-large.csv | 20 | 8 | Extended fields, larger dataset |
| employees.csv | 10 | 6 | Professional data |
| customers.csv | 10 | 8 | International data (multiple countries) |
| contacts.csv | 10 | 8 | Social media links |
| articles.csv | 10 | 6 | Content metadata |
| reviews.csv | 10 | 6 | User-generated content |
| companies.csv | 10 | 7 | Business metrics |
| events.csv | 10 | 7 | Date/time data |
| invoices.csv | 10 | 7 | Financial data |
| special-chars.csv | 10 | 4 | Unicode, emojis, special symbols |
| minimal.csv | 3 | 2 | Minimal structure |
| mixed-types.csv | 5 | 8 | JSON, booleans, dates |
| empty-fields.csv | 10 | 5 | Missing data patterns |

## Testing Coverage

These files test:
- ✅ Different data structures (2-8 columns)
- ✅ Various data sizes (3-20 rows)
- ✅ Different data types (text, numbers, dates, booleans, JSON)
- ✅ International characters and Unicode
- ✅ Special characters and edge cases
- ✅ Missing/empty data handling
- ✅ Real-world business scenarios


