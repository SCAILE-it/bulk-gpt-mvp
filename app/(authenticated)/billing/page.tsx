/**
 * Billing Page
 * Invoice management and usage summary for all users
 */

'use client'

import { FileText, DollarSign } from 'lucide-react'
import { PageWithTabs } from '@/components/layout/PageWithTabs'
import { InvoiceList } from '@/components/billing/InvoiceList'
import { UsageSummary } from '@/components/billing/UsageSummary'

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

