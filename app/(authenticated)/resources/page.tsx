/**
 * Resources page - Manage GTM resources (leads, keywords, content, campaigns)
 * Part of GTM Engine transformation
 */

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageWithTabs } from '@/components/layout/PageWithTabs'
import { Database, Search, FileText, Megaphone } from 'lucide-react'
import { ResourcesList } from '@/components/resources/ResourcesList'

export default function ResourcesPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [defaultTab, setDefaultTab] = useState<'leads' | 'keywords' | 'content' | 'campaigns'>('leads')

  useEffect(() => {
    if (tabParam && ['leads', 'keywords', 'content', 'campaigns'].includes(tabParam)) {
      setDefaultTab(tabParam as 'leads' | 'keywords' | 'content' | 'campaigns')
    }
  }, [tabParam])

  return (
    <PageWithTabs
      defaultValue={defaultTab}
      value={defaultTab}
      maxWidth="max-w-full"
      tabs={[
        {
          value: 'leads',
          label: 'Leads',
          icon: <Database className="h-3.5 w-3.5" />,
          content: (
            <div className="container mx-auto max-w-6xl p-6">
              <ResourcesList type="lead" />
            </div>
          ),
        },
        {
          value: 'keywords',
          label: 'Keywords',
          icon: <Search className="h-3.5 w-3.5" />,
          content: (
            <div className="container mx-auto max-w-6xl p-6">
              <ResourcesList type="keyword" />
            </div>
          ),
        },
        {
          value: 'content',
          label: 'Content',
          icon: <FileText className="h-3.5 w-3.5" />,
          content: (
            <div className="container mx-auto max-w-6xl p-6">
              <ResourcesList type="content" />
            </div>
          ),
        },
        {
          value: 'campaigns',
          label: 'Campaigns',
          icon: <Megaphone className="h-3.5 w-3.5" />,
          content: (
            <div className="container mx-auto max-w-6xl p-6">
              <ResourcesList type="campaign" />
            </div>
          ),
        },
      ]}
    />
  )
}


