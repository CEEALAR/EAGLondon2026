'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProfileDropdown } from './profile-dropdown'

const navLinks = [
  { href: '/attendees', label: 'Attendees' },
  { href: '/meetings', label: 'Meetings' },
  { href: '/feed', label: 'Feed' },
  { href: '/me', label: 'Me' },
]

interface TopNavProps {
  user: {
    email: string
    display_name: string | null
    avatar_url: string | null
  }
}

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname()

  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-border px-6 items-center justify-between">
      <span className="font-display italic text-lg text-[#0F766E]">CEEALAR Pulse</span>

      <nav className="flex gap-6">
        {navLinks.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={
                isActive
                  ? 'text-[#0F766E] font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <ProfileDropdown user={user} />
    </header>
  )
}
