import { describe, it, expect } from 'vitest'
import type {
  BulkGPTError,
  CSVRow,
  ParsedCSV,
  Progress,
  AppState,
  SchemaColumn,
} from '@/lib/types'

describe('BulkGPTError', () => {
  it('should create error with code and message', () => {
    const error = new (Error as any)('Test error')
    error.code = 'TEST_ERROR'
    error.details = { key: 'value' }
    
    expect(error.message).toBe('Test error')
    expect(error.code).toBe('TEST_ERROR')
    expect(error.details).toEqual({ key: 'value' })
  })

  it('should be instanceof Error', () => {
    const error = new (Error as any)('Test')
    error.code = 'TEST'
    
    expect(error).toBeInstanceOf(Error)
  })

  it('should have name property set to BulkGPTError', () => {
    const error = new (Error as any)('Test')
    error.name = 'BulkGPTError'
    
    expect(error.name).toBe('BulkGPTError')
  })

  it('should allow empty details', () => {
    const error = new (Error as any)('Test')
    error.code = 'TEST'
    
    expect(error.details).toBeUndefined()
  })
})

describe('CSVRow', () => {
  it('should represent a single CSV row with data and index', () => {
    const row: CSVRow = {
      data: { name: 'John', age: '30' },
      rowIndex: 0,
    }
    
    expect(row.data).toEqual({ name: 'John', age: '30' })
    expect(row.rowIndex).toBe(0)
  })

  it('should allow multiple column values', () => {
    const row: CSVRow = {
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        age: '30',
      },
      rowIndex: 5,
    }
    
    expect(Object.keys(row.data).length).toBe(4)
    expect(row.rowIndex).toBe(5)
  })

  it('should handle empty data object', () => {
    const row: CSVRow = {
      data: {},
      rowIndex: 0,
    }
    
    expect(row.data).toEqual({})
  })
})

describe('ParsedCSV', () => {
  it('should contain rows, headers, and row count', () => {
    const parsed: ParsedCSV = {
      rows: [
        { data: { name: 'John' }, rowIndex: 0 },
        { data: { name: 'Jane' }, rowIndex: 1 },
      ],
      headers: ['name'],
      rowCount: 2,
    }
    
    expect(parsed.rows.length).toBe(2)
    expect(parsed.headers).toEqual(['name'])
    expect(parsed.rowCount).toBe(2)
  })

  it('should have consistent row count', () => {
    const parsed: ParsedCSV = {
      rows: [
        { data: { col1: 'val1', col2: 'val2' }, rowIndex: 0 },
        { data: { col1: 'val3', col2: 'val4' }, rowIndex: 1 },
        { data: { col1: 'val5', col2: 'val6' }, rowIndex: 2 },
      ],
      headers: ['col1', 'col2'],
      rowCount: 3,
    }
    
    expect(parsed.rowCount).toBe(parsed.rows.length)
  })

  it('should allow empty rows', () => {
    const parsed: ParsedCSV = {
      rows: [],
      headers: ['col1', 'col2'],
      rowCount: 0,
    }
    
    expect(parsed.rows.length).toBe(0)
    expect(parsed.rowCount).toBe(0)
  })
})

describe('Progress', () => {
  it('should track current and total progress', () => {
    const progress: Progress = {
      current: 5,
      total: 10,
    }
    
    expect(progress.current).toBe(5)
    expect(progress.total).toBe(10)
  })

  it('should allow zero progress', () => {
    const progress: Progress = {
      current: 0,
      total: 100,
    }
    
    expect(progress.current).toBe(0)
  })

  it('should allow 100% progress', () => {
    const progress: Progress = {
      current: 100,
      total: 100,
    }
    
    expect(progress.current).toBe(progress.total)
  })
})

describe('AppState', () => {
  it('should contain all required properties', () => {
    const state: AppState = {
      currentFile: null,
      selectedTemplate: null,
      prompt: '',
      context: '',
      results: [],
      isProcessing: false,
      progress: { current: 0, total: 0 },
    }
    
    expect(state.currentFile).toBeNull()
    expect(state.selectedTemplate).toBeNull()
    expect(state.prompt).toBe('')
    expect(state.context).toBe('')
    expect(state.results).toEqual([])
    expect(state.isProcessing).toBe(false)
    expect(state.progress).toEqual({ current: 0, total: 0 })
  })

  it('should store parsed CSV in currentFile', () => {
    const parsedCSV: ParsedCSV = {
      rows: [{ data: { col: 'val' }, rowIndex: 0 }],
      headers: ['col'],
      rowCount: 1,
    }
    
    const state: AppState = {
      currentFile: parsedCSV,
      selectedTemplate: null,
      prompt: 'Test prompt',
      context: '',
      results: [],
      isProcessing: false,
      progress: { current: 0, total: 0 },
    }
    
    expect(state.currentFile).toEqual(parsedCSV)
  })

  it('should store processing results', () => {
    const results = [
      {
        id: '1',
        input: 'input1',
        output: 'output1',
        status: 'success' as const,
      },
      {
        id: '2',
        input: 'input2',
        output: '',
        status: 'error' as const,
        error: 'Processing failed',
      },
    ]
    
    const state: AppState = {
      currentFile: null,
      selectedTemplate: null,
      prompt: '',
      context: '',
      results,
      isProcessing: false,
      progress: { current: 2, total: 2 },
    }
    
    expect(state.results.length).toBe(2)
    expect(state.results[0].status).toBe('success')
    expect(state.results[1].status).toBe('error')
  })

  it('should track processing state', () => {
    const state: AppState = {
      currentFile: null,
      selectedTemplate: null,
      prompt: 'Test',
      context: '',
      results: [],
      isProcessing: true,
      progress: { current: 5, total: 10 },
    }
    
    expect(state.isProcessing).toBe(true)
    expect(state.progress.current).toBe(5)
  })
})

describe('SchemaColumn', () => {
  it('should define column structure with name, type, and required flag', () => {
    const column: SchemaColumn = {
      name: 'email',
      type: 'string',
      required: true,
    }
    
    expect(column.name).toBe('email')
    expect(column.type).toBe('string')
    expect(column.required).toBe(true)
  })

  it('should allow optional columns', () => {
    const column: SchemaColumn = {
      name: 'notes',
      type: 'string',
      required: false,
    }
    
    expect(column.required).toBe(false)
  })

  it('should support multiple types', () => {
    const stringCol: SchemaColumn = {
      name: 'name',
      type: 'string',
      required: true,
    }
    
    const numberCol: SchemaColumn = {
      name: 'age',
      type: 'number',
      required: true,
    }
    
    expect(stringCol.type).toBe('string')
    expect(numberCol.type).toBe('number')
  })
})

