/**
 * ABOUTME: Profile/settings page for updating user information
 * ABOUTME: Allows users to edit full_name, avatar_url, and organization
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { logError } from '@/lib/errors'
import { ApiKeyList } from '@/components/api-keys/ApiKeyList'
import { UsageDisplay } from '@/components/usage/UsageDisplay'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  organization: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [organization, setOrganization] = useState('')

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      if (!supabase) {
        setError('Supabase client not configured')
        setIsLoading(false)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth')
          return
        }

        // Fetch user profile from public.users table
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, email, full_name, avatar_url, organization')
          .eq('id', user.id)
          .single()

        if (fetchError) {
          // User might not exist in public.users yet
          if (fetchError.code === 'PGRST116') {
            // Create user record
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email || '',
              })
              .select('id, email, full_name, avatar_url, organization')
              .single()

            if (createError) throw createError

            setProfile(newUser)
            setFullName(newUser.full_name || '')
            setAvatarUrl(newUser.avatar_url || '')
            setOrganization(newUser.organization || '')
          } else {
            throw fetchError
          }
        } else {
          setProfile(data)
          setFullName(data.full_name || '')
          setAvatarUrl(data.avatar_url || '')
          setOrganization(data.organization || '')
        }
      } catch (err) {
        logError(err instanceof Error ? err : new Error('Profile fetch failed'), {
          source: 'profile/fetchProfile'
        })
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    const supabase = createClient()
    if (!supabase || !profile) {
      setError('Cannot save profile')
      setIsSaving(false)
      return
    }

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          organization: organization.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setSuccessMessage('Profile updated successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      logError(err instanceof Error ? err : new Error('Profile update failed'), {
        source: 'profile/handleSave',
        userId: profile?.id
      })
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Loading profile...</span>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-secondary/40 border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            <h2 className="text-sm font-medium text-red-400">Error</h2>
          </div>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground p-6">
      <div className="container mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-sm font-medium tracking-tight flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Profile Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your account information
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div 
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 p-4 rounded-lg border border-green-500/20 bg-green-500/10 text-green-400"
          >
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="text-xs">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div 
            role="alert"
            aria-live="polite"
            className="flex items-center gap-2 p-4 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="text-xs">{error}</span>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-secondary/40 border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Account Information</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Update your personal details and preferences
            </p>
          </div>
          <div className="p-6">
            <form onSubmit={handleSave} className="space-y-4">
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
                  autocomplete="name"
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
                  autocomplete="organization"
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
                  autocomplete="photo"
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
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
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
          </div>
        </div>

        {/* API Keys Section */}
        <div className="bg-secondary/40 border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">API Access</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Manage API keys for programmatic access
            </p>
          </div>
          <div className="p-6">
            <ApiKeyList />
          </div>
        </div>

        {/* Usage Stats Section */}
        <div className="bg-secondary/40 border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Usage & Limits</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Track your usage and plan limits
            </p>
          </div>
          <div className="p-6">
            <UsageDisplay />
          </div>
        </div>
      </div>
    </div>
  )
}
