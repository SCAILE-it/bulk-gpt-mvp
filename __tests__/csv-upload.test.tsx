import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { CSVUpload } from '@/components/upload/csv-upload'

describe('CSVUpload Component', () => {
  it('renders upload area with drag and drop instructions', () => {
    render(<CSVUpload onComplete={() => {}} />)
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
  })

  it('renders file input button for clicking', () => {
    render(<CSVUpload onComplete={() => {}} />)
    const fileInput = screen.getByLabelText(/select csv file/i)
    expect(fileInput).toBeInTheDocument()
  })

  it('allows file selection via file input', async () => {
    const user = userEvent.setup()
    render(<CSVUpload onComplete={() => {}} />)

    const fileInput = screen.getByLabelText(/select csv file/i) as HTMLInputElement
    const file = new File(['name,email,age\nJohn,john@example.com,30'], 'test.csv', {
      type: 'text/csv',
    })

    await user.upload(fileInput, file)
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('shows file size error message', async () => {
    render(<CSVUpload onComplete={() => {}} />)
    const fileInput = screen.getByLabelText(/select csv file/i) as HTMLInputElement

    // Create a mock file that appears large (we use a smaller one for test speed)
    const file = new File(['x'.repeat(60 * 1024 * 1024)], 'large.csv', { type: 'text/csv' })
    Object.defineProperty(file, 'size', { value: 51 * 1024 * 1024 })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/too large|exceeds/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('displays preview after successful file selection', async () => {
    const user = userEvent.setup()
    render(<CSVUpload onComplete={() => {}} />)

    const csvContent = 'name,email,age\nJohn,john@example.com,30\nJane,jane@example.com,25'
    const file = new File([csvContent], 'data.csv', { type: 'text/csv' })

    const fileInput = screen.getByLabelText(/select csv file/i) as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(
      () => {
        expect(screen.getByText('John')).toBeInTheDocument()
        expect(screen.getByText('jane@example.com')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })

  it('clears upload when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<CSVUpload onComplete={() => {}} />)

    const csvContent = 'a,b\n1,2'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })

    const fileInput = screen.getByLabelText(/select csv file/i) as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    }, { timeout: 5000 })

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelBtn)

    expect(screen.queryByText('1')).not.toBeInTheDocument()
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
  })

  it('calls onComplete callback when upload is confirmed', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(<CSVUpload onComplete={onComplete} />)

    const csvContent = 'name,email\nJohn,john@example.com'
    const file = new File([csvContent], 'data.csv', { type: 'text/csv' })

    const fileInput = screen.getByLabelText(/select csv file/i) as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(
      () => {
        expect(screen.getByText('John')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    const confirmBtn = screen.getByRole('button', { name: /confirm|proceed/i })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'data.csv',
          totalRows: 1,
        })
      )
    }, { timeout: 2000 })
  })

  it.skip('shows warning for large CSV', async () => {
    const user = userEvent.setup()
    render(<CSVUpload onComplete={() => {}} />)

    const rows = Array(5001)
      .fill(0)
      .map((_, i) => i)
      .join('\n')
    const csvContent = `id\n${rows}`
    const file = new File([csvContent], 'large.csv', { type: 'text/csv' })

    const fileInput = screen.getByLabelText(/select csv file/i) as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(
      () => {
        expect(screen.getByText(/large file|warning|5001 rows/i)).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })

  it('displays all CSV columns in preview header', async () => {
    const user = userEvent.setup()
    render(<CSVUpload onComplete={() => {}} />)

    const csvContent = 'name,email,phone,address\nJohn,john@test.com,123,123 Main'
    const file = new File([csvContent], 'data.csv', { type: 'text/csv' })

    const fileInput = screen.getByLabelText(/select csv file/i) as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(
      () => {
        expect(screen.getByText('name')).toBeInTheDocument()
        expect(screen.getByText('email')).toBeInTheDocument()
        expect(screen.getByText('phone')).toBeInTheDocument()
        expect(screen.getByText('address')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })

  it('displays row count information', async () => {
    const user = userEvent.setup()
    render(<CSVUpload onComplete={() => {}} />)

    const csvContent = 'id,name\n1,Alice\n2,Bob\n3,Charlie'
    const file = new File([csvContent], 'data.csv', { type: 'text/csv' })

    const fileInput = screen.getByLabelText(/select csv file/i) as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(
      () => {
        expect(screen.getByText(/3 of 3 rows/i)).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })
})






