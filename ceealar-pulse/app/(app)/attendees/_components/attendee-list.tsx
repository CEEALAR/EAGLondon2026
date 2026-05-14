'use client'

import React, { useRef, useState, useMemo, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Attendee } from '@/lib/types'
import { AttendeeRow } from './attendee-row'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SlidersHorizontal } from 'lucide-react'

interface AttendeeListProps {
  attendees: Attendee[]
}

export function AttendeeList({ attendees }: AttendeeListProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  // Debounce search query by 200ms
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query)
    }, 200)
    return () => clearTimeout(timeout)
  }, [query])

  // Filter attendees by name or company
  const filtered = useMemo(() => {
    if (!debouncedQuery) return attendees
    const q = debouncedQuery.toLowerCase()
    return attendees.filter((a) =>
      [a.first_name, a.last_name, a.company].some((f) =>
        f?.toLowerCase().includes(q)
      )
    )
  }, [attendees, debouncedQuery])

  // TanStack Virtual setup
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  })

  return (
    <div className="flex flex-col h-[calc(100vh-56px-64px)] md:h-[calc(100vh-56px)]">
      {/* Search bar row */}
      <div className="flex gap-2 px-4 py-2 sticky top-0 bg-background z-10 border-b border-border shrink-0">
        <Input
          placeholder="Search by name or company..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setFilterOpen(true)}
          aria-label="Filters"
        >
          <SlidersHorizontal size={16} />
        </Button>
      </div>

      {/* Scrollable virtual list container */}
      <div ref={parentRef} className="flex-1 overflow-auto relative">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <p className="text-muted-foreground text-sm text-center">
              {debouncedQuery
                ? `No results for '${debouncedQuery}'`
                : 'No attendees imported yet — visit /admin/import'}
            </p>
          </div>
        ) : (
          <div
            style={{ height: virtualizer.getTotalSize() }}
            className="relative w-full"
          >
            {virtualizer.getVirtualItems().map((item) => (
              <AttendeeRow
                key={item.key}
                attendee={filtered[item.index]}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${item.size}px`,
                  transform: `translateY(${item.start}px)`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filter Sheet stub */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground mt-4">
            Tag, expertise, interest, and country filters coming in Phase 4.
          </p>
          <Button
            variant="outline"
            onClick={() => setFilterOpen(false)}
            className="mt-4 w-full"
          >
            Close
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  )
}
