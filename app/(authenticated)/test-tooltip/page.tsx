/**
 * Minimal tooltip test page for debugging animations
 */

'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

export default function TestTooltipPage() {
  const [showDebug, setShowDebug] = useState(false)
  const [tooltipStates, setTooltipStates] = useState<Array<{
    index: number
    transform: string
    animation: string
    opacity: string
  }>>([])

  useEffect(() => {
    const interval = setInterval(() => {
      const tooltips = document.querySelectorAll('[data-radix-tooltip-content]')
      const states = Array.from(tooltips).map((tooltip, index) => {
        const computed = window.getComputedStyle(tooltip)
        return {
          index,
          transform: computed.transform,
          animation: computed.animation,
          opacity: computed.opacity,
        }
      })
      setTooltipStates(states)
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">Tooltip Animation Debug Test</h1>
      
      <div className="mb-4">
        <Button onClick={() => setShowDebug(!showDebug)}>
          {showDebug ? 'Hide' : 'Show'} Debug Info
        </Button>
      </div>

      {showDebug && (
        <div className="mb-6 p-4 bg-secondary/40 border border-border rounded-lg">
          <h2 className="text-sm font-medium mb-2">Debug Info</h2>
          <p className="text-xs text-muted-foreground mb-2">
            Open browser DevTools and inspect tooltip elements when hovering.
          </p>
          <p className="text-xs text-muted-foreground">
            Look for: <code className="bg-background px-1 rounded">[data-radix-tooltip-content]</code>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Check computed styles for: <code className="bg-background px-1 rounded">transform</code>, <code className="bg-background px-1 rounded">animation</code>
          </p>
        </div>
      )}

      <div className="space-y-8">
        {/* Test 1: Simple tooltip */}
        <div className="p-6 bg-secondary/40 border border-border rounded-lg">
          <h2 className="text-sm font-medium mb-4">Test 1: Simple Tooltip</h2>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Simple tooltip text</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Test 2: Tooltip with different sides */}
        <div className="p-6 bg-secondary/40 border border-border rounded-lg">
          <h2 className="text-sm font-medium mb-4">Test 2: Different Sides</h2>
          <div className="flex flex-wrap gap-4">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Top</Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Tooltip on top
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Bottom</Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Tooltip on bottom
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Left</Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  Tooltip on left
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Right</Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Tooltip on right
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Test 3: Multiple tooltips */}
        <div className="p-6 bg-secondary/40 border border-border rounded-lg">
          <h2 className="text-sm font-medium mb-4">Test 3: Multiple Tooltips</h2>
          <div className="flex flex-wrap gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <TooltipProvider key={i} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Button {i}</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Tooltip {i}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Test 4: Icon button tooltip */}
        <div className="p-6 bg-secondary/40 border border-border rounded-lg">
          <h2 className="text-sm font-medium mb-4">Test 4: Icon Button (like in BulkProcessor)</h2>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded transition-colors"
                  aria-label="Reset configuration"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Reset configuration
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Test 5: Long tooltip text */}
        <div className="p-6 bg-secondary/40 border border-border rounded-lg">
          <h2 className="text-sm font-medium mb-4">Test 5: Long Tooltip Text</h2>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover for long text</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>This is a longer tooltip message that should wrap to multiple lines and test how the tooltip behaves with more content.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <h2 className="text-sm font-medium mb-2">Debugging Instructions</h2>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Open browser DevTools (F12 or Cmd+Option+I)</li>
          <li>Go to Console tab</li>
          <li>Hover over any button above</li>
          <li>Watch for <code className="bg-background px-1 rounded">[Tooltip Debug]</code> logs</li>
          <li>In Elements tab, find <code className="bg-background px-1 rounded">[data-radix-tooltip-content]</code></li>
          <li>Check computed styles for transform/animation values</li>
          <li>Look for any CSS animations being applied</li>
        </ol>
      </div>

      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h2 className="text-sm font-medium mb-2">What to Check</h2>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Does tooltip fly in from top-left? (visual check)</li>
          <li>Are transforms being applied? (check console logs)</li>
          <li>Are animations being applied? (check computed styles)</li>
          <li>Is MutationObserver catching changes? (check console)</li>
          <li>Is interval removing transforms? (check console)</li>
        </ul>
      </div>

      {showDebug && tooltipStates.length > 0 && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <h2 className="text-sm font-medium mb-2">Live Tooltip States ({tooltipStates.length} active)</h2>
          <div className="space-y-2">
            {tooltipStates.map((state, i) => (
              <div key={i} className="text-xs font-mono bg-background p-2 rounded">
                <div>Tooltip {state.index}:</div>
                <div className={state.transform !== 'none' ? 'text-red-400' : 'text-green-400'}>
                  transform: {state.transform}
                </div>
                <div className={state.animation !== 'none' ? 'text-red-400' : 'text-green-400'}>
                  animation: {state.animation}
                </div>
                <div>opacity: {state.opacity}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

