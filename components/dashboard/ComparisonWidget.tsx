/**
 * Comparison Widget Component
 * Displays side-by-side comparison of current vs previous period metrics
 */

'use client'

import React, { memo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComparisonWidgetProps {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  current: {
    label: string
    value: number | string
    formatValue?: (value: number | string) => string
  }
  previous: {
    label: string
    value: number | string
    formatValue?: (value: number | string) => string
  }
  comparison?: {
    percent: number
    isIncrease: boolean
  } | null
  className?: string
  isMobile?: boolean
}

export const ComparisonWidget = memo(function ComparisonWidget({
  title,
  icon: Icon,
  current,
  previous,
  comparison,
  className,
  isMobile = false,
}: ComparisonWidgetProps) {
  const formatValue = (value: number | string, formatter?: (val: number | string) => string) => {
    if (formatter) return formatter(value)
    if (typeof value === 'number') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
      return value.toLocaleString()
    }
    return value.toString()
  }

  return (
    <div className={cn('bg-secondary/40 border border-border rounded-lg p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className={cn('text-muted-foreground', isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5')} />}
        <h3 className={cn('font-medium', isMobile ? 'text-sm' : 'text-xs')}>{title}</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Current Period */}
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
            {current.label}
          </div>
          <div className={cn('font-semibold', isMobile ? 'text-base' : 'text-sm')}>
            {formatValue(current.value, current.formatValue)}
          </div>
          {comparison && comparison.percent > 0.1 && (
            <div className={cn(
              'flex items-center gap-0.5 text-[10px] mt-1',
              comparison.isIncrease ? 'text-amber-400' : 'text-green-400'
            )}>
              {comparison.isIncrease ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{comparison.percent.toFixed(0)}%</span>
            </div>
          )}
        </div>
        
        {/* Previous Period */}
        <div className="space-y-1 border-l border-border/50 pl-3">
          <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
            {previous.label}
          </div>
          <div className={cn('font-semibold text-muted-foreground', isMobile ? 'text-base' : 'text-sm')}>
            {formatValue(previous.value, previous.formatValue)}
          </div>
          {comparison && comparison.percent <= 0.1 && (
            <div className="flex items-center gap-0.5 text-[10px] mt-1 text-muted-foreground">
              <Minus className="h-3 w-3" />
              <span>No change</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

