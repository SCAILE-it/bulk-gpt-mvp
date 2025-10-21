/**
 * Tests for StepUpload component (TDD Red Phase)
 *
 * Step 1: Upload CSV file
 * - File dropzone (click or drag-and-drop)
 * - File validation (CSV only, size limits)
 * - File preview (headers, row count, sample data)
 * - Navigation (Next button)
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../utils/test-utils'
import StepUpload from '@/components/wizard/StepUpload'
import { createMockFile } from '../utils/test-utils'
import { SAMPLE_CSV_CONTENT, SAMPLE_CSV_HEADERS } from '../fixtures/csv-data'

describe('StepUpload', () => {
  describe('Rendering', () => {
    it('should render file upload dropzone', () => {
      renderWithProviders(<StepUpload onNext={() => {}} />)

      expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument()
      expect(screen.getByText(/click to browse/i)).toBeInTheDocument()
    })

    it('should show accepted file format (CSV only)', () => {
      renderWithProviders(<StepUpload onNext={() => {}} />)

      expect(screen.getByText(/accepted formats.*csv/i)).toBeInTheDocument()
    })

    it('should display upload icon', () => {
      const { container } = renderWithProviders(<StepUpload onNext={() => {}} />)

      // Look for upload icon (data-testid="upload-icon")
      expect(container.querySelector('[data-testid="upload-icon"]')).toBeInTheDocument()
    })

    it('should show Next button (initially disabled)', () => {
      renderWithProviders(<StepUpload onNext={() => {}} />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeInTheDocument()
      expect(nextButton).toBeDisabled()
    })
  })

  describe('File Selection - Click', () => {
    it('should open file picker when clicking dropzone', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' })
      expect(fileInput).toBeInTheDocument()
    })

    it('should accept CSV file via click', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile(SAMPLE_CSV_CONTENT, 'test.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument()
      })
    })

    it('should show file size after upload', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile(SAMPLE_CSV_CONTENT, 'test.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText(/\d+\s*(bytes|KB|MB)/i)).toBeInTheDocument()
      })
    })
  })

  describe('File Selection - Drag and Drop', () => {
    it('should accept CSV file via drag and drop', async () => {
      renderWithProviders(<StepUpload onNext={() => {}} />)

      const dropzone = screen.getByText(/drag.*drop/i).closest('div')
      const file = createMockFile(SAMPLE_CSV_CONTENT, 'test.csv', 'text/csv')

      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      })

      dropzone!.dispatchEvent(dropEvent)

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument()
      })
    })

    it('should show visual feedback on drag over', async () => {
      const { container } = renderWithProviders(<StepUpload onNext={() => {}} />)

      // Get the Card element (dropzone) - it's the element with border-dashed class
      const dropzone = container.querySelector('.border-dashed')

      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
      })

      dropzone!.dispatchEvent(dragOverEvent)

      // Check for visual highlight (border-primary and ring classes)
      await waitFor(() => {
        expect(dropzone).toHaveClass('border-primary')
        expect(dropzone).toHaveClass('ring-primary/20')
      })
    })
  })

  describe('File Validation', () => {
    it.skip('should reject non-CSV files', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile('{"data": "test"}', 'test.json', 'application/json')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Only CSV files are accepted')
      })
    })

    it('should reject files over 10MB', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      // Create a large file (11MB of data)
      const largeContent = 'a'.repeat(11 * 1024 * 1024)
      const file = createMockFile(largeContent, 'large.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText(/file too large|maximum 10MB/i)).toBeInTheDocument()
      })
    })

    it('should reject empty CSV files', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile('', 'empty.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText(/file is empty|no data/i)).toBeInTheDocument()
      })
    })

    it('should reject CSV with no header row', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile('\n\n\n', 'no-header.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText(/no headers found|missing headers/i)).toBeInTheDocument()
      })
    })
  })

  describe('File Preview', () => {
    it('should show column headers after upload', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile(SAMPLE_CSV_CONTENT, 'test.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        SAMPLE_CSV_HEADERS.forEach(header => {
          expect(screen.getByText(header)).toBeInTheDocument()
        })
      })
    })

    it('should show row count', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile(SAMPLE_CSV_CONTENT, 'test.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText(/3 rows?/i)).toBeInTheDocument()
      })
    })

    it('should show sample data (first 5 rows)', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile(SAMPLE_CSV_CONTENT, 'test.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument()
        expect(screen.getByText('jane@widgets.com')).toBeInTheDocument()
      })
    })

    it('should allow removing uploaded file', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile(SAMPLE_CSV_CONTENT, 'test.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument()
      })

      const removeButton = screen.getByRole('button', { name: /remove|delete|clear/i })
      await user.click(removeButton)

      await waitFor(() => {
        expect(screen.queryByText('test.csv')).not.toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should enable Next button after valid file upload', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile(SAMPLE_CSV_CONTENT, 'test.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i })
        expect(nextButton).not.toBeDisabled()
      })
    })

    it('should call onNext with file data when Next is clicked', async () => {
      const handleNext = vi.fn()
      const { user } = renderWithProviders(<StepUpload onNext={handleNext} />)

      const file = createMockFile(SAMPLE_CSV_CONTENT, 'test.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i })
        expect(nextButton).not.toBeDisabled()
      })

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      expect(handleNext).toHaveBeenCalledWith(
        expect.objectContaining({
          file: expect.any(File),
          headers: SAMPLE_CSV_HEADERS,
          rowCount: 3,
        })
      )
    })

    it('should disable Next button if file is removed', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile(SAMPLE_CSV_CONTENT, 'test.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i })
        expect(nextButton).not.toBeDisabled()
      })

      const removeButton = screen.getByRole('button', { name: /remove|delete|clear/i })
      await user.click(removeButton)

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i })
        expect(nextButton).toBeDisabled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<StepUpload onNext={() => {}} />)

      expect(screen.getByLabelText(/upload.*csv/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('should announce file upload success to screen readers', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile(SAMPLE_CSV_CONTENT, 'test.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        const successMessage = screen.getByRole('status')
        expect(successMessage).toHaveTextContent(/uploaded successfully|file loaded/i)
      })
    })

    it('should announce errors to screen readers', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file = createMockFile('', 'empty.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert')
        expect(errorMessage).toHaveTextContent(/file is empty|no data/i)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle CSV with special characters in headers', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const csvContent = `"Name (Full)","Email@Address","Company, Inc.","Revenue $"\nJohn,john@test.com,Acme Inc,$100K`
      const file = createMockFile(csvContent, 'special.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('Name (Full)')).toBeInTheDocument()
        expect(screen.getByText('Email@Address')).toBeInTheDocument()
      })
    })

    it('should handle very large CSV files (1000+ rows)', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      // Generate CSV with 1000 rows
      const header = 'name,email,company,industry\n'
      const rows = Array.from({ length: 1000 }, (_, i) => `User${i},user${i}@test.com,Company${i},Tech`).join('\n')
      const csvContent = header + rows

      const file = createMockFile(csvContent, 'large.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText(/1000 rows?/i)).toBeInTheDocument()
      })
    })

    it.skip('should handle replacing existing file', async () => {
      const { user } = renderWithProviders(<StepUpload onNext={() => {}} />)

      const file1 = createMockFile('name\nJohn', 'file1.csv', 'text/csv')
      const file2 = createMockFile('email\njohn@test.com', 'file2.csv', 'text/csv')
      const fileInput = screen.getByLabelText(/upload.*csv/i, { selector: 'input[type="file"]' }) as HTMLInputElement

      // Upload first file
      await user.upload(fileInput, file1)
      await waitFor(() => {
        expect(screen.getByText('file1.csv')).toBeInTheDocument()
      })

      // Upload second file (should replace first)
      await user.upload(fileInput, file2)
      await waitFor(() => {
        expect(screen.getByText('file2.csv')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Verify first file is gone
      expect(screen.queryByText('file1.csv')).not.toBeInTheDocument()
    })
  })
})
