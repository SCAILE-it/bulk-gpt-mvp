import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react'
import { ResultsTable } from '@/components/results/results-table'

describe('ResultsTable', () => {
  const mockResults = [
    { id: '1', input: 'John', output: 'Result1', status: 'success' as const },
    { id: '2', input: 'Jane', output: 'Result2', status: 'success' as const },
    { id: '3', input: 'Bob', output: 'Result3', status: 'error' as const },
  ]

  it('renders table with results', () => {
    render(<ResultsTable results={mockResults} />)
    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('Result1')).toBeInTheDocument()
  })

  it('shows empty state when no results', () => {
    render(<ResultsTable results={[]} />)
    expect(screen.getByText(/no results/i)).toBeInTheDocument()
  })

  it('filters results by search term', () => {
    render(<ResultsTable results={mockResults} />)
    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'Jane' } })
    expect(screen.getByText('Jane')).toBeInTheDocument()
    expect(screen.queryByText('John')).not.toBeInTheDocument()
  })

  it('displays results table structure', () => {
    render(<ResultsTable results={mockResults} />)
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
  })

  it('handles pagination', () => {
    const manyResults = Array(25)
      .fill(0)
      .map((_, i) => ({
        id: String(i),
        input: `Input${i}`,
        output: `Output${i}`,
        status: 'success' as const,
      }))
    render(<ResultsTable results={manyResults} pageSize={10} />)
    expect(screen.getByText(/page 1/i)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<ResultsTable results={[]} loading={true} />)
    expect(screen.getByText(/loading results/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    render(<ResultsTable results={[]} error="Failed to load results" />)
    expect(screen.getByText('Failed to load results')).toBeInTheDocument()
  })

  it('displays row count', () => {
    render(<ResultsTable results={mockResults} />)
    expect(screen.getByText(/3 results/i)).toBeInTheDocument()
  })
})






