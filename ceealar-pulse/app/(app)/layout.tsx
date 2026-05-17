import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomTabBar } from '@/components/nav/bottom-tab-bar'
import { TopNav } from '@/components/nav/top-nav'
import { RealtimeProvider } from '@/components/realtime-provider'
import { CalendarAutoSync } from '@/components/calendar-auto-sync'
import { CalendarSetupBanner } from '@/components/calendar-setup-banner'
import { OfflineBanner } from '@/components/offline-banner'
import { Toaster } from '@/components/ui/sonner'
import { getUnreadFeedCount } from '@/lib/unread-feed'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member } = await (supabase as any)
    .from('team_members')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single()

  const userForNav = {
    email: user.email ?? '',
    display_name: (member?.display_name as string | null) ?? null,
    avatar_url: (member?.avatar_url as string | null) ?? null,
  }

  const unreadFeed = await getUnreadFeedCount(user.id)

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      <OfflineBanner />
      <TopNav user={userForNav} unreadFeed={unreadFeed} />
      <main className="md:pt-14 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <CalendarSetupBanner userId={user.id} />
        <RealtimeProvider>{children}</RealtimeProvider>
        <CalendarAutoSync />
      </main>
      <BottomTabBar unreadFeed={unreadFeed} />
      <Toaster position="top-center" richColors />
    </div>
  )
}
