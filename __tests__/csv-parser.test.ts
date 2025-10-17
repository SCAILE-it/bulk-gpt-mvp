import { describe, it, expect } from 'vitest'
import { parseCSV } from '@/lib/csv-parser'
import { BulkGPTError } from '@/lib/types'

describe('CSV Parser', () => {
  it('parses valid CSV file correctly', async () => {
    const csvContent = 'name,email,age\nJohn,john@example.com,30\nJane,jane@example.com,25'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })

    const result = await parseCSV(file)

    expect(result.filename).toBe('test.csv')
    expect(result.columns).toEqual(['name', 'email', 'age'])
    expect(result.totalRows).toBe(2)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].data).toEqual({
      name: 'John',
      email: 'john@example.com',
      age: '30',
    })
  })

  it('rejects non-CSV files', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })

    await expect(parseCSV(file)).rejects.toThrow()
    try {
      await parseCSV(file)
    } catch (error) {
      if (error instanceof BulkGPTError) {
        expect(error.code).toBe('INVALID_FILE_TYPE')
      }
    }
  })

  it('rejects files larger than 50MB', async () => {
    const largeContent = new Array(51 * 1024 * 1024).fill('a').join('')
    const file = new File([largeContent], 'large.csv', { type: 'text/csv' })

    await expect(parseCSV(file)).rejects.toThrow()
    try {
      await parseCSV(file)
    } catch (error) {
      if (error instanceof BulkGPTError) {
        expect(error.code).toBe('FILE_TOO_LARGE')
      }
    }
  })

  it('rejects empty CSV files', async () => {
    const file = new File([''], 'empty.csv', { type: 'text/csv' })

    await expect(parseCSV(file)).rejects.toThrow()
    try {
      await parseCSV(file)
    } catch (error) {
      if (error instanceof BulkGPTError) {
        expect(error.code).toMatch(/EMPTY_CSV|NO_COLUMNS|CSV_PARSE_ERROR/)
      }
    }
  })

  it('handles CSV with special characters', async () => {
    const csvContent =
      'name,description,value\n"John Doe","A person with, commas",100\n"Jane Smith","Another person",200'
    const file = new File([csvContent], 'special.csv', { type: 'text/csv' })

    const result = await parseCSV(file)

    expect(result.totalRows).toBe(2)
    expect(result.rows[0].data.name).toBe('John Doe')
  })

  it('handles CSV with quoted fields', async () => {
    const csvContent = 'name,email,message\n"John",john@example.com,"Hello, world"\n"Jane",jane@example.com,"Test"'
    const file = new File([csvContent], 'quoted.csv', { type: 'text/csv' })

    const result = await parseCSV(file)

    expect(result.totalRows).toBe(2)
    expect(result.rows[0].data.message).toContain('Hello, world')
  })

  it('validates maximum columns (50)', async () => {
    const columns = Array.from({ length: 51 }, (_, i) => `col${i}`).join(',')
    const row = Array(51).fill('value').join(',')
    const csvContent = `${columns}\n${row}`
    const file = new File([csvContent], 'many-cols.csv', { type: 'text/csv' })

    await expect(parseCSV(file)).rejects.toThrow()
    try {
      await parseCSV(file)
    } catch (error) {
      if (error instanceof BulkGPTError) {
        expect(error.code).toBe('TOO_MANY_COLUMNS')
      }
    }
  })

  it('validates maximum rows (10000)', async () => {
    const header = 'id,value'
    const rows = Array(10001)
      .fill(0)
      .map((_, i) => `${i},data`)
      .join('\n')
    const csvContent = `${header}\n${rows}`
    const file = new File([csvContent], 'many-rows.csv', { type: 'text/csv' })

    await expect(parseCSV(file)).rejects.toThrow()
    try {
      await parseCSV(file)
    } catch (error) {
      if (error instanceof BulkGPTError) {
        expect(error.code).toBe('TOO_MANY_ROWS')
      }
    }
  })

  it('sets correct row indices', async () => {
    const csvContent = 'id,name\n1,Alice\n2,Bob\n3,Charlie'
    const file = new File([csvContent], 'indexed.csv', { type: 'text/csv' })

    const result = await parseCSV(file)

    expect(result.rows[0].rowIndex).toBe(0)
    expect(result.rows[1].rowIndex).toBe(1)
    expect(result.rows[2].rowIndex).toBe(2)
  })

  it('skips empty lines', async () => {
    const csvContent = 'name,email\nJohn,john@example.com\n\nJane,jane@example.com\n\n'
    const file = new File([csvContent], 'sparse.csv', { type: 'text/csv' })

    const result = await parseCSV(file)

    expect(result.totalRows).toBe(2)
  })
})






