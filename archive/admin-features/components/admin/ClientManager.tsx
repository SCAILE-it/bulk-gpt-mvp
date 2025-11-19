/**
 * Client Manager Component
 * List clients, assign packages, generate onboarding links
 */

'use client'

import { useState, useEffect } from 'react'
import { Users, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import { ClientPackageAssignment } from '@/lib/types/packages'

interface ClientWithPackages {
  id: string
  user_id: string
  user_type: string
  agency_id: string
  onboarding_link: string | null
  client_package_assignments: Array<ClientPackageAssignment & {
    agency_packages: {
      id: string
      name: string
      monthly_cost: number
    }
  }>
}

export function ClientManager() {
  const [clients, setClients] = useState<ClientWithPackages[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [packages, setPackages] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    fetchClients()
    fetchPackages()
  }, [])

  const fetchClients = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/clients')
      if (!response.ok) throw new Error('Failed to fetch clients')
      
      const data = await response.json()
      setClients(data.clients || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast.error('Failed to load clients')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/admin/packages')
      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages || [])
      }
    } catch (error) {
      console.error('Error fetching packages:', error)
    }
  }

  const handleGenerateOnboardingLink = async (packageId: string) => {
    try {
      const response = await fetch('/api/admin/onboarding-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId }),
      })

      if (!response.ok) throw new Error('Failed to generate link')

      const data = await response.json()
      
      // Copy to clipboard
      await navigator.clipboard.writeText(data.full_url)
      toast.success('Onboarding link copied to clipboard')
    } catch (error) {
      console.error('Error generating onboarding link:', error)
      toast.error('Failed to generate link')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-secondary/50 rounded animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-secondary/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage client accounts and package assignments
          </p>
        </div>
      </div>

      {/* Clients List */}
      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Clients will appear here once assigned packages"
        />
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="border border-border rounded-lg p-4 bg-secondary/20"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium">Client #{client.user_id.slice(0, 8)}</h3>
                    <Badge variant="secondary">Client</Badge>
                  </div>
                  
                  {client.client_package_assignments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs font-medium text-muted-foreground">Assigned Packages:</p>
                      {client.client_package_assignments.map((assignment) => {
                        const pkg = assignment.agency_packages
                        return (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between p-2 bg-background rounded border border-border"
                          >
                            <div className="flex-1">
                              <p className="text-xs font-medium">{pkg.name}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>${pkg.monthly_cost.toFixed(2)}/month</span>
                                <span>•</span>
                                <span>
                                  Credits: ${assignment.used_self_service_credits.toFixed(2)} / ${assignment.included_self_service_credits.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {assignment.status}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Onboarding Links */}
      <div className="border border-border rounded-lg p-4 bg-secondary/20">
        <h3 className="text-sm font-medium mb-3">Generate Onboarding Links</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-border rounded bg-background"
            >
              <option value="">Select package...</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={() => selectedPackageId && handleGenerateOnboardingLink(selectedPackageId)}
              disabled={!selectedPackageId}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Generate Link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link with clients to onboard them with the selected package
          </p>
        </div>
      </div>
    </div>
  )
}

