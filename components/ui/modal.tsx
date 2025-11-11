/**
 * ABOUTME: Reusable modal component with focus trap and accessibility
 * ABOUTME: Follows shadcn/ui pattern for consistent modal dialogs across the app
 */

'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/utils'

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Modal title */
  title: string
  /** Icon component to display next to title */
  titleIcon?: React.ComponentType<{ className?: string }>
  /** Color class for title icon (e.g. 'text-blue-400') */
  titleIconColor?: string
  /** Modal content */
  children: React.ReactNode
  /** Optional footer content (buttons, actions) */
  footer?: React.ReactNode
  /** Modal size variant */
  size?: 'sm' | 'md' | 'lg'
  /** ID for aria-labelledby (defaults to generated ID) */
  ariaLabelledBy?: string
  /** Additional className for dialog container */
  className?: string
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  titleIcon: TitleIcon,
  titleIconColor = 'text-zinc-400',
  children,
  footer,
  size = 'md',
  ariaLabelledBy,
  className,
}: ModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen)
  const generatedId = React.useId()
  const titleId = ariaLabelledBy || `modal-title-${generatedId}`

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      tabIndex={-1}
    >
      <div
        ref={modalRef}
        className={cn(
          'bg-zinc-900 border border-white/10 rounded-lg shadow-2xl w-full overflow-hidden',
          sizeClasses[size],
          footer ? 'flex flex-col' : '',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
      >
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between p-6 border-b border-white/5',
          footer ? 'flex-shrink-0' : ''
        )}>
          <div className="flex items-center gap-3">
            {TitleIcon && <TitleIcon className={cn('h-5 w-5', titleIconColor)} />}
            <h2 id={titleId} className="text-lg font-medium text-zinc-100">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label={`Close ${title}`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className={cn(
          footer ? 'flex-1 overflow-y-auto p-6' : 'p-6'
        )}>
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="flex items-center justify-end p-6 border-t border-white/5 bg-zinc-900/50 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
