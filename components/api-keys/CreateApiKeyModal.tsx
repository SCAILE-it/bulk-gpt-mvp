/**
 * ABOUTME: Modal for creating a new API key
 * ABOUTME: Shows the full key ONCE after creation with copy button
 */

'use client'

import { useState } from 'react'
import { X, Copy, Check, AlertTriangle } from 'lucide-react'

interface CreateApiKeyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onKeyCreated: () => void
}

export function CreateApiKeyModal({ open, onOpenChange, onKeyCreated }: CreateApiKeyModalProps) {
  const [keyName, setKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (!keyName.trim()) {
      setError('Please enter a name for your API key')
      return
    }

    try {
      setCreating(true)
      setError(null)
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName.trim() })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create API key')
      }

      const data = await response.json()
      setCreatedKey(data.key)
      onKeyCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  async function copyToClipboard() {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setKeyName('')
    setCreatedKey(null)
    setCopied(false)
    setError(null)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-100">
            {createdKey ? 'API Key Created' : 'Create API Key'}
          </h3>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!createdKey ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Production API, n8n Workflow"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                  }}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Choose a descriptive name to identify where this key will be used
                </p>
              </div>

              {error && (
                <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={creating || !keyName.trim()}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded transition-colors"
              >
                {creating ? 'Creating...' : 'Create API Key'}
              </button>
            </>
          ) : (
            <>
              <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded flex gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="text-sm text-amber-300">
                  <p className="font-medium mb-1">Save this key now!</p>
                  <p className="text-amber-400">
                    This is the only time you will see this key. Copy it and store it securely.
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Your API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createdKey}
                    readOnly
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 font-mono text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors flex items-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm text-zinc-400">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mb-4 text-sm text-zinc-400 space-y-2">
                <p>Use this key in your API requests:</p>
                <pre className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono overflow-x-auto">
{`curl -X POST https://bulk-gpt-app.vercel.app/api/process \\
  -H "Authorization: Bearer ${createdKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"csvFilename":"data.csv", ...}'`}
                </pre>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
