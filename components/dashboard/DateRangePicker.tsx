/**
 * Custom Date Range Picker Component
 * Supports preset ranges and custom date selection
 */

'use client'

import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek, subMonths } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type DateRangePreset = '7d' | '30d' | '90d' | 'all' | 'custom'

interface DateRangePickerProps {
  value: DateRangePreset | { from: Date; to: Date }
  onChange: (range: DateRangePreset | { from: Date; to: Date }) => void
  className?: string
}

const PRESETS = [
  { value: '7d' as const, label: 'Last 7 days' },
  { value: '30d' as const, label: 'Last 30 days' },
  { value: '90d' as const, label: 'Last 90 days' },
  { value: 'all' as const, label: 'All time' },
  { value: 'custom' as const, label: 'Custom range' },
]

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(
    typeof value === 'string' ? value : 'custom'
  )
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    typeof value === 'object' ? value : undefined
  )

  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset)
    if (preset !== 'custom') {
      onChange(preset)
      setIsOpen(false)
    } else {
      // Keep popover open for custom date selection
      if (!dateRange?.from) {
        // Initialize with last 30 days if no custom range set
        const to = new Date()
        const from = subDays(to, 30)
        setDateRange({ from, to })
      }
    }
  }

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range?.to) {
      onChange({ from: range.from, to: range.to })
      setIsOpen(false)
    }
  }

  const getDisplayText = () => {
    if (typeof value === 'string') {
      const preset = PRESETS.find(p => p.value === value)
      return preset?.label || value
    } else {
      return `${format(value.from, 'MMM d')} - ${format(value.to, 'MMM d, yyyy')}`
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full sm:w-[200px] h-8 text-xs justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <Calendar className="h-3 w-3 mr-1.5" />
          <span className="flex-1 truncate">{getDisplayText()}</span>
          <ChevronDown className="h-3 w-3 ml-auto opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b border-border">
          <Select value={selectedPreset} onValueChange={(v) => handlePresetChange(v as DateRangePreset)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedPreset === 'custom' && (
          <div className="p-3">
            <CalendarComponent
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              className="rounded-md"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}


