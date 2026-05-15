'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type MeetingForNotif = {
  id: string
  scheduled_at: string
  attendees: { first_name: string | null; last_name: string | null } | null
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [dismissed, setDismissed] = useState(false)
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([])

  const scheduleNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return

    for (const id of timerIds.current) clearTimeout(id)
    timerIds.current = []

    const supabase = createClient()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('meetings')
      .select('id, scheduled_at, attendees(first_name, last_name)')
      .not('scheduled_at', 'is', null)
      .eq('status', 'planned')
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())

    if (error || !data) return

    const meetings = data as unknown as MeetingForNotif[]

    for (const meeting of meetings) {
      const msUntil10MinBefore =
        new Date(meeting.scheduled_at).getTime() - Date.now() - 10 * 60 * 1000

      if (msUntil10MinBefore <= 0) continue

      const attendee = meeting.attendees
      const attendeeName =
        [attendee?.first_name, attendee?.last_name].filter(Boolean).join(' ').trim() ||
        'an attendee'

      const timeStr = new Date(meeting.scheduled_at).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })

      const timerId = setTimeout(() => {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
        new Notification('Meeting in 10 minutes', {
          body: `Meeting with ${attendeeName} at ${timeStr}`,
          icon: '/apple-touch-icon.png',
        })
      }, msUntil10MinBefore)

      timerIds.current.push(timerId)
    }
  }, [])

  // Read permission state on mount
  useEffect(() => {
    if (typeof Notification === 'undefined') return
    setPermission(Notification.permission)
    if (Notification.permission === 'granted') void scheduleNotifications()
  }, [scheduleNotifications])

  // Subscribe to meeting changes and reschedule
  useEffect(() => {
    if (typeof Notification === 'undefined') return
    const supabase = createClient()
    const channel = supabase
      .channel('notification-provider-meetings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        void scheduleNotifications()
      })
      .subscribe()

    return () => {
      for (const id of timerIds.current) clearTimeout(id)
      void supabase.removeChannel(channel)
    }
  }, [scheduleNotifications])

  async function requestPermission() {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') void scheduleNotifications()
  }

  return (
    <>
      {permission === 'default' && !dismissed && (
        <div className="fixed top-14 inset-x-0 z-50 flex items-center justify-between gap-2 bg-[var(--color-teal)] text-white px-4 py-2 text-sm">
          <span>Enable meeting reminders — get notified 10 min before each meeting</span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => void requestPermission()}
              className="rounded bg-white text-[var(--color-teal)] px-3 py-1 text-xs font-semibold"
            >
              Allow
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-white/70 hover:text-white text-xs"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  )
}
