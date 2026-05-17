'use client'

import React from 'react'
import Link from 'next/link'
import { Attendee } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { PriorityBadge } from '@/components/priority-badge'

interface AttendeeRowProps {
  attendee: Attendee
  style: React.CSSProperties
}

// Pick a soft brand-aligned hue from a stable hash of the name so each avatar
// reads as a distinct person without a clashing rainbow.
const AVATAR_PALETTES = [
  { from: '#0F766E', to: '#14958B' }, // teal
  { from: '#1E3A8A', to: '#3B82F6' }, // navy → blue
  { from: '#7C3AED', to: '#A855F7' }, // violet
  { from: '#0E7490', to: '#0891B2' }, // cyan
  { from: '#92400E', to: '#D4A017' }, // amber → gold
  { from: '#9D174D', to: '#DB2777' }, // pink
  { from: '#365314', to: '#84CC16' }, // olive → lime
  { from: '#312E81', to: '#6366F1' }, // indigo
]

function paletteFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length]
}

export function AttendeeRow({ attendee, style }: AttendeeRowProps) {
  const firstInitial = attendee.first_name?.charAt(0).toUpperCase() ?? '?'
  const lastInitial = attendee.last_name?.charAt(0).toUpperCase() ?? ''
  const initials = (firstInitial + lastInitial).slice(0, 2)

  const fullName =
    attendee.first_name || attendee.last_name
      ? `${attendee.first_name ?? ''} ${attendee.last_name ?? ''}`.trim()
      : attendee.swapcard_url

  const companyJob = [attendee.company, attendee.job_title].filter(Boolean).join(' · ')

  const palette = paletteFor(attendee.id)

  return (
    <div style={style} className="absolute w-full">
      <Link
        href={`/attendees/${attendee.id}`}
        className="press group flex items-center w-full h-[72px] px-4 gap-3 border-b border-border/60 cursor-pointer hover:bg-white/60 transition-colors duration-150"
      >
        {/* Gradient avatar with subtle ring */}
        <div
          className="flex items-center justify-center w-11 h-11 rounded-full shrink-0 text-white font-semibold text-sm tracking-tight ring-1 ring-black/5 shadow-sm transition-transform duration-200 group-hover:scale-[1.04]"
          style={{
            backgroundImage: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
          }}
          aria-hidden
        >
          {initials}
        </div>

        {/* Name + company/job */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] font-semibold text-foreground truncate tracking-tight">
              {fullName}
            </p>
            <PriorityBadge priority={attendee.priority} size="xs" />
          </div>
          {companyJob && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{companyJob}</p>
          )}
        </div>

        {/* Expertise chips on desktop only */}
        {attendee.expertise && attendee.expertise.length > 0 && (
          <div className="hidden sm:flex gap-1 shrink-0">
            {attendee.expertise.slice(0, 2).map((exp) => (
              <Badge
                key={exp}
                variant="secondary"
                className="text-[11px] font-medium px-2 py-0.5 bg-muted/60 text-muted-foreground border-0"
              >
                {exp}
              </Badge>
            ))}
          </div>
        )}

        {/* Subtle chevron hint on hover (desktop) */}
        <span
          aria-hidden
          className="hidden md:inline-block text-muted-foreground/40 group-hover:text-[var(--color-teal)] transition-colors duration-150 text-base shrink-0"
        >
          ›
        </span>
      </Link>
    </div>
  )
}
