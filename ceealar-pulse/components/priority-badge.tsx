/**
 * Priority badge for CEEALAR's strategic ranking.
 * 5 = Critical (highest), 4 = High, 3 = Medium, 2 = Low, 1 = Optional.
 */

export const PRIORITY_LABELS: Record<number, string> = {
  5: 'Critical',
  4: 'High',
  3: 'Medium',
  2: 'Low',
  1: 'Optional',
}

const PRIORITY_CLASSES: Record<number, string> = {
  5: 'bg-red-100 text-red-800 border-red-200',
  4: 'bg-orange-100 text-orange-800 border-orange-200',
  3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  2: 'bg-blue-100 text-blue-800 border-blue-200',
  1: 'bg-gray-100 text-gray-700 border-gray-200',
}

export function PriorityBadge({
  priority,
  size = 'sm',
}: {
  priority: number | null | undefined
  size?: 'sm' | 'xs'
}) {
  if (priority == null || !(priority in PRIORITY_LABELS)) return null
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClass} ${PRIORITY_CLASSES[priority]}`}
      title={`Priority ${priority} of 5 — ${PRIORITY_LABELS[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
