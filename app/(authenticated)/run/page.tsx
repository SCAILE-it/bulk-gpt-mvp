/**
 * ABOUTME: Agents page - redirects to Bulk Agent (only ready agent)
 * ABOUTME: Other agents archived as premature
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AgentsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to bulk agent (only ready agent)
    router.replace('/run/bulk')
  }, [router])

  return null
}
