/**
 * ABOUTME: Wizard navigation component showing 3-step progress
 * ABOUTME: Displays step numbers, labels, arrows, and handles navigation
 */

'use client'

import React from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface WizardNavProps {
  currentStep: 1 | 2 | 3 | number
  onStepClick: (step: number) => void
}

const STEPS = [
  { number: 1, label: 'Upload' },
  { number: 2, label: 'Configure' },
  { number: 3, label: 'Results' },
] as const

export default function WizardNav({ currentStep, onStepClick }: WizardNavProps) {
  // Normalize currentStep to valid range
  const normalizedStep = Math.max(1, Math.min(3, currentStep))

  const isStepCompleted = (stepNumber: number) => normalizedStep > stepNumber
  const isStepCurrent = (stepNumber: number) => normalizedStep === stepNumber
  const isStepAccessible = (stepNumber: number) => stepNumber <= normalizedStep

  return (
    <nav
      className="border-b p-4"
      aria-label="Wizard steps"
    >
      <div className="flex items-center justify-center gap-8">
        {STEPS.map((step, index) => (
          <div key={step.number} className="flex items-center gap-8">
            {/* Step Button */}
            <Button
              variant="ghost"
              disabled={!isStepAccessible(step.number)}
              onClick={() => onStepClick(step.number)}
              aria-label={`Step ${step.number}: ${step.label}`}
              aria-current={isStepCurrent(step.number) ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2',
                isStepCurrent(step.number) && 'active',
                isStepCompleted(step.number) && 'completed'
              )}
            >
              {/* Step Number / Checkmark */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full font-semibold',
                  isStepCurrent(step.number) &&
                    'bg-primary text-primary-foreground',
                  isStepCompleted(step.number) && 'bg-green-500 text-white',
                  !isStepCurrent(step.number) &&
                    !isStepCompleted(step.number) &&
                    'bg-muted text-muted-foreground'
                )}
              >
                {isStepCompleted(step.number) ? (
                  <Check
                    className="h-4 w-4"
                    data-testid="checkmark-icon"
                    aria-label="Completed"
                  />
                ) : (
                  step.number
                )}
              </div>

              {/* Step Label */}
              <span
                className={cn(
                  'text-sm',
                  isStepCurrent(step.number) && 'font-semibold'
                )}
              >
                {step.label}
              </span>
            </Button>

            {/* Arrow Between Steps */}
            {index < STEPS.length - 1 && (
              <ArrowRight
                className="h-4 w-4 text-muted-foreground"
                data-testid="step-arrow"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </nav>
  )
}
