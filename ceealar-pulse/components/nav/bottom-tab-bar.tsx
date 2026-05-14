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

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border flex justify-around items-center h-16 md:hidden">
      {tabs.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 ${
              isActive ? 'text-[#0F766E]' : 'text-muted-foreground'
            }`}
          >
            <Icon size={20} />
            <span className="text-xs">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
