'use client'

import { useState } from 'react'
import { Building2, Mail, Zap, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useIntegrations } from '@/hooks/useIntegrations'
import type { IntegrationProvider } from '@/lib/integrations/types'

interface IntegrationConfig {
  id: IntegrationProvider
  name: string
  description: string
  icon: typeof Building2
}

const INTEGRATIONS_CONFIG: IntegrationConfig[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Connect to HubSpot CRM to access contacts, companies, and deals',
    icon: Building2,
  },
  {
    id: 'instantly',
    name: 'Instantly',
    description: 'Integrate with Instantly for email outreach and campaign management',
    icon: Mail,
  },
  {
    id: 'phantombuster',
    name: 'Phantombuster',
    description: 'Connect to Phantombuster for web scraping and automation',
    icon: Zap,
  },
]

export function ContextIntegrations() {
  const { integrations, isLoading, connectIntegration, disconnectIntegration, syncIntegration } = useIntegrations()
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [syncing, setSyncing] = useState<string | null>(null)

  const handleConnect = async (provider: IntegrationProvider) => {
    const apiKey = apiKeys[provider]
    if (!apiKey || apiKey.trim().length === 0) {
      return
    }

    const result = await connectIntegration(provider, apiKey)
    if (result) {
      setExpandedIntegration(null)
      setApiKeys((prev) => {
        const updated = { ...prev }
        delete updated[provider]
        return updated
      })
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    try {
      await disconnectIntegration(integrationId)
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleSync = async (integrationId: string, dataType = 'contacts') => {
    setSyncing(integrationId)
    try {
      await syncIntegration(integrationId, 'read', dataType)
    } catch (error) {
      // Error handled by hook
    } finally {
      setSyncing(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground mb-4">
        Connect external tools to use their data as context in your agent prompts
      </div>

      {/* Loading State */}
      {isLoading && integrations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <div className="h-12 w-12 mx-auto mb-3 rounded-full border-4 border-muted-foreground border-t-transparent animate-spin opacity-50" />
          <p className="text-xs">Loading integrations...</p>
        </div>
      )}

      <div className="space-y-3">
        {INTEGRATIONS_CONFIG.map((config) => {
          const Icon = config.icon
          const integration = integrations.find((i) => i.provider === config.id)
          const isConnected = !!integration
          const isExpanded = expandedIntegration === config.id
          const hasApiKey = !!apiKeys[config.id]

          return (
            <div
              key={config.id}
              className={cn(
                'border border-border rounded-lg p-4 transition-colors',
                isConnected && 'bg-primary/5 border-primary/20'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    isConnected
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-medium">{config.name}</h3>
                      {isConnected ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    {isConnected && integration?.lastSyncedAt && (
                      <span className="text-xs text-muted-foreground">
                        Synced {new Date(integration.lastSyncedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {config.description}
                  </p>

                  {isExpanded && !isConnected && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-border">
                      <div className="space-y-2">
                        <Label htmlFor={`${config.id}-api-key`} className="text-xs">
                          API Key
                        </Label>
                        <Input
                          id={`${config.id}-api-key`}
                          type="password"
                          placeholder="Enter your API key"
                          value={apiKeys[config.id] || ''}
                          onChange={(e) =>
                            setApiKeys((prev) => ({
                              ...prev,
                              [config.id]: e.target.value,
                            }))
                          }
                          autocomplete="off"
                          className="text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          Your API key is encrypted and stored securely
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleConnect(config.id)}
                          disabled={!hasApiKey}
                          className="text-xs"
                        >
                          Connect
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedIntegration(null)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isExpanded && (
                    <div className="flex items-center gap-2">
                      {isConnected && integration ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSync(integration.id)}
                            disabled={syncing === integration.id}
                            className="text-xs"
                          >
                            {syncing === integration.id ? (
                              <>
                                <div className="h-3.5 w-3.5 mr-1.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                Sync
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(integration.id)}
                            className="text-xs"
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setExpandedIntegration(config.id)}
                          className="text-xs"
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Help Text */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2 mt-6">
        <h3 className="text-xs font-medium text-primary/90">About Integrations</h3>
        <ul className="text-xs text-primary/70 space-y-1 list-disc list-inside">
          <li>Connected integrations provide data that can be used as context in prompts</li>
          <li>API keys are encrypted and stored securely</li>
          <li>You can disconnect integrations at any time</li>
          <li>Integration data is refreshed automatically when processing batches</li>
        </ul>
      </div>
    </div>
  )
}

