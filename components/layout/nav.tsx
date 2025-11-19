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
import { LogOut, User, ChevronDown, Menu, X, Moon, Sun, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/Logo'
import { useTheme } from 'next-themes'
import { mutate } from 'swr'

export function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

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

  // Non-blocking prefetch on hover - doesn't delay clicks
  const handleNavHover = (href: string) => {
    // Use requestIdleCallback for non-blocking prefetch, fallback to setTimeout
    if (typeof window !== 'undefined') {
      const prefetchData = () => {
        // Prefetch SWR data for the target route (non-blocking)
        if (href === '/profile') {
          mutate('profile').catch(() => {}) // Ignore errors
        } else if (href === '/executions') {
          mutate('batches').catch(() => {})
        } else if (href === '/context') {
          mutate('/api/context-files').catch(() => {})
        }
      }
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(prefetchData, { timeout: 100 })
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(prefetchData, 0)
      }
    }
    // Next.js Link already handles route prefetching automatically
  }

  // Reordered navigation: RUN (primary action) → CONTEXT → EXECUTIONS (history)
  const navLinks = [
    { href: '/context', label: 'CONTEXT' },
    { href: '/agents', label: 'RUN' },
    { href: '/executions', label: 'LOG' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex items-center justify-between gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 px-3 xs:px-4 sm:px-5 md:px-6 lg:px-7 xl:px-8 py-2.5 xs:py-2.5 sm:py-3 md:py-3.5 lg:py-4">
        {/* Logo */}
        <Logo size="sm" />

        {/* Desktop Navigation Links - Now visible on all pages including homepage */}
        <nav className="hidden sm:flex items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-3 flex-1 justify-center max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              onMouseEnter={() => handleNavHover(link.href)}
              className={cn(
                'px-3 py-2 text-xs font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer select-none touch-manipulation',
                'active:scale-[0.98] transition-transform duration-75',
                pathname === link.href
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
              aria-current={pathname === link.href ? 'page' : undefined}
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 flex-shrink-0">
          {/* Mobile Menu Button - Now visible on all pages */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden min-w-[44px] min-h-[44px] xs:min-w-[40px] xs:min-h-[40px] touch-manipulation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>

          {/* User Profile Dropdown - Cursor-style minimal */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded transition-colors min-h-[32px] touch-manipulation" 
                data-testid="user-menu-button"
                aria-label="User menu"
                aria-haspopup="true"
              >
                {/* Show email on desktop - Cursor style: just text, no avatar */}
                {userEmail && (
                  <span className="hidden lg:block text-xs max-w-[140px] truncate">
                    {userEmail}
                  </span>
                )}
                {/* Mobile: just show icon, no circle */}
                <User className="h-3.5 w-3.5 lg:hidden" aria-hidden="true" />
                <ChevronDown className="hidden sm:block h-3 w-3 text-muted-foreground" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-medium leading-none">MY ACCOUNT</p>
                  {userEmail && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {userEmail}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.preventDefault()
                  router.push('/profile')
                }}
                onMouseEnter={() => handleNavHover('/profile')}
                className="cursor-pointer select-none touch-manipulation"
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span className="text-xs">PROFILE</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Theme Selection inside User Menu */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                THEME
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" />
                <span className="text-xs">LIGHT</span>
                {theme === 'light' && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                <span className="text-xs">DARK</span>
                {theme === 'dark' && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" />
                <span className="text-xs">SYSTEM</span>
                {theme === 'system' && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.preventDefault()
                  handleSignOut()
                }}
                className="select-none touch-manipulation"
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span className="text-xs">SIGN OUT</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Menu - Now visible on all pages */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in-0"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Mobile Menu Panel */}
          <div 
            id="mobile-navigation"
            className="md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 z-50 animate-in slide-in-from-top-2 duration-200"
          >
            <nav className="container mx-auto px-4 py-3 space-y-1" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    // Immediate navigation - don't wait for anything
                    setMobileMenuOpen(false)
                    // Let Next.js handle navigation immediately
                  }}
                  onMouseEnter={() => handleNavHover(link.href)}
                  className={cn(
                    'block px-4 py-3 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] flex items-center touch-manipulation cursor-pointer select-none',
                    'active:scale-[0.98] transition-transform duration-75',
                    pathname === link.href
                      ? 'text-foreground bg-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 active:bg-accent'
                  )}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
