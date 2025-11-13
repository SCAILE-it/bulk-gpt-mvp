/**
 * ABOUTME: CollapsibleSection component for expandable/collapsible content sections
 * ABOUTME: Built on Radix UI Collapsible primitive with shadcn/ui styling
 */

'use client'

import * as React from 'react'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { ChevronDown, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  /** Controlled mode: current open state */
  open?: boolean
  /** Controlled mode: callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** Uncontrolled mode: initial open state */
  defaultOpen?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
  /** Status indicator (e.g., 'ready', 'error', 'complete') */
  status?: 'ready' | 'error' | 'complete' | 'warning'
  /** Status message to display */
  statusMessage?: string
}

const CollapsibleSection = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  CollapsibleSectionProps
>(
  (
    {
      title,
      children,
      open: controlledOpen,
      onOpenChange,
      defaultOpen = false,
      className,
      triggerClassName,
      contentClassName,
      status,
      statusMessage,
      ...props
    },
    ref
  ) => {
    // Uncontrolled state (only used if open/onOpenChange not provided)
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)

    // Determine if controlled or uncontrolled
    const isControlled = controlledOpen !== undefined
    const isOpen = isControlled ? controlledOpen : uncontrolledOpen
    const setIsOpen = isControlled ? onOpenChange : setUncontrolledOpen

    // Status icon and color
    const statusConfig = {
      ready: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
      complete: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
      error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
      warning: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    }
    const statusInfo = status ? statusConfig[status] : null
    const StatusIcon = statusInfo?.icon

    return (
      <Collapsible
        ref={ref}
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn('space-y-2', className)}
        {...props}
      >
        <CollapsibleTrigger
          className={cn(
            'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            triggerClassName
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="truncate">{title}</span>
            {status && StatusIcon && (
              <div className={cn('flex items-center gap-1.5 flex-shrink-0', statusInfo.bg, 'px-1.5 py-0.5 rounded')}>
                <StatusIcon className={cn('h-3 w-3', statusInfo.color)} />
                {statusMessage && (
                  <span className={cn('text-[10px] font-medium', statusInfo.color)}>{statusMessage}</span>
                )}
              </div>
            )}
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent
          className={cn(
            'overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
            contentClassName
          )}
        >
          <div className="px-3 pb-3">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    )
  }
)
CollapsibleSection.displayName = 'CollapsibleSection'

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsibleSection,
}
