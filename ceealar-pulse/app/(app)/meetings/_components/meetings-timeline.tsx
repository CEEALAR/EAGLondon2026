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

type ViewMode = 'per-person' | 'overlay' | 'find-time'

const CONF_DAYS = [
  { value: '2026-05-29', label: '29 May' },
  { value: '2026-05-30', label: '30 May' },
  { value: '2026-05-31', label: '31 May' },
]

const HOUR_START = 8
const HOUR_END = 22
const TOTAL_HOURS = HOUR_END - HOUR_START
const MIN_HOUR_HEIGHT = 28
const MAX_HOUR_HEIGHT = 60

// Per-owner brand-aligned colors (deterministic by team_members sort order)
const OWNER_PALETTE = [
  { hex: '#0F766E', name: 'teal' },   // Attila
  { hex: '#D4A017', name: 'gold' },   // David
  { hex: '#7C3AED', name: 'violet' }, // Elisa
  { hex: '#DB2777', name: 'pink' },   // Greg
  { hex: '#0E7490', name: 'cyan' },   // (overflow)
  { hex: '#84CC16', name: 'lime' },
]

function ownerColor(teamMembers: TeamMember[], ownerId: string | null) {
  if (!ownerId) return { hex: '#6B7280', name: 'gray' }
  const idx = teamMembers.findIndex((m) => m.id === ownerId)
  if (idx < 0) return { hex: '#6B7280', name: 'gray' }
  return OWNER_PALETTE[idx % OWNER_PALETTE.length]
}

// ── Status-based style for per-person view ──────────────────────────────────
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
  ownerColorHex,
}: {
  meeting: TimelineMeeting
  hourHeight: number
  ownerColorHex?: string
}) {
  const date = parseISO(meeting.scheduled_at)
  const topPx = (date.getHours() - HOUR_START) * hourHeight + (date.getMinutes() / 60) * hourHeight
  const blockHeight = Math.max(20, hourHeight * 0.48)

  // If ownerColorHex provided → render owner-tinted block (overlay mode).
  // Otherwise → status-tinted block (per-person mode).
  const overlayStyle = ownerColorHex
    ? {
        backgroundColor: ownerColorHex,
        color: 'white',
      }
    : undefined

  return (
    <Link href={`/meetings/${meeting.id}`} aria-label={`Meeting with ${meeting.attendee_name}`}>
      <div
        className={`press absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-[11px] leading-tight overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md shadow-sm ring-1 ring-white/10 ${
          ownerColorHex ? '' : statusStyle(meeting.status)
        }`}
        style={{ top: `${topPx}px`, height: `${blockHeight}px`, ...overlayStyle }}
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
  teamMembers,
  colorByOwner = false,
}: {
  meetings: TimelineMeeting[]
  hourHeight: number
  teamMembers: TeamMember[]
  colorByOwner?: boolean
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
          <MeetingBlock
            key={m.id}
            meeting={m}
            hourHeight={hourHeight}
            ownerColorHex={colorByOwner ? ownerColor(teamMembers, m.owner_id).hex : undefined}
          />
        ))}
      </div>
    </div>
  )
}

// ── Find-time view ──────────────────────────────────────────────────────────

function findFreeSlots(
  meetings: TimelineMeeting[],
  selectedMemberIds: Set<string>,
  day: string,
  durationMin: number,
): Array<{ start: Date; end: Date }> {
  const dayStart = new Date(`${day}T${String(HOUR_START).padStart(2, '0')}:00:00`)
  const dayEnd = new Date(`${day}T${String(HOUR_END).padStart(2, '0')}:00:00`)

  // Collect all "busy" intervals from selected members' meetings for this day
  const busy: Array<[number, number]> = []
  for (const m of meetings) {
    if (!m.owner_id || !selectedMemberIds.has(m.owner_id)) continue
    if (!m.scheduled_at.startsWith(day)) continue
    if (m.status === 'cancelled' || m.status === 'no_show') continue
    const s = parseISO(m.scheduled_at).getTime()
    const dur = 30 * 60_000 // we assume 30-min meetings — duration_minutes isn't in TimelineMeeting
    busy.push([s, s + dur])
  }
  busy.sort((a, b) => a[0] - b[0])

  // Merge overlapping busy intervals
  const merged: Array<[number, number]> = []
  for (const [s, e] of busy) {
    const last = merged[merged.length - 1]
    if (last && s <= last[1]) {
      last[1] = Math.max(last[1], e)
    } else {
      merged.push([s, e])
    }
  }

  // Scan in 15-min increments — find runs ≥ durationMin where nobody is busy
  const slots: Array<{ start: Date; end: Date }> = []
  const stepMs = 15 * 60_000
  const durMs = durationMin * 60_000
  let cursor = dayStart.getTime()
  const end = dayEnd.getTime()
  while (cursor + durMs <= end) {
    const slotEnd = cursor + durMs
    const conflicts = merged.some(([bs, be]) => bs < slotEnd && be > cursor)
    if (!conflicts) {
      // Try to extend: keep walking until conflict or day end
      let extended = slotEnd
      while (extended + stepMs <= end) {
        const next = extended + stepMs
        const blocks = merged.some(([bs, be]) => bs < next && be > extended - stepMs)
        if (blocks) break
        extended = next
      }
      slots.push({ start: new Date(cursor), end: new Date(extended) })
      cursor = extended
      continue
    }
    cursor += stepMs
  }
  return slots
}

function FindTimeView({
  meetings,
  teamMembers,
  selectedDay,
}: {
  meetings: TimelineMeeting[]
  teamMembers: TeamMember[]
  selectedDay: string
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(teamMembers.map((m) => m.id))
  )
  const [duration, setDuration] = useState(30)

  const slots = useMemo(
    () => findFreeSlots(meetings, selected, selectedDay, duration),
    [meetings, selected, selectedDay, duration]
  )

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-card border border-border/60 p-3 space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Everyone available?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {teamMembers.map((m) => {
              const isOn = selected.has(m.id)
              const c = ownerColor(teamMembers, m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={`press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                    isOn
                      ? 'bg-white text-foreground border-border/80 shadow-sm'
                      : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50'
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.hex, opacity: isOn ? 1 : 0.35 }}
                  />
                  {m.display_name ?? m.email.split('@')[0]}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            For how long?
          </p>
          <div className="flex gap-1.5">
            {[15, 30, 45, 60].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`press px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  duration === d
                    ? 'bg-[var(--color-teal)] text-white'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected.size === 0 ? (
        <p className="text-sm text-muted-foreground px-1">
          Select at least one person to see when they&apos;re free.
        </p>
      ) : slots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="text-sm font-medium">No common free slots</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a shorter duration or remove a teammate.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {slots.map((s, i) => {
            const fmt = (d: Date) =>
              d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
            const lengthMin = Math.round((s.end.getTime() - s.start.getTime()) / 60_000)
            return (
              <li
                key={i}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border/60 hover:border-[var(--color-teal)]/40 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold tabular-nums">
                    {fmt(s.start)} – {fmt(s.end)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lengthMin} min window
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-teal)] font-bold">
                  free
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function MeetingsTimeline({ meetings, teamMembers }: MeetingsTimelineProps) {
  const [selectedDay, setSelectedDay] = useState(CONF_DAYS[0].value)
  const [selectedMemberId, setSelectedMemberId] = useState(teamMembers[0]?.id ?? '')
  const [viewMode, setViewMode] = useState<ViewMode>('per-person')
  const containerRef = useRef<HTMLDivElement>(null)
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
      const available = window.innerHeight - rect.top - 24
      const next = Math.max(MIN_HOUR_HEIGHT, Math.min(MAX_HOUR_HEIGHT, Math.floor(available / TOTAL_HOURS)))
      setHourHeight(next)
    }
    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [viewMode])

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
  const dayMeetings = useMemo(
    () => Object.values(dayData).flat() as TimelineMeeting[],
    [dayData]
  )

  return (
    <div>
      {/* Top row: day tabs + view-mode toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex p-1 rounded-full bg-muted/50 gap-0.5">
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

        <div className="inline-flex p-1 rounded-full bg-muted/50 gap-0.5 ml-auto">
          {([
            ['per-person', 'Per person'],
            ['overlay', 'Overlay'],
            ['find-time', 'Find time'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`press px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                viewMode === mode
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Owner legend — shown for overlay mode */}
      {viewMode === 'overlay' && (
        <div className="flex flex-wrap items-center gap-3 mb-3 px-1">
          {teamMembers.map((m) => {
            const c = ownerColor(teamMembers, m.id)
            return (
              <div key={m.id} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-white/30"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="text-muted-foreground">
                  {m.display_name ?? m.email.split('@')[0]}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Per-person */}
      {viewMode === 'per-person' && (
        <>
          {/* Mobile: member tabs + single lane */}
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
              <MemberLane
                meetings={dayData[selectedMemberId] ?? []}
                hourHeight={MAX_HOUR_HEIGHT}
                teamMembers={teamMembers}
              />
            </div>
          </div>
          {/* Desktop: 4-column grid */}
          <div ref={containerRef} className="hidden md:grid md:grid-cols-4 gap-2">
            {teamMembers.map((m) => (
              <div key={m.id}>
                <p className="text-xs font-semibold text-center mb-2 text-foreground truncate">
                  {m.display_name ?? m.email.split('@')[0]}
                </p>
                <MemberLane
                  meetings={dayData[m.id] ?? []}
                  hourHeight={hourHeight}
                  teamMembers={teamMembers}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Overlay: all meetings on a single lane, color-coded by owner */}
      {viewMode === 'overlay' && (
        <div ref={containerRef}>
          <MemberLane
            meetings={dayMeetings}
            hourHeight={hourHeight}
            teamMembers={teamMembers}
            colorByOwner
          />
        </div>
      )}

      {/* Find time */}
      {viewMode === 'find-time' && (
        <FindTimeView
          meetings={meetings}
          teamMembers={teamMembers}
          selectedDay={selectedDay}
        />
      )}
    </div>
  )
}
