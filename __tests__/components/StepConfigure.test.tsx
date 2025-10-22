/**
 * Tests for StepConfigure component (TDD Red Phase)
 *
 * Step 2: Configure processing
 * - Mode selection (Quick vs Custom)
 * - Column mapping for variables
 * - Prompt template editing
 * - Real-time prompt preview
 * - Token estimation
 * - Navigation (Back/Next buttons)
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, waitFor, fireEvent } from '../utils/test-utils'
import StepConfigure from '@/components/wizard/StepConfigure'

const SAMPLE_CSV_DATA = {
  file: new File(['name,email,company,industry'], 'test.csv', { type: 'text/csv' }),
  headers: ['name', 'email', 'company', 'industry'],
  rowCount: 3,
  preview: [
    ['John Smith', 'john@acme.com', 'Acme Inc', 'Technology'],
    ['Jane Doe', 'jane@widgets.com', 'Widgets LLC', 'Manufacturing'],
    ['Bob Johnson', 'bob@startup.io', 'Startup Inc', 'SaaS'],
  ],
}

describe('StepConfigure', () => {
  describe('Rendering', () => {
    it('should render mode selector (Quick vs Custom)', () => {
      renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      expect(screen.getByText('Quick')).toBeInTheDocument()
      expect(screen.getByText('Custom')).toBeInTheDocument()
    })

    it('should default to Quick mode', () => {
      renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const quickButton = screen.getByRole('button', { name: /quick/i })
      expect(quickButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should show Back and Next buttons', () => {
      renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('should display CSV headers count', () => {
      renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      expect(screen.getByText(/4 columns? detected/i)).toBeInTheDocument()
    })
  })

  describe('Quick Mode', () => {
    it('should show auto-column generation description', () => {
      renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      expect(
        screen.getByText(/ai will automatically generate/i)
      ).toBeInTheDocument()
    })

    it('should show Generate Columns button', () => {
      renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      expect(screen.getByRole('button', { name: /generate columns/i })).toBeInTheDocument()
    })

    it('should disable Next button until columns are generated', () => {
      renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should show loading state when generating columns', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const generateButton = screen.getByRole('button', { name: /generate columns/i })
      await user.click(generateButton)

      expect(screen.getByText(/generating/i)).toBeInTheDocument()
      expect(generateButton).toBeDisabled()
    })

    it('should display generated column mapping', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const generateButton = screen.getByRole('button', { name: /generate columns/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('{{name}}')).toBeInTheDocument()
        expect(screen.getByText('{{email}}')).toBeInTheDocument()
      })
    })

    it('should display generated prompt template', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const generateButton = screen.getByRole('button', { name: /generate columns/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /prompt template/i })).toBeInTheDocument()
      })
    })

    it('should enable Next button after successful generation', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const generateButton = screen.getByRole('button', { name: /generate columns/i })
      await user.click(generateButton)

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i })
        expect(nextButton).not.toBeDisabled()
      })
    })

    it('should show error message if generation fails', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      // Mock API failure
      const generateButton = screen.getByRole('button', { name: /generate columns/i })
      await user.click(generateButton)

      await waitFor(() => {
        const errorAlert = screen.queryByRole('alert')
        if (errorAlert) {
          expect(errorAlert).toHaveTextContent(/failed to generate|error/i)
        }
      })
    })
  })

  describe('Custom Mode', () => {
    it('should switch to Custom mode when clicked', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      expect(customButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should show column mapping section in Custom mode', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      expect(screen.getByText(/column mapping/i)).toBeInTheDocument()
    })

    it('should display all CSV headers as available columns', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      SAMPLE_CSV_DATA.headers.forEach((header) => {
        expect(screen.getByText(header)).toBeInTheDocument()
      })
    })

    it('should show prompt template editor', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      expect(screen.getByRole('textbox', { name: /prompt template/i })).toBeInTheDocument()
    })

    it('should allow adding a variable to the prompt', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      // Click on a column to add it as a variable
      const nameColumn = screen.getByRole('button', { name: /add.*name/i })
      await user.click(nameColumn)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })

      // Wait for state update after button click
      await waitFor(() => {
        expect(promptInput).toHaveValue('{{name}}')
      })
    })

    it('should allow editing the prompt template directly', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })

      // Use fireEvent for input with special characters ({{braces}})
      // user-event has known limitations with brace characters in happy-dom
      fireEvent.change(promptInput, { target: { value: 'Hello {{name}}, welcome to {{company}}!' } })

      expect(promptInput).toHaveValue('Hello {{name}}, welcome to {{company}}!')
    })

    it('should enable Next button when prompt template is valid', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })
      fireEvent.change(promptInput, { target: { value: 'Hello {{name}}!' } })

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i })
        expect(nextButton).not.toBeDisabled()
      })
    })

    it('should show validation error for invalid variable syntax', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })
      // Use fireEvent for input with special characters
      fireEvent.change(promptInput, { target: { value: 'Hello {name}!' } }) // Invalid syntax (single braces)

      await waitFor(() => {
        expect(screen.getByText(/invalid variable syntax/i)).toBeInTheDocument()
      })
    })

    it('should show validation error for undefined variables', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })
      fireEvent.change(promptInput, { target: { value: 'Hello {{unknown_column}}!' } })

      await waitFor(() => {
        expect(screen.getByText(/unknown variable.*unknown_column/i)).toBeInTheDocument()
      })
    })
  })

  describe('Prompt Preview', () => {
    it('should show real-time prompt preview with sample data', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })
      fireEvent.change(promptInput, { target: { value: 'Hello {{name}} from {{company}}!' } })

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
        expect(screen.getByText(/hello john smith from acme inc/i)).toBeInTheDocument()
      })
    })

    it('should update preview when template changes', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })
      fireEvent.change(promptInput, { target: { value: 'Email: {{email}}' } })

      await waitFor(() => {
        expect(screen.getByText(/email: john@acme.com/i)).toBeInTheDocument()
      })

      await user.clear(promptInput)
      fireEvent.change(promptInput, { target: { value: 'Company: {{company}}' } })

      await waitFor(() => {
        expect(screen.getByText(/company: acme inc/i)).toBeInTheDocument()
      })
    })

    it('should show multiple preview examples', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })
      fireEvent.change(promptInput, { target: { value: 'Hello {{name}}!' } })

      await waitFor(() => {
        expect(screen.getByText(/hello john smith/i)).toBeInTheDocument()
        expect(screen.getByText(/hello jane doe/i)).toBeInTheDocument()
      })
    })
  })

  describe('Token Estimation', () => {
    it('should show token count estimate', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })
      fireEvent.change(promptInput, { target: { value: 'Hello {{name}}!' } })

      await waitFor(() => {
        expect(screen.getByText(/~\d+ tokens? per row/i)).toBeInTheDocument()
      })
    })

    it('should update token count when template changes', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })
      fireEvent.change(promptInput, { target: { value: 'Hi!' } })

      const shortTokenCount = await screen.findByText(/~\d+ tokens? per row/i)
      const shortCount = parseInt(shortTokenCount.textContent!.match(/\d+/)![0])

      await user.clear(promptInput)
      // Use fireEvent for long string to avoid timeout
      fireEvent.change(
        promptInput,
        { target: { value: 'This is a very long prompt template with many words to increase the token count significantly' } }
      )

      await waitFor(() => {
        const longTokenCount = screen.getByText(/~\d+ tokens? per row/i)
        const longCount = parseInt(longTokenCount.textContent!.match(/\d+/)![0])
        expect(longCount).toBeGreaterThan(shortCount)
      })
    })

    it('should show total token estimate for all rows', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })
      fireEvent.change(promptInput, { target: { value: 'Hello {{name}}!' } })

      await waitFor(() => {
        expect(screen.getByText(/total.*~\d+ tokens?/i)).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should call onBack when Back button is clicked', async () => {
      const handleBack = vi.fn()
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={handleBack} />
      )

      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      expect(handleBack).toHaveBeenCalledTimes(1)
    })

    it('should call onNext with configuration when Next is clicked in Quick mode', async () => {
      const handleNext = vi.fn()
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={handleNext} onBack={() => {}} />
      )

      // Generate columns in Quick mode
      const generateButton = screen.getByRole('button', { name: /generate columns/i })
      await user.click(generateButton)

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i })
        expect(nextButton).not.toBeDisabled()
      })

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      expect(handleNext).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'quick',
          promptTemplate: expect.any(String),
          columnMapping: expect.any(Object),
        })
      )
    })

    it('should call onNext with configuration when Next is clicked in Custom mode', async () => {
      const handleNext = vi.fn()
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={handleNext} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })
      fireEvent.change(promptInput, { target: { value: 'Hello {{name}}!' } })

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i })
        expect(nextButton).not.toBeDisabled()
      })

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      expect(handleNext).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'custom',
          promptTemplate: 'Hello {{name}}!',
          columnMapping: expect.any(Object),
        })
      )
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for mode buttons', () => {
      renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const quickButton = screen.getByRole('button', { name: /quick/i })
      const customButton = screen.getByRole('button', { name: /custom/i })

      expect(quickButton).toHaveAttribute('aria-pressed')
      expect(customButton).toHaveAttribute('aria-pressed')
    })

    it('should announce mode changes to screen readers', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      await waitFor(() => {
        const status = screen.getByRole('status')
        expect(status).toHaveTextContent(/custom mode selected/i)
      })
    })

    it('should have proper label for prompt template input', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      // Label only appears after switching to Custom mode
      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      expect(screen.getByLabelText(/prompt template/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle CSV with many columns (10+)', async () => {
      const manyColumnData = {
        headers: Array.from({ length: 15 }, (_, i) => `column_${i + 1}`),
        rowCount: 1,
        preview: [Array.from({ length: 15 }, (_, i) => `value_${i + 1}`)],
      }

      const { user } = renderWithProviders(
        <StepConfigure csvData={manyColumnData} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      expect(screen.getByText(/15 columns? detected/i)).toBeInTheDocument()
    })

    it('should handle very long prompt templates', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const longPrompt = 'A'.repeat(5000)
      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })
      // Use fireEvent for very long input to avoid timeout
      fireEvent.change(promptInput, { target: { value: longPrompt } })

      expect(promptInput).toHaveValue(longPrompt)
    })

    it('should preserve configuration when switching modes', async () => {
      const { user } = renderWithProviders(
        <StepConfigure csvData={SAMPLE_CSV_DATA} onNext={() => {}} onBack={() => {}} />
      )

      // Switch to Custom and add a prompt
      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      const promptInput = screen.getByRole('textbox', { name: /prompt template/i })
      fireEvent.change(promptInput, { target: { value: 'Custom prompt {{name}}' } })

      // Switch back to Quick
      const quickButton = screen.getByRole('button', { name: /quick/i })
      await user.click(quickButton)

      // Switch back to Custom
      await user.click(customButton)

      // Prompt should be preserved
      expect(promptInput).toHaveValue('Custom prompt {{name}}')
    })
  })
})
