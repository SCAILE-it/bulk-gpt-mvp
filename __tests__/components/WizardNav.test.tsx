/**
 * Tests for WizardNav component (TDD Red Phase)
 *
 * These tests define the behavior of the wizard navigation before implementation.
 * All tests should FAIL until we implement the WizardNav component.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '../utils/test-utils'
import WizardNav from '@/components/wizard/WizardNav'

describe('WizardNav', () => {
  describe('Rendering', () => {
    it('should render all 3 steps', () => {
      renderWithProviders(<WizardNav currentStep={1} onStepClick={() => {}} />)

      expect(screen.getByText('Upload')).toBeInTheDocument()
      expect(screen.getByText('Configure')).toBeInTheDocument()
      expect(screen.getByText('Results')).toBeInTheDocument()
    })

    it('should render step numbers', () => {
      renderWithProviders(<WizardNav currentStep={1} onStepClick={() => {}} />)

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should render arrows between steps', () => {
      const { container } = renderWithProviders(
        <WizardNav currentStep={1} onStepClick={() => {}} />
      )

      // Check for arrow icons (using lucide-react ArrowRight)
      const arrows = container.querySelectorAll('[data-testid="step-arrow"]')
      expect(arrows).toHaveLength(2) // 2 arrows between 3 steps
    })
  })

  describe('Current Step Indication', () => {
    it('should highlight step 1 when currentStep is 1', () => {
      renderWithProviders(<WizardNav currentStep={1} onStepClick={() => {}} />)

      const step1 = screen.getByText('1').closest('button')
      expect(step1).toHaveClass('active') // or whatever class indicates active
    })

    it('should highlight step 2 when currentStep is 2', () => {
      renderWithProviders(<WizardNav currentStep={2} onStepClick={() => {}} />)

      const step2 = screen.getByText('2').closest('button')
      expect(step2).toHaveClass('active')
    })

    it('should highlight step 3 when currentStep is 3', () => {
      renderWithProviders(<WizardNav currentStep={3} onStepClick={() => {}} />)

      const step3 = screen.getByText('3').closest('button')
      expect(step3).toHaveClass('active')
    })
  })

  describe('Completed Steps', () => {
    it('should mark step 1 as completed when on step 2', () => {
      renderWithProviders(<WizardNav currentStep={2} onStepClick={() => {}} />)

      const step1 = screen.getByLabelText('Step 1: Upload')
      expect(step1).toHaveClass('completed')
    })

    it('should mark steps 1 and 2 as completed when on step 3', () => {
      renderWithProviders(<WizardNav currentStep={3} onStepClick={() => {}} />)

      const step1 = screen.getByLabelText('Step 1: Upload')
      const step2 = screen.getByLabelText('Step 2: Configure')

      expect(step1).toHaveClass('completed')
      expect(step2).toHaveClass('completed')
    })

    it('should show checkmark for completed steps', () => {
      renderWithProviders(<WizardNav currentStep={3} onStepClick={() => {}} />)

      // Steps 1 and 2 should show checkmarks instead of numbers
      expect(screen.getAllByTestId('checkmark-icon')).toHaveLength(2)
    })
  })

  describe('Navigation', () => {
    it('should call onStepClick when clicking a previous step', async () => {
      const handleStepClick = vi.fn()
      const { user } = renderWithProviders(
        <WizardNav currentStep={3} onStepClick={handleStepClick} />
      )

      const step1 = screen.getByText('Upload').closest('button')
      await user.click(step1!)

      expect(handleStepClick).toHaveBeenCalledWith(1)
    })

    it('should not allow clicking future steps', async () => {
      const handleStepClick = vi.fn()
      const { user } = renderWithProviders(
        <WizardNav currentStep={1} onStepClick={handleStepClick} />
      )

      const step2 = screen.getByText('Configure').closest('button')
      expect(step2).toBeDisabled()

      await user.click(step2!)
      expect(handleStepClick).not.toHaveBeenCalled()
    })

    it('should allow clicking current step (no-op)', async () => {
      const handleStepClick = vi.fn()
      const { user } = renderWithProviders(
        <WizardNav currentStep={2} onStepClick={handleStepClick} />
      )

      const step2 = screen.getByText('Configure').closest('button')
      await user.click(step2!)

      expect(handleStepClick).toHaveBeenCalledWith(2)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for each step', () => {
      renderWithProviders(<WizardNav currentStep={1} onStepClick={() => {}} />)

      expect(screen.getByLabelText('Step 1: Upload')).toBeInTheDocument()
      expect(screen.getByLabelText('Step 2: Configure')).toBeInTheDocument()
      expect(screen.getByLabelText('Step 3: Results')).toBeInTheDocument()
    })

    it('should indicate current step with aria-current', () => {
      renderWithProviders(<WizardNav currentStep={2} onStepClick={() => {}} />)

      const step2 = screen.getByLabelText('Step 2: Configure')
      expect(step2).toHaveAttribute('aria-current', 'step')
    })

    it('should use nav element with appropriate role', () => {
      const { container } = renderWithProviders(
        <WizardNav currentStep={1} onStepClick={() => {}} />
      )

      const nav = container.querySelector('nav')
      expect(nav).toBeInTheDocument()
      expect(nav).toHaveAttribute('aria-label', 'Wizard steps')
    })

    it('should be keyboard navigable', () => {
      renderWithProviders(<WizardNav currentStep={2} onStepClick={() => {}} />)

      const step1 = screen.getByLabelText('Step 1: Upload')
      step1.focus()

      expect(step1).toHaveFocus()
    })
  })

  describe('Responsive Behavior', () => {
    it('should render step labels on desktop', () => {
      renderWithProviders(<WizardNav currentStep={1} onStepClick={() => {}} />)

      expect(screen.getByText('Upload')).toBeVisible()
      expect(screen.getByText('Configure')).toBeVisible()
      expect(screen.getByText('Results')).toBeVisible()
    })

    // Note: Testing responsive behavior properly requires mocking matchMedia
    // which is already done in vitest.setup.ts
  })

  describe('Edge Cases', () => {
    it('should handle invalid currentStep gracefully', () => {
      renderWithProviders(<WizardNav currentStep={99} onStepClick={() => {}} />)

      // Should still render without crashing
      expect(screen.getByText('Upload')).toBeInTheDocument()
    })

    it('should handle currentStep of 0', () => {
      renderWithProviders(<WizardNav currentStep={0} onStepClick={() => {}} />)

      // Should default to step 1 or handle gracefully
      expect(screen.getByText('Upload')).toBeInTheDocument()
    })
  })
})
