/**
 * Test fixtures for CSV data
 *
 * These fixtures provide consistent test data across all tests,
 * making tests more maintainable and predictable.
 */

export const SAMPLE_CSV_CONTENT = `name,email,company,industry
John Smith,john@acme.com,Acme Inc,Technology
Jane Doe,jane@widgets.com,Widgets Co,Manufacturing
Bob Lee,bob@startup.io,Startup IO,SaaS`

export const SAMPLE_CSV_HEADERS = ['name', 'email', 'company', 'industry']

export const SAMPLE_CSV_ROWS = [
  {
    name: 'John Smith',
    email: 'john@acme.com',
    company: 'Acme Inc',
    industry: 'Technology',
  },
  {
    name: 'Jane Doe',
    email: 'jane@widgets.com',
    company: 'Widgets Co',
    industry: 'Manufacturing',
  },
  {
    name: 'Bob Lee',
    email: 'bob@startup.io',
    company: 'Startup IO',
    industry: 'SaaS',
  },
]

export const LARGE_CSV_ROWS = Array.from({ length: 100 }, (_, i) => ({
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  company: `Company ${i + 1}`,
  industry: i % 3 === 0 ? 'Technology' : i % 3 === 1 ? 'Manufacturing' : 'SaaS',
}))

export const EMPTY_CSV_CONTENT = ``

export const HEADERS_ONLY_CSV_CONTENT = `name,email,company,industry`

export const MALFORMED_CSV_CONTENT = `name,email,company,industry
John Smith,john@acme.com,Acme Inc
Jane Doe,jane@widgets.com,Widgets Co,Manufacturing,Extra Field`

/**
 * Creates a CSV File object from content string
 */
export function createCSVFile(content: string, filename = 'test-data.csv'): File {
  const blob = new Blob([content], { type: 'text/csv' })
  return new File([blob], filename, { type: 'text/csv' })
}

/**
 * Creates a CSV with custom data
 */
export function createCustomCSV(
  headers: string[],
  rows: Record<string, string>[]
): string {
  const headerLine = headers.join(',')
  const dataLines = rows.map(row =>
    headers.map(header => row[header] || '').join(',')
  )
  return [headerLine, ...dataLines].join('\n')
}
