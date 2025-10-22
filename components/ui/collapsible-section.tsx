/**
 * ABOUTME: CollapsibleSection component for expandable/collapsible content sections
 * ABOUTME: Built on Radix UI Collapsible primitive with shadcn/ui styling
 */

'use client'

import * as React from 'react'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
}

const CollapsibleSection = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  CollapsibleSectionProps
>(
  (
    {
      title,
      children,
      defaultOpen = false,
      className,
      triggerClassName,
      contentClassName,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)

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
            'flex w-full items-center justify-between rounded-md p-4 text-left font-semibold transition-colors hover:bg-accent',
            triggerClassName
          )}
        >
          {title}
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent
          className={cn(
            'overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
            contentClassName
          )}
        >
          <div className="px-4 pb-4">{children}</div>
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
