'use client'

import React, { useRef, useState, useMemo, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Attendee, Tag } from '@/lib/types'
import { AttendeeRow } from './attendee-row'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { PRIORITY_LABELS } from '@/components/priority-badge'

interface AttendeeListProps {
  attendees: Attendee[]
  allTags: Tag[]
}

type FilterState = {
  tagIds: Set<string>
  priority: Set<number>
  expertise: Set<string>
  interests: Set<string>
  careerStage: Set<string>
  country: Set<string>
  seekingWork: Set<string>
}

const emptyFilters = (): FilterState => ({
  tagIds: new Set(),
  priority: new Set(),
  expertise: new Set(),
  interests: new Set(),
  careerStage: new Set(),
  country: new Set(),
  seekingWork: new Set(),
})

function activeCount(f: FilterState): number {
  return (
    f.tagIds.size +
    f.priority.size +
    f.expertise.size +
    f.interests.size +
    f.careerStage.size +
    f.country.size +
    f.seekingWork.size
  )
}

export function AttendeeList({ attendees, allTags }: AttendeeListProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState<FilterState>(emptyFilters())
  const [applied, setApplied] = useState<FilterState>(emptyFilters())

  // Debounce search query by 200ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(t)
  }, [query])

  // Derive unique filter values from the loaded attendees (memoized)
  const facets = useMemo(() => {
    const expertiseCounts = new Map<string, number>()
    const interestCounts = new Map<string, number>()
    const careerStageCounts = new Map<string, number>()
    const countryCounts = new Map<string, number>()
    const seekingWorkCounts = new Map<string, number>()
    const priorityCounts = new Map<number, number>()

    for (const a of attendees) {
      for (const e of a.expertise ?? []) {
        const k = e.trim()
        if (k) expertiseCounts.set(k, (expertiseCounts.get(k) ?? 0) + 1)
      }
      for (const i of a.interests ?? []) {
        const k = i.trim()
        if (k) interestCounts.set(k, (interestCounts.get(k) ?? 0) + 1)
      }
      const cs = a.career_stage?.trim()
      if (cs) careerStageCounts.set(cs, (careerStageCounts.get(cs) ?? 0) + 1)
      const co = a.country?.trim()
      if (co) countryCounts.set(co, (countryCounts.get(co) ?? 0) + 1)
      const sw = typeof a.seeking_work === 'string' ? a.seeking_work.trim() : null
      if (sw) seekingWorkCounts.set(sw, (seekingWorkCounts.get(sw) ?? 0) + 1)
      if (typeof a.priority === 'number' && a.priority >= 1 && a.priority <= 5) {
        priorityCounts.set(a.priority, (priorityCounts.get(a.priority) ?? 0) + 1)
      }
    }

    function sorted(m: Map<string, number>) {
      return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    }

    // Priority sorted from highest (5) to lowest (1)
    const priority: [number, number][] = [5, 4, 3, 2, 1]
      .filter((p) => priorityCounts.has(p))
      .map((p) => [p, priorityCounts.get(p)!])

    return {
      expertise: sorted(expertiseCounts),
      interests: sorted(interestCounts),
      careerStage: sorted(careerStageCounts),
      country: sorted(countryCounts),
      seekingWork: sorted(seekingWorkCounts),
      priority,
    }
  }, [attendees])

  // Filter attendees by query + every active filter dimension
  const filtered = useMemo(() => {
    let result = attendees

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase()
      result = result.filter((a) =>
        [a.first_name, a.last_name, a.company].some((f) => f?.toLowerCase().includes(q))
      )
    }

    if (applied.priority.size > 0) {
      result = result.filter((a) => typeof a.priority === 'number' && applied.priority.has(a.priority))
    }

    if (applied.tagIds.size > 0) {
      result = result.filter((a) => {
        const at = new Set((a.attendee_tags ?? []).map((t) => t.tag_id))
        return [...applied.tagIds].every((id) => at.has(id))
      })
    }

    // Expertise / interests / career_stage / country use OR semantics within
    // a dimension (attendee matches if they have ANY of the selected values).
    if (applied.expertise.size > 0) {
      result = result.filter((a) => {
        const set = new Set(a.expertise ?? [])
        return [...applied.expertise].some((v) => set.has(v))
      })
    }
    if (applied.interests.size > 0) {
      result = result.filter((a) => {
        const set = new Set(a.interests ?? [])
        return [...applied.interests].some((v) => set.has(v))
      })
    }
    if (applied.careerStage.size > 0) {
      result = result.filter((a) => a.career_stage != null && applied.careerStage.has(a.career_stage))
    }
    if (applied.country.size > 0) {
      result = result.filter((a) => a.country != null && applied.country.has(a.country))
    }
    if (applied.seekingWork.size > 0) {
      result = result.filter((a) => typeof a.seeking_work === 'string' && applied.seekingWork.has(a.seeking_work))
    }

    return result
  }, [attendees, debouncedQuery, applied])

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  })

  const appliedCount = activeCount(applied)

  return (
    <div className="flex flex-col h-[calc(100vh-56px-64px)] md:h-[calc(100vh-56px)]">
      {/* Search bar row */}
      <div className="flex gap-2 px-4 py-2 sticky top-0 bg-background z-10 border-b border-border shrink-0">
        <div className="relative flex-1">
          <Input
            placeholder="Search by name or company…"
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
          variant={appliedCount > 0 ? 'default' : 'outline'}
          size="icon"
          onClick={() => {
            setDraft({
              tagIds: new Set(applied.tagIds),
              priority: new Set(applied.priority),
              expertise: new Set(applied.expertise),
              interests: new Set(applied.interests),
              careerStage: new Set(applied.careerStage),
              country: new Set(applied.country),
              seekingWork: new Set(applied.seekingWork),
            })
            setFilterOpen(true)
          }}
          aria-label="Filters"
          className="relative"
        >
          <SlidersHorizontal size={16} />
          {appliedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {appliedCount}
            </span>
          )}
        </Button>
      </div>

      {/* Result count strip */}
      {(appliedCount > 0 || debouncedQuery) && (
        <div className="px-4 py-1.5 text-xs text-muted-foreground bg-muted/30 border-b border-border">
          {filtered.length.toLocaleString()} of {attendees.length.toLocaleString()} attendees
        </div>
      )}

      {/* Scrollable virtual list */}
      <div ref={parentRef} className="flex-1 overflow-auto relative">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3 fade-up">
            <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
              <span className="text-2xl">🔍</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {debouncedQuery || appliedCount > 0 ? 'No matches' : 'No attendees yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {debouncedQuery || appliedCount > 0
                  ? 'Try a different search or clear some filters.'
                  : 'Import the Swapcard XLSX from the Admin page to get started.'}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize() }} className="relative w-full">
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
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Priority */}
            {facets.priority.length > 0 && (
              <FilterSection
                title="Priority"
                count={draft.priority.size}
                defaultOpen={draft.priority.size > 0 || facets.priority.length > 0}
              >
                <div className="space-y-0.5">
                  {facets.priority.map(([p, count]) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer py-1">
                      <Checkbox
                        checked={draft.priority.has(p)}
                        onCheckedChange={(c) =>
                          setDraft((d) => ({ ...d, priority: toggleSet(d.priority, p, !!c) }))
                        }
                      />
                      <span className="text-sm flex-1">
                        {PRIORITY_LABELS[p]} <span className="text-xs text-muted-foreground">(P{p})</span>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>
            )}

            {/* Tags */}
            <FilterSection
              title="Tags"
              count={draft.tagIds.size}
              defaultOpen={draft.tagIds.size > 0}
            >
              {allTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags yet — create them from an attendee&apos;s page.</p>
              ) : (
                allTags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 cursor-pointer py-1">
                    <Checkbox
                      checked={draft.tagIds.has(tag.id)}
                      onCheckedChange={(c) =>
                        setDraft((d) => ({ ...d, tagIds: toggleSet(d.tagIds, tag.id, !!c) }))
                      }
                    />
                    <span
                      className="inline-block w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm">{tag.name}</span>
                  </label>
                ))
              )}
            </FilterSection>

            <FacetSection
              title="Areas of Expertise"
              values={facets.expertise}
              selected={draft.expertise}
              onChange={(s) => setDraft((d) => ({ ...d, expertise: s }))}
            />

            <FacetSection
              title="Areas of Interest"
              values={facets.interests}
              selected={draft.interests}
              onChange={(s) => setDraft((d) => ({ ...d, interests: s }))}
            />

            <FacetSection
              title="Career Stage"
              values={facets.careerStage}
              selected={draft.careerStage}
              onChange={(s) => setDraft((d) => ({ ...d, careerStage: s }))}
            />

            <FacetSection
              title="Country"
              values={facets.country}
              selected={draft.country}
              onChange={(s) => setDraft((d) => ({ ...d, country: s }))}
            />

            <FacetSection
              title="Seeking work"
              values={facets.seekingWork}
              selected={draft.seekingWork}
              onChange={(s) => setDraft((d) => ({ ...d, seekingWork: s }))}
            />
          </div>

          <div className="mt-6 flex gap-2 sticky bottom-0 bg-background pt-3 border-t border-border">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDraft(emptyFilters())}
            >
              Clear all
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={() => {
                setApplied(draft)
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

function toggleSet<T>(prev: Set<T>, value: T, checked: boolean): Set<T> {
  const next = new Set(prev)
  if (checked) next.add(value)
  else next.delete(value)
  return next
}

function FilterSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details className="border rounded-lg" open={defaultOpen}>
      <summary className="px-3 py-2.5 cursor-pointer select-none flex items-center justify-between hover:bg-muted/30 rounded-lg">
        <span className="text-sm font-medium">
          {title}
          {count > 0 && (
            <span className="ml-2 text-xs font-normal text-[var(--color-teal)]">({count})</span>
          )}
        </span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </summary>
      <div className="px-3 pb-3 pt-1">{children}</div>
    </details>
  )
}

function FacetSection({
  title,
  values,
  selected,
  onChange,
}: {
  title: string
  values: [string, number][]
  selected: Set<string>
  onChange: (s: Set<string>) => void
}) {
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const COLLAPSED_LIMIT = 8

  const filtered = useMemo(() => {
    if (!search.trim()) return values
    const q = search.toLowerCase()
    return values.filter(([v]) => v.toLowerCase().includes(q))
  }, [values, search])

  const displayed = showAll || search ? filtered : filtered.slice(0, COLLAPSED_LIMIT)

  return (
    <FilterSection title={title} count={selected.size} defaultOpen={selected.size > 0}>
      {values.length > COLLAPSED_LIMIT && (
        <Input
          placeholder={`Search ${title.toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
      )}
      <div className="max-h-56 overflow-y-auto space-y-0.5">
        {displayed.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">No matches</p>
        ) : (
          displayed.map(([value, count]) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer py-1">
              <Checkbox
                checked={selected.has(value)}
                onCheckedChange={(c) => onChange(toggleSet(selected, value, !!c))}
              />
              <span className="text-sm flex-1 min-w-0 truncate">{value}</span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">{count}</span>
            </label>
          ))
        )}
      </div>
      {!showAll && !search && filtered.length > COLLAPSED_LIMIT && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-[var(--color-teal)] hover:underline mt-1"
        >
          Show all {filtered.length} →
        </button>
      )}
    </FilterSection>
  )
}
