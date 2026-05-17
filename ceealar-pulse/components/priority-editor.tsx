'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PRIORITY_LABELS } from '@/components/priority-badge'
import { toast } from 'sonner'
import { Check, Pencil } from 'lucide-react'

const PRIORITY_CLASSES: Record<number, string> = {
  5: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
  4: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  3: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  2: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  1: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
}

export function PriorityEditor({
  attendeeId,
  initialPriority,
  size = 'sm',
}: {
  attendeeId: string
  initialPriority: number | null
  size?: 'sm' | 'xs'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<number | null>(initialPriority)
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)

  async function save(next: number | null) {
    if (next === value) {
      setOpen(false)
      return
    }
    setSaving(true)
    const prev = value
    setValue(next)
    try {
      const res = await fetch(`/api/attendees/${attendeeId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: next }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(next === null ? 'Priority cleared' : `Set to ${PRIORITY_LABELS[next]}`)
      startTransition(() => router.refresh())
    } catch (e) {
      setValue(prev)
      toast.error(e instanceof Error ? e.message : 'Failed to update priority')
    } finally {
      setSaving(false)
      setOpen(false)
    }
  }

  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'

  const badgeContent = value
    ? (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full border ${sizeClass} ${PRIORITY_CLASSES[value]} cursor-pointer transition-colors`}>
        {PRIORITY_LABELS[value]}
        <Pencil size={10} className="opacity-50" />
      </span>
    )
    : (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground ${sizeClass} cursor-pointer transition-colors`}>
        + Priority
      </span>
    )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={saving}
        className="appearance-none bg-transparent border-0 p-0"
      >
        {badgeContent}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Set priority
        </div>
        {[5, 4, 3, 2, 1].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => save(p)}
            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className={`inline-flex items-center font-medium rounded-full border text-[10px] px-1.5 py-0 ${PRIORITY_CLASSES[p]}`}>
                {PRIORITY_LABELS[p]}
              </span>
              <span className="text-[11px] text-muted-foreground">P{p}</span>
            </span>
            {value === p && <Check size={14} className="text-[var(--color-teal)]" />}
          </button>
        ))}
        {value != null && (
          <>
            <div className="h-px bg-border/60 my-1" />
            <button
              type="button"
              onClick={() => save(null)}
              className="w-full flex items-center px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              Clear priority
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
