'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type MeetingForNotif = {
  id: string
  scheduled_at: string
  attendees: { first_name: string | null; last_name: string | null } | null
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  // Effect 1: Request notification permission once on mount
  useEffect(() => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [])

  // Effect 2: Subscribe to meetings changes and schedule notifications
  useEffect(() => {
    if (typeof Notification === 'undefined') return

    const timerIds: ReturnType<typeof setTimeout>[] = []

    async function scheduleNotifications() {
      if (typeof Notification === 'undefined') return
      if (Notification.permission !== 'granted') return

      // Clear any existing timers before rescheduling
      for (const id of timerIds) {
        clearTimeout(id)
      }
      timerIds.length = 0

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
          [attendee?.first_name, attendee?.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() || 'an attendee'

        const timeStr = new Date(meeting.scheduled_at).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })

        const timerId = setTimeout(() => {
          if (typeof Notification === 'undefined') return
          if (Notification.permission !== 'granted') return
          new Notification('Meeting in 10 minutes', {
            body: `Meeting with ${attendeeName} at ${timeStr}`,
            icon: '/apple-touch-icon.png',
          })
        }, msUntil10MinBefore)

        timerIds.push(timerId)
      }
    }

    const supabase = createClient()

    // Schedule immediately on mount
    void scheduleNotifications()

    // Subscribe to meetings table changes and reschedule on any event
    const channel = supabase
      .channel('notification-provider-meetings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        void scheduleNotifications()
      })
      .subscribe()

    return () => {
      for (const id of timerIds) {
        clearTimeout(id)
      }
      void supabase.removeChannel(channel)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}
