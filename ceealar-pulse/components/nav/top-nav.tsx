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
    <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 bg-white/85 backdrop-blur-xl border-b border-border/70 px-6 items-center justify-between">
      <Link href="/attendees" className="flex items-baseline gap-2 group">
        <span className="font-display italic text-xl text-[var(--color-teal)] tracking-tight group-hover:text-[var(--color-teal-deep)] transition-colors">
          Pulse
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-medium hidden lg:inline">
          CEEALAR · EAG London
        </span>
      </Link>

      <nav className="flex gap-1">
        {navLinks.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`relative px-3 py-1.5 text-sm rounded-md transition-colors ${
                isActive
                  ? 'text-[var(--color-teal)] font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {label}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] h-0.5 w-6 rounded-full bg-[var(--color-teal)]"
                />
              )}
            </Link>
          )
        })}
      </nav>

      <ProfileDropdown user={user} />
    </header>
  )
}
