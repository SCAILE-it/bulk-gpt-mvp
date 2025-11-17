'use client'

import { useState, useCallback } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock } from 'lucide-react'
import { format, addHours, startOfTomorrow, addWeeks, addMonths } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DisabledButtonTooltip } from '@/components/ui/disabled-button-tooltip'
import type { CreateScheduleInput, ScheduleConfig, CSVDataSource } from '@/lib/types/schedules'
import { scheduleToCron, formatSchedule, type ScheduleType, type RecurrenceUnit } from '@/lib/utils/schedule-to-cron'

interface ScheduleWidgetProps {
  onScheduleCreated: () => void
  // Current configuration from BulkProcessor
  prompt: string
  outputFields: Array<{ name: string; type?: string }>
  selectedTools?: string[]
  selectedInputColumns?: string[]
  csvData?: CSVDataSource['csvData']
  csvFilename?: string
  disabled?: boolean
}

type QuickOption = {
  label: string
  getDate: () => Date
  getTime: () => string
}

export function ScheduleWidget({
  onScheduleCreated,
  prompt,
  outputFields,
  selectedTools = [],
  selectedInputColumns = [],
  csvData,
  csvFilename,
  disabled = false,
}: ScheduleWidgetProps) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [time, setTime] = useState('09:00')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('day')
  const [recurrenceValue, setRecurrenceValue] = useState(1)
  const [isCreating, setIsCreating] = useState(false)

  const quickOptions: QuickOption[] = [
    {
      label: 'In 1 hour',
      getDate: () => new Date(),
      getTime: () => {
        const in1h = addHours(new Date(), 1)
        return format(in1h, 'HH:mm')
      },
    },
    {
      label: 'In 2 hours',
      getDate: () => new Date(),
      getTime: () => {
        const in2h = addHours(new Date(), 2)
        return format(in2h, 'HH:mm')
      },
    },
    {
      label: 'Tomorrow',
      getDate: () => startOfTomorrow(),
      getTime: () => '09:00',
    },
    {
      label: 'Next week',
      getDate: () => addWeeks(new Date(), 1),
      getTime: () => '09:00',
    },
    {
      label: 'Next month',
      getDate: () => addMonths(new Date(), 1),
      getTime: () => '09:00',
    },
  ]

  const handleQuickOption = (option: QuickOption) => {
    setSelectedDate(option.getDate())
    setTime(option.getTime())
    setIsRecurring(false)
  }

  const handleCreate = useCallback(async () => {
    // Validate required fields only when creating
    if (!prompt.trim()) {
      toast.error('Please add a prompt before scheduling')
      return
    }
    
    if (!csvData || !csvFilename) {
      toast.error('Please upload a CSV file before scheduling')
      return
    }

    // Validate date is in the future
    const scheduleDateTime = new Date(selectedDate)
    const [hours, minutes] = time.split(':').map(Number)
    scheduleDateTime.setHours(hours, minutes, 0, 0)
    
    if (scheduleDateTime < new Date()) {
      toast.error('Schedule time must be in the future')
      return
    }

    setIsCreating(true)

    try {
      const scheduleType: ScheduleType = isRecurring ? 'recurring' : 'once'
      const cronExpression = scheduleToCron({
        type: scheduleType,
        date: selectedDate,
        time,
        recurrenceUnit: isRecurring ? recurrenceUnit : undefined,
        recurrenceValue: isRecurring ? recurrenceValue : undefined,
      })

      const config: ScheduleConfig = {
        prompt,
        outputFields,
        selectedTools,
        selectedInputColumns,
      }

      const scheduleData: CreateScheduleInput = {
        name: `Scheduled run - ${format(scheduleDateTime, 'MMM d, yyyy HH:mm')}`,
        cron_expression: cronExpression,
        timezone: 'UTC',
        action: 'run',
        config,
        csv_data: csvData,
        csv_filename: csvFilename,
        agent_type: 'bulk_agent',
      }

      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create schedule')
      }

      toast.success('Schedule created successfully')
      onScheduleCreated()
      setOpen(false)
      
      // Reset form
      setSelectedDate(new Date())
      setTime('09:00')
      setIsRecurring(false)
      setRecurrenceValue(1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create schedule')
    } finally {
      setIsCreating(false)
    }
  }, [
    selectedDate,
    time,
    isRecurring,
    recurrenceUnit,
    recurrenceValue,
    prompt,
    outputFields,
    selectedTools,
    selectedInputColumns,
    csvData,
    csvFilename,
    onScheduleCreated,
  ])

  const schedulePreview = formatSchedule({
    type: isRecurring ? 'recurring' : 'once',
    date: selectedDate,
    time,
    recurrenceUnit: isRecurring ? recurrenceUnit : undefined,
    recurrenceValue: isRecurring ? recurrenceValue : undefined,
  })

  const scheduleDateTime = new Date(selectedDate)
  const [hours, minutes] = time.split(':').map(Number)
  scheduleDateTime.setHours(hours, minutes, 0, 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className="flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-[40px] bg-secondary/50 border border-border/50 rounded-md text-xs sm:text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-label="Schedule batch processing"
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
        <div className="p-4 space-y-4">
          {/* Quick Options */}
          <div className="flex flex-wrap gap-1.5">
            {quickOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleQuickOption(option)}
                className="px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md"
            />
          </div>

          {/* Time and Recurring Row */}
          <div className="flex items-end gap-3 pt-4 border-t border-border">
            <div className="flex-1">
              <Label htmlFor="schedule-time" className="text-xs font-medium text-foreground mb-1.5 block">
                Time
              </Label>
              <Input
                id="schedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label htmlFor="recurring" className="text-xs font-medium cursor-pointer whitespace-nowrap">
                Recurring
              </Label>
            </div>
          </div>

          {/* Recurrence Options */}
          {isRecurring && (
            <div className="flex gap-2 pt-4 border-t border-border">
              <div className="flex-1">
                <Label htmlFor="recurrence-value" className="text-xs font-medium text-foreground mb-1.5 block">
                  Every
                </Label>
                <Input
                  id="recurrence-value"
                  type="number"
                  min="1"
                  value={recurrenceValue}
                  onChange={(e) => setRecurrenceValue(parseInt(e.target.value) || 1)}
                  className="h-9 text-sm"
                  placeholder="1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="recurrence-unit" className="text-xs font-medium text-foreground mb-1.5 block">
                  Unit
                </Label>
                <Select
                  value={recurrenceUnit}
                  onValueChange={(value) => setRecurrenceUnit(value as RecurrenceUnit)}
                >
                  <SelectTrigger id="recurrence-unit" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day(s)</SelectItem>
                    <SelectItem value="week">Week(s)</SelectItem>
                    <SelectItem value="month">Month(s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="bg-secondary/50 border border-border rounded-md p-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Preview</div>
            <div className="text-sm font-semibold text-foreground">{schedulePreview}</div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isCreating}
              className="flex-1 h-9 text-sm"
            >
              Cancel
            </Button>
            <DisabledButtonTooltip
              disabled={isCreating || scheduleDateTime < new Date() || !prompt.trim() || !csvData}
              reason={
                !prompt.trim() 
                  ? 'Please add a prompt before scheduling'
                  : !csvData
                  ? 'Please upload a CSV file before scheduling'
                  : scheduleDateTime < new Date()
                  ? 'Schedule time must be in the future'
                  : undefined
              }
            >
              <Button
                onClick={handleCreate}
                disabled={isCreating || scheduleDateTime < new Date() || !prompt.trim() || !csvData}
                className="flex-1 h-9 text-sm"
              >
                {isCreating ? (
                  <>
                    <div className="h-3.5 w-3.5 mr-1.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Schedule'
                )}
              </Button>
            </DisabledButtonTooltip>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

