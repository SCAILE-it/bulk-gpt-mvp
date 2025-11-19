/**
 * Memoized DataRow component for home page CSV demo
 */

import { memo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import type { DemoRow } from '@/lib/constants/demo-data'

interface DataRowProps {
  row: DemoRow
  index: number
  maxLines: number
  typewriterText: string
  typewriterRowId: number | null
  currentProcessingRow: number | null
}

function DataRowComponent(props: DataRowProps) {
  const {
    row,
    index,
    maxLines,
    typewriterText,
    typewriterRowId,
  } = props
  const descRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const applyStyles = () => {
      if (descRef.current) {
        descRef.current.style.setProperty('display', '-webkit-box', 'important')
        descRef.current.style.setProperty('-webkit-line-clamp', String(maxLines), 'important')
        descRef.current.style.setProperty('-webkit-box-orient', 'vertical', 'important')
        descRef.current.style.setProperty('overflow', 'hidden', 'important')
        descRef.current.style.setProperty('text-overflow', 'ellipsis', 'important')
      }
      if (summaryRef.current) {
        summaryRef.current.style.setProperty('display', '-webkit-box', 'important')
        summaryRef.current.style.setProperty('-webkit-line-clamp', String(maxLines), 'important')
        summaryRef.current.style.setProperty('-webkit-box-orient', 'vertical', 'important')
        summaryRef.current.style.setProperty('overflow', 'hidden', 'important')
        summaryRef.current.style.setProperty('text-overflow', 'ellipsis', 'important')
      }
    }

    applyStyles()
    const timeout = setTimeout(applyStyles, 0)
    return () => clearTimeout(timeout)
  }, [maxLines])

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`grid grid-cols-[100px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] border-b border-border/25 last:border-0 transition-colors duration-200 min-w-[600px] ${
        row.status === 'processing' ? 'bg-primary/7' :
        row.status === 'completed' ? 'bg-green-500/7' :
        'bg-background'
      }`}
    >
      {/* Name */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-xs text-foreground border-r border-border/22 font-mono break-words leading-[1.5]" title={row.name}>
        {row.name}
      </div>

      {/* Description */}
      <div
        ref={descRef}
        className="px-3 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-xs text-foreground border-r border-border/22 font-mono break-words leading-[1.5]"
        title={row.description}
      >
        {row.description}
      </div>

      {/* Summary */}
      <div
        ref={summaryRef}
        className="px-3 sm:px-5 py-3 sm:py-4 text-[10px] sm:text-xs font-mono break-words leading-[1.5]"
        title={row.summary}
      >
        {row.status === 'pending' && (
          <span className="text-muted-foreground/50">—</span>
        )}
        {row.status === 'processing' && typewriterRowId === row.id && (
          <span className="text-green-600 break-words block">
            {typewriterText}
            <span className="inline-block w-0.5 h-3 sm:h-3.5 bg-green-600 ml-0.5 animate-pulse" />
          </span>
        )}
        {row.status === 'completed' && row.summary && (
          <span className="text-green-600 break-words block">
            <span className="break-words">{row.summary}</span>
            <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 inline-block ml-1.5 sm:ml-2 text-green-600" />
          </span>
        )}
        {row.status === 'processing' && typewriterRowId !== row.id && (
          <span className="text-primary flex items-center gap-1.5 sm:gap-2">
            <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full border-2 border-primary/70 border-t-transparent animate-spin flex-shrink-0" />
            <span className="truncate text-[10px] sm:text-xs">Processing...</span>
          </span>
        )}
      </div>
    </motion.div>
  )
}

// Memoize to prevent unnecessary re-renders
export const DataRow = memo(DataRowComponent, (prevProps, nextProps) => {
  // Only re-render if relevant props change
  return (
    prevProps.row.id === nextProps.row.id &&
    prevProps.row.status === nextProps.row.status &&
    prevProps.row.summary === nextProps.row.summary &&
    prevProps.typewriterText === nextProps.typewriterText &&
    prevProps.typewriterRowId === nextProps.typewriterRowId &&
    prevProps.currentProcessingRow === nextProps.currentProcessingRow &&
    prevProps.maxLines === nextProps.maxLines
  )
})

DataRow.displayName = 'DataRow'
