'use client'

import { useState } from 'react'

type Filter = 'all' | 'me' | 'others'

export function FeedFilter({
  rows,
}: {
  rows: Array<{ id: string; involvesMe: boolean; isMine: boolean; node: React.ReactNode }>
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = rows.filter((r) => {
    if (filter === 'me') return r.involvesMe
    if (filter === 'others') return !r.isMine
    return true
  })

  return (
    <>
      <div className="px-4 pb-3 pt-1 flex gap-1.5 sticky top-0 bg-background/85 backdrop-blur-md z-10 border-b border-border/60">
        {([
          ['all', `All${rows.length ? ` · ${rows.length}` : ''}`],
          ['me', `About me${rows.filter((r) => r.involvesMe).length ? ` · ${rows.filter((r) => r.involvesMe).length}` : ''}`],
          ['others', 'By others'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`press px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === key
                ? 'bg-[var(--color-teal)] text-white shadow-sm'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No activity in this view.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((r) => (
            <li key={r.id}>{r.node}</li>
          ))}
        </ul>
      )}
    </>
  )
}
