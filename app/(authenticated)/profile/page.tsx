/**
 * ABOUTME: Profile/settings page for updating user information
 * ABOUTME: Allows users to edit full_name, avatar_url, and organization
 * ABOUTME: Organized into tabs: Account, API Keys, and Usage
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, User, BarChart3, CreditCard } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { UsageDisplay } from '@/components/usage/UsageDisplay'
import { InvoiceList } from '@/components/billing/InvoiceList'
import { AutoSkeleton } from '@/components/ui/auto-skeleton'
import { PageWithTabs } from '@/components/layout/PageWithTabs'
import { DataErrorBoundary } from '@/components/ErrorBoundary'
import { SuccessState } from '@/components/ui/success-state'

export default function ProfilePage() {
  return (
    <DataErrorBoundary
      errorMessage="Failed to load profile data. Please check your connection and try again."
    >
      <ProfilePageContent />
    </DataErrorBoundary>
  )
}

function ProfilePageContent() {
  const router = useRouter()
  const { profile, isLoading, error: profileError, updateProfile } = useProfile()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state - sync with profile when it loads
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [organization, setOrganization] = useState('')

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setAvatarUrl(profile.avatar_url || '')
      setOrganization(profile.organization || '')
    }
  }, [profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    if (!profile) {
      setError('Cannot save profile')
      setIsSaving(false)
      return
    }

    try {
      await updateProfile({
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        organization: organization.trim() || null,
      })

      setSuccessMessage('Profile updated successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (profileError && !profile) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-secondary/40 border border-border rounded-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            <h2 className="text-sm font-medium text-red-400">Error</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {profileError instanceof Error ? profileError.message : 'Failed to load profile'}
          </p>
        </div>
      </div>
    )
  }

  const accountContent = (
    <div className="container mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
      <div className="bg-secondary/40 border border-border rounded-md overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Account Information</h2>
        </div>
        <div className="p-4 sm:p-6">
          <AutoSkeleton isLoading={isLoading}>
            <form onSubmit={handleSave} className="space-y-4 animate-fade-in">
              {/* Email (read-only) */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-secondary/70 border-border text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-medium text-foreground">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSaving}
                  autoComplete="name"
                  className="bg-secondary/70 border-border text-foreground placeholder:text-muted-foreground"
                  aria-describedby={error ? "full_name-error" : undefined}
                />
              </div>

              {/* Organization */}
              <div className="space-y-1.5">
                <Label htmlFor="organization" className="text-xs font-medium text-foreground">Organization</Label>
                <Input
                  id="organization"
                  type="text"
                  placeholder="Enter your organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  disabled={isSaving}
                  autoComplete="organization"
                  className="bg-secondary/70 border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Avatar URL */}
              <div className="space-y-1.5">
                <Label htmlFor="avatar_url" className="text-xs font-medium text-foreground">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  disabled={isSaving}
                  autoComplete="photo"
                  className="bg-secondary/70 border-border text-foreground placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  URL to your profile picture
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  aria-label={isSaving ? "Saving profile changes" : "Save profile changes"}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  disabled={isSaving}
                  className="bg-secondary border-border text-foreground hover:bg-accent"
                  aria-label="Cancel and return to dashboard"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </AutoSkeleton>
        </div>
      </div>
    </div>
  )

  const usageContent = (
    <div className="container mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
      <div className="bg-secondary/40 border border-border rounded-md overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Usage & Limits</h2>
        </div>
        <div className="p-4 sm:p-6">
          <UsageDisplay />
        </div>
      </div>
    </div>
  )

  const billingContent = (
    <div className="container mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
      <div className="bg-secondary/40 border border-border rounded-md overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Billing & Invoices</h2>
        </div>
        <div className="p-4 sm:p-6">
          <InvoiceList />
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Success Message */}
      {successMessage && (
        <div className="flex-shrink-0 mx-6 mt-6">
          <SuccessState
            title={successMessage}
            variant="banner"
            size="sm"
            autoDismiss={3000}
            onDismiss={() => setSuccessMessage(null)}
            showDismiss={true}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div 
          role="alert"
          aria-live="polite"
          className="flex-shrink-0 mx-6 mt-6 flex items-center gap-2 p-4 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs">{error}</span>
        </div>
      )}

      <PageWithTabs
        defaultValue="account"
        maxWidth="max-w-2xl"
        tabs={[
          {
            value: 'account',
            label: 'Account',
            icon: <User className="h-3.5 w-3.5" />,
            content: accountContent,
          },
          {
            value: 'usage',
            label: 'Usage',
            icon: <BarChart3 className="h-3.5 w-3.5" />,
            content: usageContent,
          },
          {
            value: 'billing',
            label: 'Billing',
            icon: <CreditCard className="h-3.5 w-3.5" />,
            content: billingContent,
          },
        ]}
      />
    </div>
  )
}
