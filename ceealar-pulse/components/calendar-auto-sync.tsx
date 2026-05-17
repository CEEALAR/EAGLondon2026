'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Triggers a throttled iCal sync on app mount.
 * The /api/me/calendar/sync endpoint enforces a 5-minute server-side throttle,
 * so this is safe to call on every page visit — most calls are no-ops.
 *
 * After a real sync (not throttled), refresh the current route to show updates.
 */
export function CalendarAutoSync() {
  const router = useRouter()
  const triggered = useRef(false)

  useEffect(() => {
    if (triggered.current) return
    triggered.current = true

    // Fire-and-forget. We don't block render on this.
    fetch('/api/me/calendar/sync', { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        if (!data || data.throttled || data.error) return
        // Real sync happened — refresh server data only if something changed
        const changed = (data.created ?? 0) + (data.promoted ?? 0) + (data.updated ?? 0) + (data.cancelled ?? 0) + (data.unmatched ?? 0)
        if (changed > 0) {
          router.refresh()
        }
      })
      .catch(() => {
        // Silent — server logs the error in user_ical_urls.last_sync_error
      })
  }, [router])

  return null
}
