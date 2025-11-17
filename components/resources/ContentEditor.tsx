/**
 * Content Editor Component
 * Rich text editor for content resources (blog articles, outbound copywriting)
 */

'use client'

import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ContentEditorProps {
  content: string
  title?: string
  onChange: (content: string, title?: string) => void
  placeholder?: string
}

export function ContentEditor({
  content,
  title,
  onChange,
  placeholder = 'Enter content...',
}: ContentEditorProps) {
  const [localContent, setLocalContent] = useState(content)
  const [localTitle, setLocalTitle] = useState(title || '')

  useEffect(() => {
    setLocalContent(content)
  }, [content])

  useEffect(() => {
    setLocalTitle(title || '')
  }, [title])

  const handleContentChange = (value: string) => {
    setLocalContent(value)
    onChange(value, localTitle)
  }

  const handleTitleChange = (value: string) => {
    setLocalTitle(value)
    onChange(localContent, value)
  }

  return (
    <div className="space-y-4">
      {title !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="content-title" className="text-xs">
            Title
          </Label>
          <Input
            id="content-title"
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Content title..."
            className="text-sm"
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="content-body" className="text-xs">
          Content
        </Label>
        <Textarea
          id="content-body"
          value={localContent}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[300px] text-sm font-sans"
        />
        <p className="text-xs text-muted-foreground">
          {localContent.length} characters • {localContent.split(/\s+/).filter(Boolean).length} words
        </p>
      </div>
    </div>
  )
}

