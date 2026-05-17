'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'

type Item = {
  id: string
  text: string
  done: boolean
  meeting_id: string
  meetings: {
    id: string
    attendees: { first_name: string | null; last_name: string | null } | null
  } | null
}

export function MyActionItems({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems)

  async function handleToggle(item: Item) {
    const newDone = !item.done
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: newDone } : i)))
    await fetch(`/api/meetings/${item.meeting_id}/action-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: newDone }),
    })
  }

  const pending = items.filter((i) => !i.done)
  const done = items.filter((i) => i.done)

  function renderItem(item: Item) {
    const attendeeName = [
      item.meetings?.attendees?.first_name,
      item.meetings?.attendees?.last_name,
    ].filter(Boolean).join(' ') || 'Unknown'

    return (
      <li key={item.id} className="flex items-start gap-2.5">
        <Checkbox
          id={`ai-${item.id}`}
          checked={item.done}
          onCheckedChange={() => handleToggle(item)}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <label
            htmlFor={`ai-${item.id}`}
            className={`text-sm cursor-pointer block ${item.done ? 'line-through text-muted-foreground' : ''}`}
          >
            {item.text}
          </label>
          <Link href={`/meetings/${item.meeting_id}`} className="text-xs text-muted-foreground hover:underline">
            {attendeeName}
          </Link>
        </div>
      </li>
    )
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <ul className="space-y-2.5">{pending.map(renderItem)}</ul>
      )}
      {done.length > 0 && (
        <details className="text-sm">
          <summary className="text-xs text-muted-foreground cursor-pointer select-none">
            {done.length} completed
          </summary>
          <ul className="mt-2 space-y-2.5">{done.map(renderItem)}</ul>
        </details>
      )}
    </div>
  )
}
