/**
 * Per-activity-type icon shown next to each feed row. Pure presentational.
 */
import { CalendarPlus, CheckCircle2, ListTodo, Square, Activity } from 'lucide-react'

const SIZE = 16

interface IconStyle {
  Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  bg: string
  fg: string
}

function styleFor(action: string, hasTime: boolean): IconStyle {
  switch (action) {
    case 'meeting_created':
      return hasTime
        ? { Icon: CalendarPlus, bg: 'bg-[var(--color-teal)]/12', fg: 'text-[var(--color-teal)]' }
        : { Icon: Square,       bg: 'bg-amber-100',              fg: 'text-amber-700' }
    case 'status_done':
      return   { Icon: CheckCircle2, bg: 'bg-emerald-100',     fg: 'text-emerald-700' }
    case 'action_item_added':
      return   { Icon: ListTodo,      bg: 'bg-blue-100',        fg: 'text-blue-700' }
    case 'action_item_completed':
      return   { Icon: CheckCircle2, bg: 'bg-emerald-100',     fg: 'text-emerald-700' }
    default:
      return   { Icon: Activity,     bg: 'bg-muted',           fg: 'text-muted-foreground' }
  }
}

export function ActivityIcon({ action, hasTime }: { action: string; hasTime: boolean }) {
  const { Icon, bg, fg } = styleFor(action, hasTime)
  return (
    <span className={`flex shrink-0 w-8 h-8 rounded-full items-center justify-center ${bg}`}>
      <Icon size={SIZE} className={fg} strokeWidth={2.2} />
    </span>
  )
}
