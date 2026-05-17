'use client'

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProfileDropdownProps {
  user: {
    email: string
    display_name: string | null
    avatar_url: string | null
  }
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const initial = user.display_name?.[0] ?? user.email[0] ?? '?'

  function cycleTheme() {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const themeLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="press w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:ring-offset-2 ring-1 ring-black/5 p-0 border-0 cursor-pointer shadow-sm hover:shadow-md transition-shadow">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.display_name ?? user.email}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-sm font-semibold text-[var(--color-teal)]">
            {initial.toUpperCase()}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <div className="px-2 py-1.5">
          <div className="font-medium text-sm truncate">{user.display_name ?? user.email}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/admin')}>
          Admin
        </DropdownMenuItem>
        <DropdownMenuItem onClick={cycleTheme} className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ThemeIcon size={14} />
            Theme
          </span>
          <span className="text-xs text-muted-foreground">{themeLabel}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
