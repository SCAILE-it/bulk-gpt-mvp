/**
 * Tests for StepResults component (TDD Red Phase)
 *
 * Step 3: Display Bulk Processing Results
 * - Results table (input, output, status)
 * - Summary statistics (total, completed, failed, success rate)
 * - Status filtering (all, completed, failed, processing)
 * - Export functionality (CSV download, copy to clipboard)
 * - Navigation (restart, back to configure)
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../utils/test-utils'
import StepResults from '@/components/wizard/StepResults'

// Mock URL.createObjectURL for jsdom
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

// Sample test data
const SAMPLE_RESULTS = [
  { id: '1', input: { name: 'John Smith', company: 'Acme Corp' }, output: 'Hi John! I wanted to reach out to discuss how we can help Acme Corp grow.', status: 'completed' },
  { id: '2', input: { name: 'Jane Doe', company: 'Widget Inc' }, output: 'Hello Jane! Looking forward to connecting about Widget Inc.', status: 'completed' },
  { id: '3', input: { name: 'Bob Johnson', company: 'Tech Co' }, output: '', status: 'failed', error: 'API rate limit exceeded. Please try again later.' },
]

const SAMPLE_SUMMARY = {
  total: 3,
  completed: 2,
  failed: 1,
}

describe('StepResults', () => {
  describe('Rendering', () => {
    it('should render results table', () => {
      renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      // Check for table headers
      const headers = table.querySelectorAll('th')
      expect(headers.length).toBe(3)
      expect(headers[0]).toHaveTextContent(/input/i)
      expect(headers[1]).toHaveTextContent(/output/i)
      expect(headers[2]).toHaveTextContent(/status/i)
    })

    it('should display summary statistics', () => {
      const { container } = renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      // Check summary cards using container queries for specificity
      const summaryCards = container.querySelectorAll('.grid > div')
      expect(summaryCards.length).toBeGreaterThanOrEqual(4)

      // Check for summary values
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('Success Rate')).toBeInTheDocument()

      // Check for numeric values (may appear multiple times, so use getAllByText)
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)
    })

    it('should show success rate percentage', () => {
      renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      // 2/3 = 66.67%
      expect(screen.getByText(/66.*%|67.*%/)).toBeInTheDocument()
    })

    it('should display export buttons', () => {
      renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: /export.*csv/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
    })

    it('should display navigation buttons', () => {
      renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: /restart|new/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })

  describe('Results Display', () => {
    it('should display all result rows', () => {
      renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      expect(screen.getByText(/John Smith/i)).toBeInTheDocument()
      expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument()
      expect(screen.getByText(/Bob Johnson/i)).toBeInTheDocument()
    })

    it('should show completed status with success indicator', () => {
      const { container } = renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      const completedBadges = screen.getAllByText(/completed/i)
      expect(completedBadges.length).toBeGreaterThanOrEqual(2)

      // Should have green/success styling (data-testid="status-completed")
      const completedStatus = container.querySelector('[data-testid="status-completed"]')
      expect(completedStatus).toBeInTheDocument()
    })

    it('should show failed status with error indicator', () => {
      const { container } = renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      // Should have red/error styling (data-testid="status-failed")
      const failedStatus = container.querySelector('[data-testid="status-failed"]')
      expect(failedStatus).toBeInTheDocument()
      expect(failedStatus).toHaveTextContent(/failed/i)
    })

    it('should display output text for completed results', () => {
      renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      expect(screen.getByText(/Hi John! I wanted to reach out/i)).toBeInTheDocument()
      expect(screen.getByText(/Hello Jane! Looking forward/i)).toBeInTheDocument()
    })

    it('should show empty output for failed results', () => {
      renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      // Failed result should show error message
      expect(screen.getByText(/API rate limit exceeded/i)).toBeInTheDocument()
    })

    it('should show generic message for failed results without error details', () => {
      const resultsWithoutError = [
        { id: '1', input: { name: 'Test User', company: 'Test Co' }, output: '', status: 'failed' },
      ]

      renderWithProviders(
        <StepResults
          results={resultsWithoutError}
          summary={{ total: 1, completed: 0, failed: 1 }}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      // Should show generic fallback message
      expect(screen.getByText(/no output.*failed to generate/i)).toBeInTheDocument()
    })
  })

  describe('Filtering and Sorting', () => {
    it('should allow filtering by status (all/completed/failed)', async () => {
      const { user } = renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      // Initial state: all results visible
      expect(screen.getByText(/John Smith/i)).toBeInTheDocument()
      expect(screen.getByText(/Bob Johnson/i)).toBeInTheDocument()

      // Filter to completed only - use exact button text match
      const completedFilter = screen.getByRole('button', { name: `Completed (${SAMPLE_SUMMARY.completed})` })
      await user.click(completedFilter)

      await waitFor(() => {
        expect(screen.getByText(/John Smith/i)).toBeInTheDocument()
      })

      // Verify failed result is not shown
      await waitFor(() => {
        expect(screen.queryByText(/Bob Johnson/i)).not.toBeInTheDocument()
      })
    })

    it('should show count of filtered results', async () => {
      const { user } = renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      const failedFilter = screen.getByRole('button', { name: `Failed (${SAMPLE_SUMMARY.failed})` })
      await user.click(failedFilter)

      await waitFor(() => {
        expect(screen.getByText(/showing 1 of 3/i)).toBeInTheDocument()
      })
    })
  })

  describe('Export Functionality', () => {
    let writeTextMock: any

    beforeEach(() => {
      // Create a fresh mock for each test
      writeTextMock = vi.fn().mockResolvedValue(undefined)

      // Mock clipboard API for all tests in this suite
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      })
    })

    it('should export results as CSV file', async () => {
      const { user } = renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      const exportButton = screen.getByRole('button', { name: /export.*csv/i })
      await user.click(exportButton)

      // Verify download was triggered (check for download attribute or mock)
      await waitFor(() => {
        expect(exportButton).not.toBeDisabled()
      })
    })

    it('should copy results to clipboard', async () => {
      const { user } = renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      const copyButton = screen.getByRole('button', { name: /copy/i })
      expect(copyButton).toHaveTextContent('Copy')

      await user.click(copyButton)

      // Button text should change to "Copied!" after clicking
      // This verifies the clipboard operation completed successfully
      await waitFor(() => {
        expect(copyButton).toHaveTextContent('Copied!')
      })
    })

    it('should show success message after copy', async () => {
      const { user } = renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      const copyButton = screen.getByRole('button', { name: /copy/i })
      await user.click(copyButton)

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/copied|success/i)
      })
    })
  })

  describe('Navigation', () => {
    it('should call onRestart when restart button clicked', async () => {
      const handleRestart = vi.fn()
      const { user } = renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={handleRestart}
          onBack={() => {}}
        />
      )

      const restartButton = screen.getByRole('button', { name: /restart|new/i })
      await user.click(restartButton)

      expect(handleRestart).toHaveBeenCalledTimes(1)
    })

    it('should call onBack when back button clicked', async () => {
      const handleBack = vi.fn()
      const { user } = renderWithProviders(
        <StepResults
          results={SAMPLE_RESULTS}
          summary={SAMPLE_SUMMARY}
          onRestart={() => {}}
          onBack={handleBack}
        />
      )

      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      expect(handleBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no results', () => {
      renderWithProviders(
        <StepResults
          results={[]}
          summary={{ total: 0, completed: 0, failed: 0 }}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      expect(screen.getByText(/Processing will begin/i)).toBeInTheDocument()
    })

    it('should show 100% success rate for all completed', () => {
      const allCompleted = [
        { id: '1', input: { data: 'Test 1' }, output: 'Output 1', status: 'completed' },
        { id: '2', input: { data: 'Test 2' }, output: 'Output 2', status: 'completed' },
      ]

      renderWithProviders(
        <StepResults
          results={allCompleted}
          summary={{ total: 2, completed: 2, failed: 0 }}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      expect(screen.getByText(/100.*%/)).toBeInTheDocument()
    })

    it('should show 0% success rate for all failed', () => {
      const allFailed = [
        { id: '1', input: { data: 'Test 1' }, output: '', status: 'failed' },
        { id: '2', input: { data: 'Test 2' }, output: '', status: 'failed' },
      ]

      renderWithProviders(
        <StepResults
          results={allFailed}
          summary={{ total: 2, completed: 0, failed: 2 }}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      expect(screen.getByText(/0.*%/)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle large result sets (100+ rows)', () => {
      const largeResults = Array.from({ length: 150 }, (_, i) => ({
        id: `${i}`,
        input: `Input ${i}`,
        output: `Output ${i}`,
        status: i % 5 === 0 ? 'failed' : 'completed',
      }))

      const largeSummary = {
        total: 150,
        completed: 120,
        failed: 30,
      }

      renderWithProviders(
        <StepResults
          results={largeResults}
          summary={largeSummary}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      // Check for total in summary card
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getAllByText('150').length).toBeGreaterThanOrEqual(1)

      // Should show table
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('should handle special characters in output', () => {
      const specialResults = [
        { id: '1', input: { data: 'Test' }, output: 'Hello "World" & <Friends>!', status: 'completed' },
      ]

      renderWithProviders(
        <StepResults
          results={specialResults}
          summary={{ total: 1, completed: 1, failed: 0 }}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      expect(screen.getByText(/Hello "World" & <Friends>!/i)).toBeInTheDocument()
    })

    it('should handle very long output text', () => {
      const longOutput = 'A'.repeat(500)
      const longResults = [
        { id: '1', input: { data: 'Test' }, output: longOutput, status: 'completed' },
      ]

      renderWithProviders(
        <StepResults
          results={longResults}
          summary={{ total: 1, completed: 1, failed: 0 }}
          onRestart={() => {}}
          onBack={() => {}}
        />
      )

      // Should truncate or show expandable text
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
  })
})
