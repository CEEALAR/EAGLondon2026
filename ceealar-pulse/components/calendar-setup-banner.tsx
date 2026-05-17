import Link from 'next/link'
import { CalendarPlus, ArrowRight } from 'lucide-react'
import { createClient as createAdminClient } from '@supabase/supabase-js'

interface Props {
  userId: string
}

/**
 * Shown above the page content whenever the user hasn't connected their
 * Swapcard iCal feed yet. Renders nothing once connected.
 * Server component — does its own admin-client lookup (RLS-bypass safe;
 * we only check existence by user_id).
 */
export async function CalendarSetupBanner({ userId }: Props) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await admin
    .from('user_ical_urls')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (data) return null

  return (
    <div className="relative z-40 bg-gradient-to-r from-[var(--color-gold)]/15 to-[var(--color-teal)]/10 border-b border-[var(--color-gold)]/30 backdrop-blur-sm">
      <Link
        href="/me"
        className="group flex items-center gap-2 px-4 py-2 text-xs sm:text-sm hover:bg-[var(--color-gold)]/8 transition-colors"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-gold)]/25 text-[var(--color-gold)] shrink-0">
          <CalendarPlus size={13} strokeWidth={2.4} />
        </span>
        <span className="flex-1 text-foreground/90">
          <span className="font-semibold">Connect your Swapcard calendar</span>
          <span className="hidden sm:inline text-muted-foreground"> — auto-import your 1:1s in 2 minutes.</span>
        </span>
        <span className="flex items-center gap-1 text-[var(--color-teal)] font-medium shrink-0 group-hover:translate-x-0.5 transition-transform">
          Set up
          <ArrowRight size={13} />
        </span>
      </Link>
    </div>
  )
}
