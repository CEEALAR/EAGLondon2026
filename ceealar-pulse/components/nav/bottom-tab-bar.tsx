'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Calendar, Activity, User } from 'lucide-react'

const tabs = [
  { href: '/attendees', icon: Users, label: 'Attendees' },
  { href: '/meetings', icon: Calendar, label: 'Meetings' },
  { href: '/feed', icon: Activity, label: 'Feed' },
  { href: '/me', icon: User, label: 'Me' },
]

export function BottomTabBar({ unreadFeed = 0 }: { unreadFeed?: number }) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[100] h-16 md:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        // Force GPU layer + own stacking context so iOS Safari doesn't
        // briefly detach the fixed nav during URL-bar / overscroll events.
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      {/* Frosted glass surface */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-xl border-t border-border/70" />
      <ul className="relative flex justify-around items-stretch h-full px-1">
        {tabs.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="press relative flex flex-col items-center justify-center h-full gap-0.5 transition-colors duration-150"
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute top-1.5 h-1 w-8 rounded-full bg-[var(--color-teal)] fade-up"
                  />
                )}
                <div className="relative">
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.4 : 1.8}
                    className={isActive ? 'text-[var(--color-teal)]' : 'text-muted-foreground'}
                  />
                  {href === '/feed' && unreadFeed > 0 && (
                    <span
                      aria-label={`${unreadFeed} unread`}
                      className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-gold)] text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-background tabular-nums"
                    >
                      {unreadFeed >= 99 ? '99+' : unreadFeed}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] tracking-tight ${
                    isActive
                      ? 'text-[var(--color-teal)] font-semibold'
                      : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
