/**
 * ABOUTME: Output fields management section for bulk processor
 * ABOUTME: Handles adding/removing output column names with validation and help tooltip
 */

import { Table2, HelpCircle, X, Plus } from 'lucide-react'

interface OutputFieldsSectionProps {
  outputFields: string[]
  newField: string
  onNewFieldChange: (value: string) => void
  onAddField: () => void
  onRemoveField: (field: string) => void
}

export function OutputFieldsSection({
  outputFields,
  newField,
  onNewFieldChange,
  onAddField,
  onRemoveField
}: OutputFieldsSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Table2 className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
        <label className="text-xs font-medium text-zinc-300">Output Columns</label>
        <div className="group relative">
          <HelpCircle className="h-3 w-3 text-zinc-600 cursor-help" />
          <div className="hidden group-hover:block absolute left-0 top-5 z-50 w-56 p-2 bg-zinc-800 border border-white/10 rounded-md text-xs text-zinc-300 shadow-xl">
            <p>Columns in exported CSV.</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {outputFields.map(field => (
          <div key={field} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-white/5 rounded text-sm text-zinc-300 font-mono">
            {field}
            <button
              onClick={() => onRemoveField(field)}
              className="hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded"
              aria-label={`Remove ${field} output field`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ))}
        <div className="inline-flex gap-1">
          <input
            value={newField}
            onChange={(e) => onNewFieldChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddField()}
            placeholder="field..."
            className="w-24 px-2 py-1 bg-zinc-900/70 border border-white/5 rounded text-sm text-zinc-300 font-mono focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all duration-150 ease-out"
            aria-label="New output field name"
          />
          <button
            onClick={onAddField}
            className="p-1 hover:bg-zinc-800 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            aria-label="Add new output field"
          >
            <Plus className="h-3 w-3 text-zinc-500" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
