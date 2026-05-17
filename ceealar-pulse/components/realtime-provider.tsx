'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribe to meetings/action_items/activity changes and refresh the current
 * page so server components re-fetch. A burst of changes (e.g. an iCal sync
 * inserting 20 meetings, or 4 teammates simultaneously editing during a busy
 * session block) gets coalesced into a single refresh per 2-second window —
 * leading edge fires immediately so single edits still feel instant.
 */
const DEBOUNCE_MS = 2000

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const cooldown = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef(false)

  useEffect(() => {
    const requestRefresh = () => {
      if (cooldown.current) {
        pending.current = true
        return
      }
      router.refresh()
      cooldown.current = setTimeout(() => {
        cooldown.current = null
        if (pending.current) {
          pending.current = false
          requestRefresh()
        }
      }, DEBOUNCE_MS)
    }

    const supabase = createClient()
    const channel = supabase
      .channel('app-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, requestRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'action_items' }, requestRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity' }, requestRefresh)
      .subscribe()

    return () => {
      if (cooldown.current) clearTimeout(cooldown.current)
      void supabase.removeChannel(channel)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}
