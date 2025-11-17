/**
 * CreateResourceModal Component
 * Modal for manually creating resources (leads, keywords, content, campaigns)
 */

'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { ResourceType, ResourceCreate } from '@/lib/types/resources'

interface CreateResourceModalProps {
  type: ResourceType
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateResourceModal({ type, open, onClose, onCreated }: CreateResourceModalProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setFormData({})
    }
  }, [open])

  const getTypeLabel = () => {
    switch (type) {
      case 'lead': return 'Lead'
      case 'keyword': return 'Keyword'
      case 'content': return 'Content'
      case 'campaign': return 'Campaign'
    }
  }

  const handleCreate = async () => {
    try {
      setIsCreating(true)

      // Build resource data based on type
      let resourceData: Record<string, unknown> = {}
      
      switch (type) {
        case 'lead':
          resourceData = {
            email: formData.email || '',
            name: formData.name || '',
            company: formData.company || '',
            title: formData.title || '',
            phone: formData.phone || '',
            website: formData.website || '',
            linkedin_url: formData.linkedin_url || '',
            ...formData,
          }
          break
        case 'keyword':
          resourceData = {
            keyword: formData.keyword || '',
            search_volume: formData.search_volume ? parseInt(String(formData.search_volume)) : null,
            difficulty: formData.difficulty ? parseInt(String(formData.difficulty)) : null,
            cpc: formData.cpc ? parseFloat(String(formData.cpc)) : null,
            competition: formData.competition || '',
            ...formData,
          }
          break
        case 'content':
          resourceData = {
            title: formData.title || '',
            content: formData.content || '',
            content_type: formData.content_type || 'manual',
            word_count: formData.content ? String(formData.content).split(/\s+/).length : 0,
            ...formData,
          }
          break
        case 'campaign':
          resourceData = {
            name: formData.name || '',
            status: formData.status || 'draft',
            type: formData.type || 'email',
            target_lead_ids: formData.target_lead_ids || [],
            content_ids: formData.content_ids || [],
            metrics: formData.metrics || {},
            ...formData,
          }
          break
      }

      const resource: ResourceCreate = {
        type,
        data: resourceData,
        source_type: 'customer',
        source_name: 'manual',
        tags: formData.tags ? String(formData.tags).split(',').map(t => t.trim()) : [],
      }

      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resource),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create resource')
      }

      toast.success(`${getTypeLabel()} created successfully`)
      onCreated()
      onClose()
    } catch (error: unknown) {
      console.error('Error creating resource:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create resource')
    } finally {
      setIsCreating(false)
    }
  }

  const renderFormFields = () => {
    switch (type) {
      case 'lead':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={(formData.email as string) || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="name" className="text-sm">Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={(formData.name as string) || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="company" className="text-sm">Company</Label>
              <Input
                id="company"
                placeholder="Acme Inc"
                value={(formData.company as string) || ''}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="title" className="text-sm">Title</Label>
              <Input
                id="title"
                placeholder="CEO"
                value={(formData.title as string) || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="text-sm">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={(formData.phone as string) || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="website" className="text-sm">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={(formData.website as string) || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="linkedin_url" className="text-sm">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                type="url"
                placeholder="https://linkedin.com/in/johndoe"
                value={(formData.linkedin_url as string) || ''}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              />
            </div>
          </div>
        )

      case 'keyword':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyword" className="text-sm">Keyword *</Label>
              <Input
                id="keyword"
                placeholder="best marketing tools"
                value={(formData.keyword as string) || ''}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="search_volume" className="text-sm">Search Volume</Label>
                <Input
                  id="search_volume"
                  type="number"
                  placeholder="1000"
                  value={(formData.search_volume as number) || ''}
                  onChange={(e) => setFormData({ ...formData, search_volume: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="difficulty" className="text-sm">Difficulty (0-100)</Label>
                <Input
                  id="difficulty"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="50"
                  value={(formData.difficulty as number) || ''}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cpc" className="text-sm">CPC ($)</Label>
                <Input
                  id="cpc"
                  type="number"
                  step="0.01"
                  placeholder="2.50"
                  value={(formData.cpc as number) || ''}
                  onChange={(e) => setFormData({ ...formData, cpc: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="competition" className="text-sm">Competition</Label>
                <Select
                  value={(formData.competition as string) || 'medium'}
                  onValueChange={(value) => setFormData({ ...formData, competition: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 'content':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm">Title *</Label>
              <Input
                id="title"
                placeholder="Content Title"
                value={(formData.title as string) || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="content_type" className="text-sm">Content Type</Label>
              <Select
                value={(formData.content_type as string) || 'manual'}
                onValueChange={(value) => setFormData({ ...formData, content_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="blog">Blog Post</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="landing">Landing Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="content" className="text-sm">Content *</Label>
              <Textarea
                id="content"
                placeholder="Enter your content here..."
                value={(formData.content as string) || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="min-h-[200px]"
                required
              />
            </div>
          </div>
        )

      case 'campaign':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="Q1 Email Campaign"
                value={(formData.name as string) || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type" className="text-sm">Campaign Type</Label>
                <Select
                  value={(formData.type as string) || 'email'}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="ads">Ads</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status" className="text-sm">Status</Label>
                <Select
                  value={(formData.status as string) || 'draft'}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description" className="text-sm">Description</Label>
              <Textarea
                id="description"
                placeholder="Campaign description..."
                value={(formData.description as string) || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
          </div>
        )
    }
  }

  const isFormValid = () => {
    switch (type) {
      case 'lead':
        return !!(formData.email as string)
      case 'keyword':
        return !!(formData.keyword as string)
      case 'content':
        return !!(formData.title as string) && !!(formData.content as string)
      case 'campaign':
        return !!(formData.name as string)
      default:
        return false
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create {getTypeLabel()}</DialogTitle>
          <DialogDescription>
            Add a new {type.toLowerCase()} resource manually
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {renderFormFields()}

          {/* Tags (optional, for all types) */}
          <div>
            <Label htmlFor="tags" className="text-sm">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="tag1, tag2, tag3"
              value={(formData.tags as string) || ''}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !isFormValid()}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create {getTypeLabel()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

