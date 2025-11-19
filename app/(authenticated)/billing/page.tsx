/**
 * Billing Page
 * Invoice management and usage summary for all users
 */

'use client'

import dynamic from 'next/dynamic'
import { FileText, DollarSign } from 'lucide-react'
import { PageWithTabs } from '@/components/layout/PageWithTabs'
import { InvoiceList } from '@/components/billing/InvoiceList'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load non-default tab - only loads when user clicks "Usage & Credits"
const UsageSummary = dynamic(
  () => import('@/components/billing/UsageSummary').then(mod => ({ default: mod.UsageSummary })),
  {
    loading: () => <Skeleton className="h-64 w-full" />,
    ssr: false,
  }
)

export default function BillingPage() {
  return (
    <PageWithTabs
      defaultValue="invoices"
      maxWidth="max-w-full"
      tabs={[
        {
          value: 'invoices',
          label: 'Invoices',
          icon: <FileText className="h-3.5 w-3.5" />,
          content: (
            <div className="container mx-auto max-w-6xl p-6">
              <InvoiceList />
            </div>
          ),
        },
        {
          value: 'usage',
          label: 'Usage & Credits',
          icon: <DollarSign className="h-3.5 w-3.5" />,
          content: (
            <div className="container mx-auto max-w-6xl p-6">
              <UsageSummary />
            </div>
          ),
        },
      ]}
    />
  )
}

