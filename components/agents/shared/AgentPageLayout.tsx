/**
 * Shared layout component for agent pages
 * Provides consistent spacing, header, and container structure
 */

import { ReactNode } from 'react'

interface AgentPageLayoutProps {
  children: ReactNode
  title: string
  description?: string
  icon?: ReactNode
}

export function AgentPageLayout({
  children,
  title,
  description,
  icon
}: AgentPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {icon}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  )
}
