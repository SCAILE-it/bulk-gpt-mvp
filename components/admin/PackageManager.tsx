/**
 * Package Manager Component
 * Create/edit/delete packages, configure agent runs
 */

'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, X, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import { AdminPackage, AdminPackageCreate } from '@/lib/types/packages'
import { AgentDefinition } from '@/lib/types/agents'

export function PackageManager() {
  const [packages, setPackages] = useState<AdminPackage[]>([])
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<AdminPackageCreate>({
    name: '',
    description: '',
    agent_configs: [],
    monthly_cost: 0,
  })

  useEffect(() => {
    fetchPackages()
    fetchAgents()
  }, [])

  const fetchPackages = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/packages')
      if (!response.ok) throw new Error('Failed to fetch packages')
      
      const data = await response.json()
      setPackages(data.packages || [])
    } catch (error) {
      console.error('Error fetching packages:', error)
      toast.error('Failed to load packages')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      if (!response.ok) return
      
      const data = await response.json()
      setAgents(data.agents || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const handleCreate = async () => {
    if (!formData.name || formData.agent_configs.length === 0 || !formData.monthly_cost) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to create package')

      toast.success('Package created')
      setIsCreating(false)
      setFormData({
        name: '',
        description: '',
        agent_configs: [],
        monthly_cost: 0,
      })
      fetchPackages()
    } catch (error) {
      console.error('Error creating package:', error)
      toast.error('Failed to create package')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return

    try {
      const response = await fetch(`/api/admin/packages/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete package')

      toast.success('Package deleted')
      fetchPackages()
    } catch (error) {
      console.error('Error deleting package:', error)
      toast.error('Failed to delete package')
    }
  }

  const addAgentConfig = () => {
    setFormData({
      ...formData,
      agent_configs: [
        ...formData.agent_configs,
        { agent_id: '', config: {} },
      ],
    })
  }

  const removeAgentConfig = (index: number) => {
    setFormData({
      ...formData,
      agent_configs: formData.agent_configs.filter((_, i) => i !== index),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-secondary/50 rounded animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-secondary/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Packages</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage pre-configured agent packages for clients
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsCreating(!isCreating)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isCreating ? 'Cancel' : 'Create Package'}
        </Button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="border border-border rounded-lg p-6 space-y-4 bg-secondary/20">
          <div className="space-y-2">
            <Label>Package Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Growth Starter Package"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this package includes..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Monthly Cost ($) *</Label>
            <Input
              type="number"
              value={formData.monthly_cost}
              onChange={(e) => setFormData({ ...formData, monthly_cost: parseFloat(e.target.value) || 0 })}
              placeholder="1500.00"
            />
            <p className="text-xs text-muted-foreground">
              Clients will receive {((formData.monthly_cost || 0) * 0.1).toFixed(2)} in self-service credits (10%)
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Agent Configurations *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAgentConfig}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Agent
              </Button>
            </div>

            {formData.agent_configs.map((config, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border border-border rounded bg-background">
                <select
                  value={config.agent_id}
                  onChange={(e) => {
                    const newConfigs = [...formData.agent_configs]
                    newConfigs[index] = { ...config, agent_id: e.target.value }
                    setFormData({ ...formData, agent_configs: newConfigs })
                  }}
                  className="flex-1 px-3 py-1.5 text-sm border border-border rounded bg-background"
                >
                  <option value="">Select agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAgentConfig(index)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <Button onClick={handleCreate} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Create Package
          </Button>
        </div>
      )}

      {/* Packages List */}
      {packages.length === 0 ? (
        <EmptyState
          icon={Box}
          title="No packages yet"
          description="Create your first package to get started"
        />
      ) : (
        <div className="space-y-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="border border-border rounded-lg p-4 bg-secondary/20"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium">{pkg.name}</h3>
                    <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {pkg.description && (
                    <p className="text-xs text-muted-foreground mb-2">{pkg.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>${pkg.monthly_cost.toFixed(2)}/month</span>
                    <span>•</span>
                    <span>${(pkg.monthly_cost * 0.1).toFixed(2)} credits included</span>
                    <span>•</span>
                    <span>{pkg.agent_configs.length} agent{pkg.agent_configs.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(pkg.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

