/**
 * BulkActionsBar Component
 * Shows bulk action controls when resources are selected
 */

'use client'

import { Trash2, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { toast } from 'sonner'

interface BulkActionsBarProps {
  selectedCount: number
  onBulkDelete: () => void
  onBulkTag: (tags: string[]) => void
  onClearSelection: () => void
}

export function BulkActionsBar({
  selectedCount,
  onBulkDelete,
  onBulkTag,
  onClearSelection,
}: BulkActionsBarProps) {
  const [tagInput, setTagInput] = useState('')
  const [isTagging, setIsTagging] = useState(false)

  const handleBulkTag = () => {
    if (!tagInput.trim()) {
      toast.error('Please enter at least one tag')
      return
    }

    const tags = tagInput
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)

    if (tags.length === 0) {
      toast.error('Please enter valid tags')
      return
    }

    setIsTagging(true)
    onBulkTag(tags)
    setTagInput('')
    setIsTagging(false)
  }

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="text-sm">
          {selectedCount} selected
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-7"
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Bulk Tag */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add tags (comma-separated)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleBulkTag()
              }
            }}
            className="h-8 w-48 text-sm"
            disabled={isTagging}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkTag}
            disabled={isTagging || !tagInput.trim()}
            className="h-8"
          >
            <Tag className="h-3.5 w-3.5 mr-1.5" />
            Tag
          </Button>
        </div>

        {/* Bulk Delete */}
        <Button
          variant="destructive"
          size="sm"
          onClick={onBulkDelete}
          className="h-8"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete ({selectedCount})
        </Button>
      </div>
    </div>
  )
}
