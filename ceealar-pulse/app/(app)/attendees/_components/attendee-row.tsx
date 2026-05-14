'use client'

import React from 'react'
import Link from 'next/link'
import { Attendee } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

interface AttendeeRowProps {
  attendee: Attendee
  style: React.CSSProperties
}

export function AttendeeRow({ attendee, style }: AttendeeRowProps) {
  const firstInitial = attendee.first_name?.charAt(0).toUpperCase() ?? '?'
  const lastInitial = attendee.last_name?.charAt(0).toUpperCase() ?? '?'
  const initials = firstInitial + lastInitial

  const fullName =
    attendee.first_name || attendee.last_name
      ? `${attendee.first_name ?? ''} ${attendee.last_name ?? ''}`.trim()
      : attendee.swapcard_url

  const companyJob = [attendee.company, attendee.job_title]
    .filter(Boolean)
    .join(' · ')

  return (
    <div style={style} className="absolute w-full">
      <Link
        href={`/attendees/${attendee.id}`}
        className="flex items-center w-full h-[72px] px-4 gap-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
      >
        {/* Initials avatar */}
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-white font-semibold text-sm"
          style={{ backgroundColor: 'var(--color-teal)' }}
        >
          {initials}
        </div>

        {/* Name + company/job */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{companyJob}</p>
        </div>

        {/* Expertise chips */}
        {attendee.expertise && attendee.expertise.length > 0 && (
          <div className="flex gap-1 shrink-0">
            {attendee.expertise.slice(0, 2).map((exp) => (
              <Badge key={exp} variant="secondary" className="text-xs">
                {exp}
              </Badge>
            ))}
          </div>
        )}

        {/* Phase 4: tag chips */}
      </Link>
    </div>
  )
}
