/**
 * AgentRunModal Component
 * Modal for running agents with configuration
 */

'use client'

import { useState, useEffect } from 'react'
import { Play, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { AgentDefinition } from '@/lib/types/agent-definitions'
import type { AgentRunRequest } from '@/lib/types/agents'
import { DisabledButtonTooltip } from '@/components/ui/disabled-button-tooltip'

interface AgentRunModalProps {
  agent: AgentDefinition | null
  open: boolean
  onClose: () => void
}

export function AgentRunModal({ agent, open, onClose }: AgentRunModalProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [inputResourceIds, setInputResourceIds] = useState<string[]>([])
  const [enableSchedule, setEnableSchedule] = useState(false)
  const [scheduleCron, setScheduleCron] = useState('0 9 * * *')
  const [availableResources, setAvailableResources] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    if (open && agent) {
      setConfig({})
      setInputResourceIds([])
      setEnableSchedule(false)
      setScheduleCron('0 9 * * *')

      if (agent.input_type === 'leads' || agent.input_type === 'keywords') {
        fetchAvailableResources(agent.input_type)
      }
    }
  }, [open, agent])

  const fetchAvailableResources = async (type: 'leads' | 'keywords') => {
    try {
      const response = await fetch(`/api/resources?type=${type}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        const resources = (data.resources || []).map((r: { id: string; data?: { name?: string; keyword?: string; email?: string } }) => ({
          id: r.id,
          name: r.data?.name || r.data?.keyword || r.data?.email || r.id,
        }))
        setAvailableResources(resources)
      }
    } catch (error) {
      console.error('Error fetching resources:', error)
    }
  }

  const handleRun = async () => {
    if (!agent) return

    try {
      setIsRunning(true)

      const request: AgentRunRequest = {
        agent_id: agent.id,
        config,
        ...(inputResourceIds.length > 0 && { input_resource_ids: inputResourceIds }),
        ...(enableSchedule && {
          schedule: {
            cron: scheduleCron,
            enabled: true,
          },
        }),
      }

      const response = await fetch(`/api/agents/${agent.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to run agent')
      }

      const data = await response.json()
      toast.success(`Started ${agent.name}${data.batch_id ? ` (Batch: ${data.batch_id})` : ''}`, {
        description: 'Batch is processing. Status will update automatically.',
        duration: 5000,
      })
      
      // Trigger refresh of agents list to show updated status
      // The parent component (AgentsList) polls every 5 seconds
      onClose()
    } catch (error: unknown) {
      console.error('Error running agent:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to run agent')
    } finally {
      setIsRunning(false)
    }
  }

  if (!agent) return null

  const needsInput = agent.input_type !== 'none'
  const canSchedule = agent.can_schedule

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Run {agent.name}</DialogTitle>
          <DialogDescription>
            {agent.description || 'Configure and run this agent'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Agent Info */}
          <div className="bg-secondary/40 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Input:</span>
              <span className="font-medium">{agent.input_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Output:</span>
              <span className="font-medium">{agent.output_type}</span>
            </div>
          </div>

          {/* Input Resource Selection */}
          {needsInput && (
            <div className="space-y-2">
              <Label>
                Select {agent.input_type === 'leads' ? 'Leads' : agent.input_type === 'keywords' ? 'Keywords' : 'Input'}
              </Label>
              {availableResources.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {availableResources.map((resource) => (
                    <div key={resource.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={resource.id}
                        checked={inputResourceIds.includes(resource.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setInputResourceIds([...inputResourceIds, resource.id])
                          } else {
                            setInputResourceIds(inputResourceIds.filter(id => id !== resource.id))
                          }
                        }}
                      />
                      <Label htmlFor={resource.id} className="text-sm font-normal cursor-pointer flex-1">
                        {resource.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No {agent.input_type} resources available. Create some in the Resources page first.
                </p>
              )}
            </div>
          )}

          {/* Agent-Specific Configuration */}
          <div className="space-y-2">
            <Label>Configuration</Label>
            <div className="space-y-3">
              {agent.id === 'bulk' && (
                <div>
                  <Label htmlFor="prompt" className="text-sm">Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Enter your prompt..."
                    value={(config.prompt as string) || ''}
                    onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              )}

              {agent.id === 'lead_crawler' && (
                <>
                  <div>
                    <Label htmlFor="target_urls" className="text-sm">Target URLs (one per line)</Label>
                    <Textarea
                      id="target_urls"
                      placeholder="https://example.com&#10;https://another.com"
                      value={(config.target_urls as string) || ''}
                      onChange={(e) => setConfig({ ...config, target_urls: e.target.value })}
                      className="mt-1 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_leads" className="text-sm">Max Leads</Label>
                    <Input
                      id="max_leads"
                      type="number"
                      placeholder="100"
                      value={(config.max_leads as number) || ''}
                      onChange={(e) => setConfig({ ...config, max_leads: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                </>
              )}

              {agent.id === 'aeo_analytics' && (
                <div>
                  <Label htmlFor="domain" className="text-sm">Your Domain (Optional)</Label>
                  <Input
                    id="domain"
                    placeholder="example.com"
                    value={(config.domain as string) || ''}
                    onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Provide your domain to check current rankings for these keywords
                  </p>
                </div>
              )}

              {agent.id === 'seo_content_writer' && (
                <>
                  <div>
                    <Label htmlFor="keywords" className="text-sm">Keywords (comma-separated)</Label>
                    <Input
                      id="keywords"
                      placeholder="keyword1, keyword2"
                      value={(config.keywords as string) || ''}
                      onChange={(e) => setConfig({ ...config, keywords: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tone" className="text-sm">Tone</Label>
                    <Select
                      value={(config.tone as string) || 'professional'}
                      onValueChange={(value) => setConfig({ ...config, tone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {!['bulk', 'lead_crawler', 'seo_content_writer', 'aeo_analytics'].includes(agent.id) && (
                <div>
                  <Label htmlFor="config_json" className="text-sm">Configuration (JSON)</Label>
                  <Textarea
                    id="config_json"
                    placeholder='{"key": "value"}'
                    value={JSON.stringify(config, null, 2)}
                    onChange={(e) => {
                      try {
                        setConfig(JSON.parse(e.target.value))
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="mt-1 font-mono min-h-[100px]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Schedule Configuration */}
          {canSchedule && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable_schedule"
                  checked={enableSchedule}
                  onCheckedChange={(checked) => setEnableSchedule(checked === true)}
                />
                <Label htmlFor="enable_schedule" className="cursor-pointer">
                  Schedule Recurring Runs
                </Label>
              </div>

              {enableSchedule && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="cron" className="text-sm">Cron Expression</Label>
                  <Input
                    id="cron"
                    placeholder="0 9 * * *"
                    value={scheduleCron}
                    onChange={(e) => setScheduleCron(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: <code className="bg-secondary/50 px-1 rounded">0 9 * * *</code> (daily at 9am)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isRunning}>
            Cancel
          </Button>
          <DisabledButtonTooltip
            reason={
              isRunning
                ? 'Agent is currently running'
                : needsInput && inputResourceIds.length === 0
                ? `Please select at least one ${agent.input_type === 'leads' ? 'lead' : agent.input_type === 'keywords' ? 'keyword' : 'resource'} to use as input`
                : 'Ready to run'
            }
          >
            <Button
              disabled={isRunning || (needsInput && inputResourceIds.length === 0)}
              onClick={handleRun}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Now
                </>
              )}
            </Button>
          </DisabledButtonTooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
