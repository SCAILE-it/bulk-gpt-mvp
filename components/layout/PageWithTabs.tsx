/**
 * ABOUTME: Shared layout component for pages with tabs
 * ABOUTME: DRY - provides consistent breadcrumb + tabs layout across all pages
 * ABOUTME: Compact breadcrumb integrated into tabs header area
 */

'use client'

import { ReactNode } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'

interface TabConfig {
  value: string
  label: string
  icon?: ReactNode
  content: ReactNode
}

interface PageWithTabsProps {
  /** Default tab value */
  defaultValue: string
  /** Tab configurations */
  tabs: TabConfig[]
  /** Optional breadcrumb items (auto-generated if not provided) */
  breadcrumbItems?: Array<{ label: string; href: string }>
  /** Additional className for tabs container */
  className?: string
  /** Max width container class */
  maxWidth?: string
  /** Controlled value (for URL-based tab switching) */
  value?: string
  /** Callback when tab changes */
  onValueChange?: (value: string) => void
}

export function PageWithTabs({
  defaultValue,
  tabs,
  breadcrumbItems,
  className,
  maxWidth = 'max-w-3xl',
  value,
  onValueChange,
}: PageWithTabsProps) {
  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      <Tabs 
        defaultValue={defaultValue} 
        value={value}
        onValueChange={onValueChange}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="flex-shrink-0 border-b border-border">
          <div className={cn('container mx-auto', maxWidth, 'px-4 sm:px-6 py-3')}>
            {/* Compact breadcrumb + tabs - responsive layout */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <Breadcrumb items={breadcrumbItems} compact className="flex-shrink-0" />
              <div className="flex-1 w-full sm:w-auto">
                <TabsList className={cn('grid w-full gap-1', {
                  'grid-cols-2': tabs.length === 2,
                  'grid-cols-3': tabs.length === 3,
                  'grid-cols-4': tabs.length === 4,
                })}>
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-1.5 sm:gap-2 text-xs"
                    >
                      {tab.icon}
                      <span className="truncate">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>
          </div>
        </div>

        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="flex-1 overflow-y-auto mt-0"
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

