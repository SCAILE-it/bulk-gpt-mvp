/**
 * ABOUTME: Context page for managing company business context
 * ABOUTME: Users set up business context here, then use it in agent prompts
 * ABOUTME: Now includes tabs for Business Context, Files, and Integrations
 */

'use client'

import { ContextForm } from '@/components/context/ContextForm'
import { ContextFileUpload } from '@/components/context/ContextFileUpload'
import { ContextIntegrations } from '@/components/context/ContextIntegrations'
import { FileText, Upload, Plug } from 'lucide-react'
import { PageWithTabs } from '@/components/layout/PageWithTabs'

export default function ContextPage() {
  return (
    <PageWithTabs
      defaultValue="business-context"
      tabs={[
        {
          value: 'business-context',
          label: 'Business Context',
          icon: <FileText className="h-3.5 w-3.5" />,
          content: (
            <div className="container mx-auto max-w-3xl p-6 space-y-4">
              <ContextForm />
              {/* Help Section */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-medium text-primary/90">How to use business context</h3>
                <ul className="text-xs text-primary/70 space-y-1 list-disc list-inside">
                  <li>Set up your business context here</li>
                  <li>Go to Agents and write your prompt</li>
                  <li>Click business context variables like <span className="font-mono">{'{{context.tone}}'}</span> to insert them</li>
                  <li>Context is automatically included when processing batches</li>
                </ul>
              </div>
            </div>
          ),
        },
        {
          value: 'files',
          label: 'Files',
          icon: <Upload className="h-3.5 w-3.5" />,
          content: (
            <div className="container mx-auto max-w-3xl p-6">
              <ContextFileUpload />
            </div>
          ),
        },
        {
          value: 'integrations',
          label: 'Integrations',
          icon: <Plug className="h-3.5 w-3.5" />,
          content: (
            <div className="container mx-auto max-w-3xl p-6">
              <ContextIntegrations />
            </div>
          ),
        },
      ]}
    />
  )
}

