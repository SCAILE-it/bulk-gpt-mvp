"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = ({ children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider delayDuration={0} skipDelayDuration={0} {...props}>
    {children}
  </TooltipPrimitive.Provider>
)

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  // Aggressive inline styles to override Radix's transform animations
  // Note: !important not supported in inline styles, CSS handles that
  const noAnimationStyle: React.CSSProperties = {
    animation: 'none',
    animationName: 'none',
    animationDuration: '0ms',
    animationDelay: '0ms',
    transition: 'none',
    transitionProperty: 'none',
    transitionDuration: '0ms',
    transitionDelay: '0ms',
    transform: 'none',
    translate: 'none',
    opacity: 1,
    willChange: 'auto',
  }

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground",
          className
        )}
        style={noAnimationStyle}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
