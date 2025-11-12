/**
 * ABOUTME: Lists user's API keys with create/revoke actions
 * ABOUTME: Shows key prefix, creation date, last used, and revoke button
 */

'use client'

import { useState, useEffect } from 'react'
import { Key, Trash2, Plus } from 'lucide-react'
import { CreateApiKeyModal } from './CreateApiKeyModal'

interface ApiKey {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export function ApiKeyList() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null)

  async function loadKeys() {
    try {
      setLoading(true)
      const response = await fetch('/api/keys')
      if (!response.ok) throw new Error('Failed to load API keys')
      const data = await response.json()
      setKeys(data.keys)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  async function revokeKey(keyId: string) {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    try {
      setRevokingKeyId(keyId)
      const response = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId })
      })

      if (!response.ok) throw new Error('Failed to revoke API key')

      // Reload keys
      await loadKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key')
    } finally {
      setRevokingKeyId(null)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading API keys...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">API Keys</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Use API keys for programmatic access (curl, n8n, Zapier)
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Create New Key
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="border border-border rounded-lg p-8 text-center bg-secondary/30">
          <Key className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-xs font-medium text-foreground mb-1">No API keys yet</p>
          <p className="text-xs text-muted-foreground">
            Create an API key to access the Bulk GPT API programmatically
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-white/5 overflow-hidden">
          {keys.map((key) => (
            <div key={key.id} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{key.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-mono">{key.prefix}...</span>
                  <span>Created {formatDate(key.createdAt)}</span>
                  <span>Last used {formatDate(key.lastUsedAt)}</span>
                </div>
              </div>
              <button
                onClick={() => revokeKey(key.id)}
                disabled={revokingKeyId === key.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {revokingKeyId === key.id ? 'Revoking...' : 'Revoke'}
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateApiKeyModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onKeyCreated={() => loadKeys()}
      />
    </div>
  )
}
