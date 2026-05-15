'use client'

import { useState, useMemo } from 'react'
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
const HOUR_HEIGHT = 60

function statusStyle(s: MeetingStatus): string {
  switch (s) {
    case 'planned':      return 'bg-[#0F766E] text-white'
    case 'done':         return 'bg-[#D4A017] text-white'
    case 'want_to_meet': return 'bg-gray-100 text-gray-700 border border-gray-300'
    default:             return 'bg-muted text-muted-foreground border border-border'
  }
}

function MeetingBlock({ meeting }: { meeting: TimelineMeeting }) {
  const date = parseISO(meeting.scheduled_at)
  const topPx = (date.getHours() - HOUR_START) * HOUR_HEIGHT + date.getMinutes()
  return (
    <Link href={`/meetings/${meeting.id}`}>
      <div
        className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[11px] leading-tight overflow-hidden hover:opacity-80 transition-opacity ${statusStyle(meeting.status)}`}
        style={{ top: `${topPx}px`, height: '29px' }}
      >
        <p className="font-medium truncate">{meeting.attendee_name}</p>
        {meeting.location && (
          <p className="truncate opacity-75 text-[10px]">{meeting.location}</p>
        )}
      </div>
    </Link>
  )
}

function MemberLane({ meetings }: { meetings: TimelineMeeting[] }) {
  const totalHours = HOUR_END - HOUR_START
  return (
    <div className="relative" style={{ height: `${totalHours * HOUR_HEIGHT}px` }}>
      {Array.from({ length: totalHours }, (_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-border"
          style={{ top: `${i * HOUR_HEIGHT}px` }}
        >
          <span className="absolute -top-2.5 left-0 text-[10px] text-muted-foreground select-none w-7 text-right pr-0.5">
            {String(HOUR_START + i).padStart(2, '0')}
          </span>
        </div>
      ))}
      <div className="absolute inset-0" style={{ left: '28px' }}>
        {meetings.map((m) => (
          <MeetingBlock key={m.id} meeting={m} />
        ))}
      </div>
    </div>
  )
}

export function MeetingsTimeline({ meetings, teamMembers }: MeetingsTimelineProps) {
  const [selectedDay, setSelectedDay] = useState(CONF_DAYS[0].value)
  const [selectedMemberId, setSelectedMemberId] = useState(teamMembers[0]?.id ?? '')

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
      {/* Day tabs */}
      <div className="flex gap-0 border-b mb-4">
        {CONF_DAYS.map((day) => (
          <button
            key={day.value}
            onClick={() => setSelectedDay(day.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              selectedDay === day.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
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
          <MemberLane meetings={dayData[selectedMemberId] ?? []} />
        </div>
      </div>

      {/* Desktop: 4-column grid */}
      <div className="hidden md:grid md:grid-cols-4 gap-2">
        {teamMembers.map((m) => (
          <div key={m.id}>
            <p className="text-xs font-semibold text-center mb-2 text-foreground truncate">
              {m.display_name ?? m.email.split('@')[0]}
            </p>
            <MemberLane meetings={dayData[m.id] ?? []} />
          </div>
        ))}
      </div>
    </div>
  )
}
