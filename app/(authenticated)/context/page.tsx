/**
 * ABOUTME: Context page for managing company context variables
 * ABOUTME: Users set up context here, then use it in Bulk Agent prompts
 */

'use client'

import { ContextForm } from '@/components/context/ContextForm'
import { FileText } from 'lucide-react'

export default function ContextPage() {
  return (
    <div className="h-full overflow-y-auto bg-background text-foreground p-6">
      <div className="container mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-sm font-medium tracking-tight flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Context
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Set up company context variables to use in your Bulk Agent prompts
          </p>
        </div>

        {/* Context Form */}
        <div className="bg-secondary/40 border border-border rounded-lg p-6">
          <ContextForm />
        </div>

        {/* Help Section */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
          <h3 className="text-xs font-medium text-primary/90">How to use context variables</h3>
          <ul className="text-xs text-primary/70 space-y-1 list-disc list-inside">
            <li>Set up your context variables here</li>
            <li>Go to Bulk Agent and write your prompt</li>
            <li>Click context variables like <span className="font-mono">{'{{context.tone}}'}</span> to insert them</li>
            <li>Context is automatically included when processing batches</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

