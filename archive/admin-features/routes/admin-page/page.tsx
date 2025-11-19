/**
 * Admin Dashboard Page
 * Client management, package creation, and onboarding links
 * Only visible to admin users
 */

'use client'

import { useState, useEffect } from 'react'
import { Package, Users } from 'lucide-react'
import { PageWithTabs } from '@/components/layout/PageWithTabs'
import { PackageManager } from '@/components/admin/PackageManager'
import { ClientManager } from '@/components/admin/ClientManager'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function AdminPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAdminAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (!response.ok) {
        router.push('/home')
        return
      }

      const data = await response.json()
      if (data.profile?.user_type !== 'admin') {
        toast.error('Admin access required')
        router.push('/home')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/home')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <PageWithTabs
      defaultValue="clients"
      maxWidth="max-w-full"
      tabs={[
        {
          value: 'clients',
          label: 'Clients',
          icon: <Users className="h-3.5 w-3.5" />,
          content: (
            <div className="container mx-auto max-w-6xl p-6">
              <ClientManager />
            </div>
          ),
        },
        {
          value: 'packages',
          label: 'Packages',
          icon: <Package className="h-3.5 w-3.5" />,
          content: (
            <div className="container mx-auto max-w-6xl p-6">
              <PackageManager />
            </div>
          ),
        },
      ]}
    />
  )
}

