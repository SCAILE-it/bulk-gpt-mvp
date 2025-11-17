/**
 * TableColumnToggle Component
 * 
 * Allows users to show/hide table columns to reduce information density.
 * Addresses P1 issue: "Information Density: Table shows many columns, may be overwhelming"
 */

'use client'

import React, { useState } from 'react'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

export interface ColumnConfig {
  /** Unique key for the column */
  key: string
  /** Display label */
  label: string
  /** Whether column is visible by default */
  defaultVisible?: boolean
  /** Whether column can be hidden */
  hideable?: boolean
}

interface TableColumnToggleProps {
  /** Column configurations */
  columns: ColumnConfig[]
  /** Callback when visibility changes */
  onVisibilityChange?: (visibleColumns: string[]) => void
  /** Additional className */
  className?: string
}

/**
 * Component for toggling table column visibility.
 * 
 * Usage:
 * ```tsx
 * <TableColumnToggle
 *   columns={[
 *     { key: 'filename', label: 'Filename', defaultVisible: true },
 *     { key: 'status', label: 'Status', defaultVisible: true },
 *     { key: 'created', label: 'Created', defaultVisible: false },
 *   ]}
 *   onVisibilityChange={(visible) => setVisibleColumns(visible)}
 * />
 * ```
 */
export function TableColumnToggle({
  columns,
  onVisibilityChange,
  className,
}: TableColumnToggleProps) {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const defaultVisible = columns
      .filter(col => col.defaultVisible !== false)
      .map(col => col.key)
    return new Set(defaultVisible)
  })

  const handleToggle = (key: string, checked: boolean) => {
    const newVisible = new Set(visibleColumns)
    if (checked) {
      newVisible.add(key)
    } else {
      newVisible.delete(key)
    }
    setVisibleColumns(newVisible)
    onVisibilityChange?.(Array.from(newVisible))
  }

  const visibleCount = visibleColumns.size
  const totalCount = columns.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2', className)}
          aria-label="Toggle table columns"
        >
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Columns</span>
          <span className="text-xs text-muted-foreground">
            ({visibleCount}/{totalCount})
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="font-medium text-xs text-foreground">Columns</div>
          <div className="space-y-1.5">
            {columns.map((column) => {
              const isVisible = visibleColumns.has(column.key)
              const canHide = column.hideable !== false && visibleCount > 1

              return (
                <div
                  key={column.key}
                  className="flex items-center gap-2.5 py-1"
                >
                  <Checkbox
                    id={column.key}
                    checked={isVisible}
                    onCheckedChange={(checked) => {
                      if (checked || canHide) {
                        handleToggle(column.key, checked as boolean)
                      }
                    }}
                    disabled={!isVisible && !canHide}
                    className="h-4 w-4"
                  />
                  <Label
                    htmlFor={column.key}
                    className={cn(
                      'text-xs font-normal cursor-pointer flex-1 leading-tight',
                      !isVisible && 'text-muted-foreground/70',
                      !canHide && !isVisible && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {column.label}
                  </Label>
                </div>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

