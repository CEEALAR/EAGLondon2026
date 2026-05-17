'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TeamMember } from '@/lib/types'

interface MeetingMember {
  user_id: string
  display_name: string | null
  email: string
}

interface MeetingMembersSectionProps {
  meetingId: string
  initialMembers: MeetingMember[]
  allTeamMembers: TeamMember[]
}

export function MeetingMembersSection({
  meetingId,
  initialMembers,
  allTeamMembers,
}: MeetingMembersSectionProps) {
  const [members, setMembers] = useState<MeetingMember[]>(initialMembers)
  const [adding, setAdding] = useState(false)

  const assignableMembers = allTeamMembers.filter(
    (tm) => !members.some((m) => m.user_id === tm.id)
  )

  async function handleAdd(userId: string) {
    const tm = allTeamMembers.find((t) => t.id === userId)
    if (!tm) return
    setAdding(true)
    const optimistic: MeetingMember = {
      user_id: tm.id,
      display_name: tm.display_name,
      email: tm.email,
    }
    setMembers((prev) => [...prev, optimistic])
    await fetch(`/api/meetings/${meetingId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    setAdding(false)
  }

  async function handleRemove(userId: string) {
    setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    await fetch(`/api/meetings/${meetingId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between text-sm">
            <span>{m.display_name ?? m.email}</span>
            <button
              onClick={() => handleRemove(m.user_id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`Remove ${m.display_name ?? m.email}`}
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>

      {assignableMembers.length > 0 && (
        <Select
          disabled={adding}
          onValueChange={(value) => { if (value) handleAdd(value) }}
          value=""
        >
          <SelectTrigger className="h-8 text-sm text-muted-foreground">
            <SelectValue placeholder="+ Add team member…" />
          </SelectTrigger>
          <SelectContent>
            {assignableMembers.map((tm) => (
              <SelectItem key={tm.id} value={tm.id}>
                {tm.display_name ?? tm.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
