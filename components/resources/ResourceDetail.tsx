/**
 * ResourceDetail component - Modal for viewing/editing resource details
 */

'use client'

import { useState, useEffect } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Resource } from '@/lib/types/resources'
import { ContentEditor } from './ContentEditor'
import { ResourceLinker } from './ResourceLinker'
import { AnalyticsDataDisplay } from './AnalyticsDataDisplay'

interface ResourceDetailProps {
  resource: Resource | null
  open: boolean
  onClose: () => void
  onSave: (resource: Resource) => void
  onDelete: (id: string) => void
}

export function ResourceDetail({
  resource,
  open,
  onClose,
  onSave,
  onDelete,
}: ResourceDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<Record<string, unknown>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [currentResource, setCurrentResource] = useState<Resource | null>(resource)

  useEffect(() => {
    if (resource) {
      setCurrentResource(resource)
      setEditedData(resource.data as Record<string, unknown>)
      setIsEditing(false)
    }
  }, [resource])
  
  const handleLinkChange = (updatedResource: Resource) => {
    setCurrentResource(updatedResource)
    onSave(updatedResource)
  }

  const handleSave = async () => {
    if (!resource) return

    try {
      setIsSaving(true)
      const response = await fetch(`/api/resources/${resource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: editedData }),
      })

      if (!response.ok) throw new Error('Failed to update resource')

      const data = await response.json()
      onSave(data.resource)
      setIsEditing(false)
      toast.success('Resource updated')
    } catch (error) {
      console.error('Error updating resource:', error)
      toast.error('Failed to update resource')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    if (!resource) return
    if (confirm('Are you sure you want to delete this resource?')) {
      onDelete(resource.id)
    }
  }

  if (!resource || !currentResource) return null

  const data = isEditing ? editedData : (currentResource.data as Record<string, unknown>)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Resource Details</DialogTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditedData(resource.data as Record<string, unknown>)
                      setIsEditing(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-3.5 w-3.5 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <p className="text-sm font-medium mt-1">{currentResource.type}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Source</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {currentResource.source_type}
                </Badge>
                <span className="text-sm text-muted-foreground">{currentResource.source_name}</span>
              </div>
            </div>
            {currentResource.agent_id && (
              <div>
                <Label className="text-xs text-muted-foreground">Agent</Label>
                <p className="text-sm mt-1">{currentResource.agent_id}</p>
              </div>
            )}
            {currentResource.batch_id && (
              <div>
                <Label className="text-xs text-muted-foreground">Batch</Label>
                <p className="text-sm mt-1 font-mono text-xs">{currentResource.batch_id}</p>
              </div>
            )}
          </div>

          {/* Resource Data */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Data</Label>
            {isEditing ? (
              resource.type === 'content' ? (
                // Use ContentEditor for content resources
                <ContentEditor
                  content={(data.content as string) || ''}
                  title={(data.title as string) || ''}
                  onChange={(newContent, newTitle) =>
                    setEditedData({ ...editedData, content: newContent, title: newTitle })
                  }
                />
              ) : (
                // Regular form fields for other resource types
                <div className="space-y-3">
                  {Object.entries(data).map(([key, value]) => (
                    <div key={key}>
                      <Label htmlFor={key} className="text-xs">
                        {key}
                      </Label>
                      {typeof value === 'string' && value.length > 100 ? (
                        <Textarea
                          id={key}
                          value={value}
                          onChange={(e) =>
                            setEditedData({ ...editedData, [key]: e.target.value })
                          }
                          className="mt-1 text-xs"
                        />
                      ) : (
                        <Input
                          id={key}
                          value={String(value)}
                          onChange={(e) =>
                            setEditedData({ ...editedData, [key]: e.target.value })
                          }
                          className="mt-1 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="bg-secondary/40 rounded-lg p-4 space-y-2">
                {resource.type === 'content' && data.content ? (
                  // Render content with formatting for content resources
                  <div className="prose prose-sm max-w-none">
                    {data.title && <h3 className="text-sm font-semibold mb-2">{data.title}</h3>}
                    <div className="text-xs whitespace-pre-wrap">{data.content}</div>
                  </div>
                ) : resource.type === 'analytics' && resource.agent_id === 'aeo_analytics' ? (
                  // Render analytics data with structured display
                  <AnalyticsDataDisplay data={data as any} />
                ) : (
                  // Regular display for other resource types
                  Object.entries(data).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{key}:</span>
                      <span className="text-xs text-right flex-1 ml-4">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {currentResource.tags && currentResource.tags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {currentResource.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Resource Relationships */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-sm font-medium">Relationships</Label>
            <ResourceLinker resource={currentResource} onLinkChange={handleLinkChange} />
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t text-xs text-muted-foreground">
            <div>
              <span>Created: </span>
              <span>{new Date(currentResource.created_at).toLocaleString()}</span>
            </div>
            <div>
              <span>Updated: </span>
              <span>{new Date(currentResource.updated_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
