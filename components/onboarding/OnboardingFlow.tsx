/**
 * ABOUTME: Simple onboarding flow for first-time users
 * ABOUTME: Guides users through: Upload CSV -> Describe goal -> Get enriched CSV
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Upload, FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface OnboardingFlowProps {
  onDismiss: () => void
  onComplete: () => void
}

export function OnboardingFlow({ onDismiss, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1)

  // Check if user has seen onboarding before
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('bulk-gpt-onboarding-seen')
    if (hasSeenOnboarding === 'true') {
      onDismiss()
    }
  }, [onDismiss])

  const handleComplete = () => {
    localStorage.setItem('bulk-gpt-onboarding-seen', 'true')
    onComplete()
  }

  const steps = [
    {
      number: 1,
      icon: Upload,
      title: 'Upload your CSV',
      description: 'Upload a CSV file with your data. Each row will be processed individually.',
      example: 'Example: A CSV with names, emails, and descriptions'
    },
    {
      number: 2,
      icon: FileText,
      title: 'Describe what you want',
      description: 'Write a prompt describing what you want the AI to generate for each row.',
      example: 'Example: "Write a professional bio for {{name}} based on {{description}}"'
    },
    {
      number: 3,
      icon: Download,
      title: 'Get your enriched CSV',
      description: 'Download your CSV with AI-generated content added as new columns.',
      example: 'Example: Your original data plus new columns with AI-generated content'
    }
  ]

  const currentStep = steps[step - 1]
  const CurrentIcon = currentStep.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <div className="relative p-6">
          {/* Close button */}
          <button
            onClick={handleComplete}
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            aria-label="Skip onboarding"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((s) => (
              <div
                key={s.number}
                className={`h-2 rounded-full transition-all ${
                  s.number <= step ? 'bg-blue-600 w-8' : 'bg-zinc-700 w-2'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Step content */}
          <div className="text-center space-y-4 mb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 border-2 border-blue-500/20 flex items-center justify-center">
              <CurrentIcon className="h-8 w-8 text-blue-500" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-semibold text-zinc-100">
              {currentStep.title}
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              {currentStep.description}
            </p>
            <div className="mt-4 p-3 bg-zinc-900/50 border border-white/5 rounded-lg">
              <p className="text-sm text-zinc-500 mb-1">Example:</p>
              <p className="text-sm text-zinc-300 font-mono">
                {currentStep.example}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={step > 1 ? () => setStep(step - 1) : handleComplete}
            >
              {step > 1 ? 'Back' : 'Skip'}
            </Button>
            <div className="text-sm text-zinc-500">
              Step {step} of {steps.length}
            </div>
            <Button
              onClick={step < steps.length ? () => setStep(step + 1) : handleComplete}
            >
              {step < steps.length ? 'Next' : 'Get Started'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

