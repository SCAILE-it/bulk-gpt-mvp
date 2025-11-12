/**
 * ABOUTME: Profile/settings page for updating user information
 * ABOUTME: Allows users to edit full_name, avatar_url, and organization
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div className="h-full flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading profile...</span>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
              <CardTitle className="text-destructive">Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-background p-6">
      <div className="container mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
            <User className="h-6 w-6 sm:h-7 sm:w-7 text-primary" aria-hidden="true" />
            Profile Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Manage your account information
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div 
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 p-4 rounded-lg border border-green-500/20 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300"
          >
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div 
            role="alert"
            aria-live="polite"
            className="flex items-center gap-2 p-4 rounded-lg border border-red-500/20 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Update your personal details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSaving}
                  autocomplete="name"
                  aria-describedby={error ? "full_name-error" : undefined}
                />
              </div>

              {/* Organization */}
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  type="text"
                  placeholder="Enter your organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  disabled={isSaving}
                  autocomplete="organization"
                />
              </div>

              {/* Avatar URL */}
              <div className="space-y-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  disabled={isSaving}
                  autocomplete="photo"
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
                  className="flex-1"
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
                  aria-label="Cancel and return to dashboard"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <CardTitle>API Access</CardTitle>
            <CardDescription>
              Manage API keys for programmatic access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApiKeyList />
          </CardContent>
        </Card>

        {/* Usage Stats Section */}
        <Card>
          <CardHeader>
            <CardTitle>Usage & Limits</CardTitle>
            <CardDescription>
              Track your usage and plan limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageDisplay />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
