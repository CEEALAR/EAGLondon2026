'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { parseISO } from 'date-fns'
import type { TeamMember, MeetingStatus } from '@/lib/types'

export type TimelineMeeting = {
  id: string
  status: MeetingStatus
  scheduled_at: string
  location: string | null
  owner_id: string | null
  attendee_name: string
}

interface MeetingsTimelineProps {
  meetings: TimelineMeeting[]
  teamMembers: TeamMember[]
}

const CONF_DAYS = [
  { value: '2026-05-29', label: '29 May' },
  { value: '2026-05-30', label: '30 May' },
  { value: '2026-05-31', label: '31 May' },
]

const HOUR_START = 8
const HOUR_END = 22
const TOTAL_HOURS = HOUR_END - HOUR_START
const MIN_HOUR_HEIGHT = 28   // minimum so blocks stay tappable
const MAX_HOUR_HEIGHT = 60   // matches mobile / tall windows

function statusStyle(s: MeetingStatus): string {
  switch (s) {
    case 'planned':
      return 'bg-gradient-to-br from-[#14958B] to-[#0B5953] text-white shadow-sm ring-1 ring-white/10'
    case 'done':
      return 'bg-gradient-to-br from-[#E8B73E] to-[#B8870E] text-white shadow-sm ring-1 ring-white/10'
    case 'want_to_meet':
      return 'bg-white/70 backdrop-blur-sm text-gray-700 border border-gray-300 shadow-sm'
    default:
      return 'bg-muted/60 text-muted-foreground border border-border/60'
  }
}

function MeetingBlock({
  meeting,
  hourHeight,
}: {
  meeting: TimelineMeeting
  hourHeight: number
}) {
  const date = parseISO(meeting.scheduled_at)
  const topPx = (date.getHours() - HOUR_START) * hourHeight + (date.getMinutes() / 60) * hourHeight
  // 30 min meeting block; keep a small visible min-height
  const blockHeight = Math.max(20, hourHeight * 0.48)
  return (
    <Link href={`/meetings/${meeting.id}`} aria-label={`Meeting with ${meeting.attendee_name}`}>
      <div
        className={`press absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-[11px] leading-tight overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md ${statusStyle(meeting.status)}`}
        style={{ top: `${topPx}px`, height: `${blockHeight}px` }}
      >
        <p className="font-semibold truncate tracking-tight">{meeting.attendee_name}</p>
        {meeting.location && blockHeight >= 26 && (
          <p className="truncate opacity-80 text-[10px]">{meeting.location}</p>
        )}
      </div>
    </Link>
  )
}

function MemberLane({
  meetings,
  hourHeight,
}: {
  meetings: TimelineMeeting[]
  hourHeight: number
}) {
  return (
    <div className="relative" style={{ height: `${TOTAL_HOURS * hourHeight}px` }}>
      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-border/50"
          style={{ top: `${i * hourHeight}px` }}
        >
          <span className="absolute -top-2 left-0 text-[10px] text-muted-foreground select-none w-7 text-right pr-0.5 tabular-nums">
            {String(HOUR_START + i).padStart(2, '0')}
          </span>
        </div>
      ))}
      <div className="absolute inset-0" style={{ left: '28px' }}>
        {meetings.map((m) => (
          <MeetingBlock key={m.id} meeting={m} hourHeight={hourHeight} />
        ))}
      </div>
    </div>
  )
}

export function MeetingsTimeline({ meetings, teamMembers }: MeetingsTimelineProps) {
  const [selectedDay, setSelectedDay] = useState(CONF_DAYS[0].value)
  const [selectedMemberId, setSelectedMemberId] = useState(teamMembers[0]?.id ?? '')
  const containerRef = useRef<HTMLDivElement>(null)
  // 60px/hour on mobile, fit-to-viewport on desktop
  const [hourHeight, setHourHeight] = useState(MAX_HOUR_HEIGHT)

  useEffect(() => {
    function recompute() {
      const isDesktop = window.matchMedia('(min-width: 768px)').matches
      if (!isDesktop) {
        setHourHeight(MAX_HOUR_HEIGHT)
        return
      }
      const node = containerRef.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      // Space available below the timeline grid top, minus a small bottom gutter
      const available = window.innerHeight - rect.top - 24
      const next = Math.max(MIN_HOUR_HEIGHT, Math.min(MAX_HOUR_HEIGHT, Math.floor(available / TOTAL_HOURS)))
      setHourHeight(next)
    }
    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, Record<string, TimelineMeeting[]>> = {}
    for (const day of CONF_DAYS) {
      map[day.value] = {}
      for (const m of teamMembers) map[day.value][m.id] = []
    }
    for (const m of meetings) {
      const day = m.scheduled_at.slice(0, 10)
      if (map[day] && m.owner_id && map[day][m.owner_id]) {
        map[day][m.owner_id].push(m)
      }
    }
    return map
  }, [meetings, teamMembers])

  const dayData = grouped[selectedDay] ?? {}

  return (
    <div>
      {/* Day tabs — segmented control */}
      <div className="inline-flex p-1 rounded-full bg-muted/50 mb-4 gap-0.5">
        {CONF_DAYS.map((day) => (
          <button
            key={day.value}
            onClick={() => setSelectedDay(day.value)}
            className={`press px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
              selectedDay === day.value
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Mobile: member pill tabs + single lane */}
      <div className="md:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
          {teamMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0 transition-colors ${
                selectedMemberId === m.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {m.display_name ?? m.email.split('@')[0]}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto">
          <MemberLane meetings={dayData[selectedMemberId] ?? []} hourHeight={MAX_HOUR_HEIGHT} />
        </div>
      </div>

      {/* Desktop: 4-column grid, fits the viewport */}
      <div ref={containerRef} className="hidden md:grid md:grid-cols-4 gap-2">
        {teamMembers.map((m) => (
          <div key={m.id}>
            <p className="text-xs font-semibold text-center mb-2 text-foreground truncate">
              {m.display_name ?? m.email.split('@')[0]}
            </p>
            <MemberLane meetings={dayData[m.id] ?? []} hourHeight={hourHeight} />
          </div>
        ))}
      </div>
    </div>
  )
}
