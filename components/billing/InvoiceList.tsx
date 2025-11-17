/**
 * InvoiceList Component
 * Displays list of invoices for the user
 */

'use client'

import { useState, useEffect } from 'react'
import { Invoice } from '@/lib/types/billing'
import { EmptyState } from '@/components/ui/empty-state'
import { FileText, Download, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const response = await fetch('/api/billing/invoices')
        
        if (!response.ok) {
          throw new Error('Failed to fetch invoices')
        }
        
        const data = await response.json()
        setInvoices(data.invoices || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoices')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvoices()
  }, [])

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground">Loading invoices...</div>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-red-400">Error: {error}</div>
    )
  }

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No invoices yet"
        description="Invoices will appear here once you have billing activity"
      />
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      pending: 'secondary',
      overdue: 'destructive',
      draft: 'outline',
      cancelled: 'outline',
    }
    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="bg-secondary/40 border border-border rounded-md p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {invoice.invoice_number}
              </span>
              {getStatusBadge(invoice.status)}
            </div>
            <div className="text-sm font-semibold text-foreground">
              ${invoice.total.toFixed(2)}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(invoice.period_start), 'MMM d')} - {format(new Date(invoice.period_end), 'MMM d, yyyy')}
              </span>
            </div>
            {invoice.due_date && (
              <span>Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
            )}
          </div>

          {invoice.status === 'paid' && invoice.paid_at && (
            <div className="text-xs text-muted-foreground">
              Paid on {format(new Date(invoice.paid_at), 'MMM d, yyyy')}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                // TODO: Implement invoice download
                console.log('Download invoice', invoice.id)
              }}
            >
              <Download className="h-3 w-3 mr-1" />
              Download PDF
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
