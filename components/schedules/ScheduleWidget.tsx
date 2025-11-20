'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Clock, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react'
import { format, addHours, startOfTomorrow, addWeeks, addMonths } from 'date-fns'
import { toast } from 'sonner'
import type { CreateScheduleInput, ScheduleConfig, CSVDataSource } from '@/lib/types/schedules'
import { scheduleToCron, formatSchedule } from '@/lib/utils/schedule-to-cron'

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
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [time, setTime] = useState('09:00')
  const [isCreating, setIsCreating] = useState(false)

  // Get user timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

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
      label: 'Tomorrow 9am',
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

  const createSchedule = useCallback(async (scheduleDate: Date, scheduleTime: string) => {
    // Validate required fields
    if (!prompt.trim()) {
      toast.error('Please add a prompt before scheduling')
      return false
    }
    
    if (!csvData || !csvFilename) {
      toast.error('Please upload a CSV file before scheduling')
      return false
    }

    // Validate date is in the future
    const scheduleDateTime = new Date(scheduleDate)
    const [hours, minutes] = scheduleTime.split(':').map(Number)
    scheduleDateTime.setHours(hours, minutes, 0, 0)
    
    if (scheduleDateTime < new Date()) {
      toast.error('Schedule time must be in the future')
      return false
    }

    setIsCreating(true)

    try {
      const cronExpression = scheduleToCron({
        type: 'once',
        date: scheduleDate,
        time: scheduleTime,
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
        timezone: userTimezone,
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

      toast.success('Schedule created successfully!', {
        description: `Will process ${csvData?.rows?.length || 0} rows at ${format(scheduleDateTime, 'MMM d, yyyy h:mm a')}`,
        action: {
          label: 'View Schedules',
          onClick: () => router.push('/log?tab=scheduled')
        }
      })
      
      onScheduleCreated()
      setOpen(false)
      
      // Reset form
      setSelectedDate(new Date())
      setTime('09:00')
      setShowCustom(false)
      
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create schedule')
      return false
    } finally {
      setIsCreating(false)
    }
  }, [
    prompt,
    outputFields,
    selectedTools,
    selectedInputColumns,
    csvData,
    csvFilename,
    onScheduleCreated,
    router,
    userTimezone,
  ])

  const handleQuickSchedule = async (option: QuickOption) => {
    const scheduleDate = option.getDate()
    const scheduleTime = option.getTime()
    await createSchedule(scheduleDate, scheduleTime)
  }

  const handleCustomSchedule = async () => {
    await createSchedule(selectedDate, time)
  }

  const scheduleDateTime = new Date(selectedDate)
  const [hours, minutes] = time.split(':').map(Number)
  scheduleDateTime.setHours(hours, minutes, 0, 0)

  const schedulePreview = formatSchedule({
    type: 'once',
    date: selectedDate,
    time,
  })

  const hasValidConfig = prompt.trim() && csvData && csvFilename

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className="flex items-center justify-center gap-2 px-2 md:px-3 py-2 md:py-2.5 min-h-[38px] md:min-h-[40px] bg-secondary/50 border border-border/50 rounded-md text-xs md:text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-label="Schedule batch processing"
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="p-4 space-y-4">
          {/* Validation Warnings */}
          {!prompt.trim() && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Prompt required</div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">Add a prompt in the Task section to enable scheduling</div>
              </div>
            </div>
          )}

          {!csvData && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-yellow-900 dark:text-yellow-200">CSV file required</div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">Upload a CSV file to enable scheduling</div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {hasValidConfig && (
            <>
              <div>
                <div className="text-sm font-semibold text-foreground mb-2">Quick Schedule</div>
                <div className="grid grid-cols-2 gap-2">
                  {quickOptions.map((option) => (
                    <Button
                      key={option.label}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickSchedule(option)}
                      disabled={isCreating}
                      className="justify-start h-auto py-2"
                    >
                      <Clock className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                      <span className="text-xs">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Date/Time Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustom(!showCustom)}
                className="w-full justify-between"
              >
                <span className="text-sm">Custom date & time</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
              </Button>

              {/* Custom Date/Time Picker */}
              {showCustom && (
                <div className="space-y-3 pt-2 border-t border-border">
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

                  {/* Time Picker */}
                  <div>
                    <Label htmlFor="schedule-time" className="text-sm font-medium text-foreground mb-2 block">
                      Time ({userTimezone})
                    </Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  {/* Preview */}
                  <div className="bg-primary/10 border-2 border-primary/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground">Ready to schedule</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Will process {csvData?.rows?.length || 0} rows from {csvFilename}
                        </div>
                        <div className="text-sm font-medium text-foreground mt-2">
                          {schedulePreview}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Schedule Button */}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCustom(false)}
                      disabled={isCreating}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCustomSchedule}
                      disabled={isCreating || scheduleDateTime < new Date()}
                      size="sm"
                      className="flex-1"
                    >
                      {isCreating ? (
                        <>
                          <div className="h-3.5 w-3.5 mr-2 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        'Schedule Processing'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Info Footer */}
          {hasValidConfig && !showCustom && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
              Schedules will be visible in the LOG page
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
