/**
 * ABOUTME: Main navigation header component for authenticated pages
 * ABOUTME: Shows app title, navigation links, user email, and sign out button
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Activity, LogOut, User, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        setUserEmail(user?.email || null)
      }
    }
    getUser()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
      router.push('/auth')
      router.refresh()
    }
  }

  const navLinks = [
    { href: '/bulk', label: 'RUN' },
    { href: '/dashboard', label: 'EXECUTIONS' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-3">
        {/* Logo */}
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
          aria-label="Bulk GPT Home"
        >
          <Activity className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <span className="text-sm font-medium tracking-tight text-zinc-100">Bulk GPT</span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-2 text-xs font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                pathname === link.href
                  ? 'text-zinc-100 bg-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
              )}
              aria-current={pathname === link.href ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900" 
              data-testid="user-menu-button"
              aria-label="User menu"
              aria-haspopup="true"
            >
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-zinc-900">
                <User className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/5">
            <DropdownMenuLabel className="text-zinc-100">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-medium leading-none">My Account</p>
                {userEmail && (
                  <p className="text-xs leading-none text-zinc-500">
                    {userEmail}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={() => router.push('/profile')} className="text-zinc-300 hover:bg-zinc-800">
              <User className="mr-2 h-4 w-4" />
              <span className="text-xs">Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={handleSignOut} className="text-zinc-300 hover:bg-zinc-800">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="text-xs">Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
