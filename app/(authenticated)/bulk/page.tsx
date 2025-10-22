/**
 * ABOUTME: Single-page bulk processing interface - power-user optimized
 * ABOUTME: Full-width, left-aligned, keyboard shortcuts, inline results
 */

import BulkProcessor from '@/components/bulk/BulkProcessor'
import { BulkProcessorErrorBoundary } from '@/components/ErrorBoundary'

export default function BulkPage() {
  return (
    <BulkProcessorErrorBoundary>
      <BulkProcessor />
    </BulkProcessorErrorBoundary>
  )
}
