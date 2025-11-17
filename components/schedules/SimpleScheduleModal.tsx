'use client'

import { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarIcon, Clock, Play } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CreateScheduleInput, ScheduleConfig, CSVDataSource } from '@/lib/types/schedules'
import { scheduleToCron, formatSchedule, type ScheduleType, type RecurrenceUnit } from '@/lib/utils/schedule-to-cron'

interface SimpleScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onScheduleCreated: () => void
  // Current configuration from BulkProcessor
  prompt: string
  outputFields: Array<{ name: string; type?: string }>
  selectedTools?: string[]
  selectedInputColumns?: string[]
  csvData?: CSVDataSource['csvData']
  csvFilename?: string
}

export function SimpleScheduleModal({
  isOpen,
  onClose,
  onScheduleCreated,
  prompt,
  outputFields,
  selectedTools = [],
  selectedInputColumns = [],
  csvData,
  csvFilename,
}: SimpleScheduleModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [action, setAction] = useState<'test' | 'run'>('run')
  
  // Schedule options
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [time, setTime] = useState('09:00')
  const [scheduleType, setScheduleType] = useState<ScheduleType>('once')
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('day')
  const [recurrenceValue, setRecurrenceValue] = useState(1)
  
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Schedule name is required')
      return
    }

    if (!prompt.trim()) {
      toast.error('Prompt is required')
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
      const cronExpression = scheduleToCron({
        type: scheduleType,
        date: selectedDate,
        time,
        recurrenceUnit: scheduleType === 'recurring' ? recurrenceUnit : undefined,
        recurrenceValue: scheduleType === 'recurring' ? recurrenceValue : undefined,
      })

      const config: ScheduleConfig = {
        prompt,
        outputFields,
        selectedTools,
        selectedInputColumns,
      }

      const scheduleData: CreateScheduleInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        cron_expression: cronExpression,
        timezone: 'UTC', // Could be made configurable later
        action,
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
      onClose()
      
      // Reset form
      setName('')
      setDescription('')
      setSelectedDate(new Date())
      setTime('09:00')
      setScheduleType('once')
      setRecurrenceValue(1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create schedule')
    } finally {
      setIsCreating(false)
    }
  }, [
    name,
    description,
    selectedDate,
    time,
    scheduleType,
    recurrenceUnit,
    recurrenceValue,
    action,
    prompt,
    outputFields,
    selectedTools,
    selectedInputColumns,
    csvData,
    csvFilename,
    onClose,
    onScheduleCreated,
  ])

  const schedulePreview = formatSchedule({
    type: scheduleType,
    date: selectedDate,
    time,
    recurrenceUnit: scheduleType === 'recurring' ? recurrenceUnit : undefined,
    recurrenceValue: scheduleType === 'recurring' ? recurrenceValue : undefined,
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Run"
      titleIcon={CalendarIcon}
      titleIconColor="text-primary"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            {isCreating ? (
              <>
                <div className="h-4 w-4 mr-2 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Schedule
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              Schedule Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Daily lead enrichment"
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              Description (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enrich leads every morning"
              rows={2}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              Action *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAction('test')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors',
                  action === 'test'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary'
                )}
              >
                <Play className="h-3.5 w-3.5 inline mr-2" />
                Test (first row only)
              </button>
              <button
                type="button"
                onClick={() => setAction('run')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors',
                  action === 'run'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary'
                )}
              >
                <Play className="h-3.5 w-3.5 inline mr-2" />
                Run (all rows)
              </button>
            </div>
          </div>
        </div>

        {/* Schedule Configuration */}
        <div className="space-y-4 border-t border-border pt-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              Date & Time *
            </label>
            <div className="flex gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          {/* Schedule Type */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              Frequency *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setScheduleType('once')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors',
                  scheduleType === 'once'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary'
                )}
              >
                Once
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('recurring')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors',
                  scheduleType === 'recurring'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary'
                )}
              >
                Recurring
              </button>
            </div>
          </div>

          {/* Recurrence Options */}
          {scheduleType === 'recurring' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  Every
                </label>
                <Input
                  type="number"
                  min="1"
                  value={recurrenceValue}
                  onChange={(e) => setRecurrenceValue(parseInt(e.target.value) || 1)}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  Unit
                </label>
                <Select
                  value={recurrenceUnit}
                  onValueChange={(value) => setRecurrenceUnit(value as RecurrenceUnit)}
                >
                  <SelectTrigger className="w-full">
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
          <div className="bg-secondary/40 border border-border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Schedule Preview</div>
            <div className="text-sm font-medium text-foreground">{schedulePreview}</div>
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium text-foreground">Configuration Summary</p>
          <div className="bg-secondary/40 border border-border rounded-md p-3 space-y-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Prompt:</span> {prompt.substring(0, 100)}
              {prompt.length > 100 && '...'}
            </div>
            <div>
              <span className="font-medium">Output Fields:</span> {outputFields.map(f => f.name).join(', ') || 'None'}
            </div>
            {selectedTools.length > 0 && (
              <div>
                <span className="font-medium">Tools:</span> {selectedTools.join(', ')}
              </div>
            )}
            {csvFilename && (
              <div>
                <span className="font-medium">CSV File:</span> {csvFilename}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}


