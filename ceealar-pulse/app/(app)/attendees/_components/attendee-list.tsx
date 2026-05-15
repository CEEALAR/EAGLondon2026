'use client'

import React, { useRef, useState, useMemo, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Attendee, Tag } from '@/lib/types'
import { AttendeeRow } from './attendee-row'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SlidersHorizontal, X } from 'lucide-react'

interface AttendeeListProps {
  attendees: Attendee[]
  allTags: Tag[]
}

export function AttendeeList({ attendees, allTags }: AttendeeListProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [activeTagIds, setActiveTagIds] = useState<Set<string>>(new Set())

  // Debounce search query by 200ms
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query)
    }, 200)
    return () => clearTimeout(timeout)
  }, [query])

  // Filter attendees by name/company and active tag filter
  const filtered = useMemo(() => {
    let result = attendees
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase()
      result = result.filter((a) =>
        [a.first_name, a.last_name, a.company].some((f) =>
          f?.toLowerCase().includes(q)
        )
      )
    }
    if (activeTagIds.size > 0) {
      result = result.filter((a) => {
        const attendeeTags = new Set((a.attendee_tags ?? []).map((at) => at.tag_id))
        return [...activeTagIds].every((id) => attendeeTags.has(id))
      })
    }
    return result
  }, [attendees, debouncedQuery, activeTagIds])

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
        <div className="relative flex-1">
          <Input
            placeholder="Search by name or company..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-8"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <Button
          variant={activeTagIds.size > 0 ? 'default' : 'outline'}
          size="icon"
          onClick={() => setFilterOpen(true)}
          aria-label="Filters"
          className="relative"
        >
          <SlidersHorizontal size={16} />
          {activeTagIds.size > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {activeTagIds.size}
            </span>
          )}
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

      {/* Filter Sheet */}
      <Sheet
        open={filterOpen}
        onOpenChange={(open) => {
          if (open) setSelectedTagIds(new Set(activeTagIds))
          setFilterOpen(open)
        }}
      >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Filter by Tags</SheetTitle>
          </SheetHeader>
          <div className="max-h-64 overflow-y-auto space-y-1 mt-3">
            {allTags.length === 0 && (
              <p className="text-sm text-muted-foreground">No tags yet — create them from an attendee&apos;s page.</p>
            )}
            {allTags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 cursor-pointer py-1.5">
                <Checkbox
                  checked={selectedTagIds.has(tag.id)}
                  onCheckedChange={(checked) => {
                    setSelectedTagIds((prev) => {
                      const next = new Set(prev)
                      if (checked) next.add(tag.id)
                      else next.delete(tag.id)
                      return next
                    })
                  }}
                />
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm">{tag.name}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSelectedTagIds(new Set())
                setActiveTagIds(new Set())
                setFilterOpen(false)
              }}
            >
              Clear
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={() => {
                setActiveTagIds(selectedTagIds)
                setFilterOpen(false)
              }}
            >
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
