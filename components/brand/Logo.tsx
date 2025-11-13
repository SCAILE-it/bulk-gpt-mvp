'use client'

import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-base',
  }

  return (
    <Link href="/bulk" className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} relative flex-shrink-0`}>
        <Image
          src="/logo.svg"
          alt="Bulk GPT"
          width={32}
          height={32}
          className="h-full w-full"
          priority
        />
      </div>
      {showText && (
        <span className={`font-semibold tracking-tight ${textSizeClasses[size]} text-foreground`}>
          Bulk GPT
        </span>
      )}
    </Link>
  )
}


