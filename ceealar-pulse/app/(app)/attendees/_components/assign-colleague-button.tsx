'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import type { TeamMember } from '@/lib/types'

interface AssignColleagueButtonProps {
  attendeeId: string
  currentUserId: string
  teamMembers: TeamMember[]
}

export function AssignColleagueButton({
  attendeeId,
  currentUserId,
  teamMembers,
}: AssignColleagueButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const colleagues = teamMembers.filter((tm) => tm.id !== currentUserId)
  if (colleagues.length === 0) return null

  async function handleAssign(userId: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendee_id: attendeeId,
          owner_id: userId,
          status: 'want_to_meet',
        }),
      })
      if (res.ok) {
        const meeting = await res.json()
        // Also add the assigner as a member so both can see it
        await fetch(`/api/meetings/${meeting.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: currentUserId }),
        })
        router.push(`/meetings/${meeting.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        Assign to colleague
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {colleagues.map((tm) => (
          <DropdownMenuItem key={tm.id} onClick={() => handleAssign(tm.id)}>
            {tm.display_name ?? tm.email}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
