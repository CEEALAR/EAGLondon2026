'use client'

import React, { useRef, useState, useMemo, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Attendee, Tag, TeamMember } from '@/lib/types'
import { AttendeeRow, type AssigneeMini } from './attendee-row'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SlidersHorizontal, X, ChevronDown, Search, ArrowUpDown } from 'lucide-react'
import { PRIORITY_LABELS } from '@/components/priority-badge'

type SortMode = 'name' | 'priority'

const SORT_LABEL: Record<SortMode, string> = {
  name: 'A → Z',
  priority: 'Priority',
}

interface AttendeeListProps {
  attendees: Attendee[]
  allTags: Tag[]
  teamMembers?: TeamMember[]
  /** attendee_id -> [user_id, ...] of who's actively assigned (owner ∪ members). */
  assignments?: Record<string, string[]>
}

type FilterState = {
  tagIds: Set<string>
  priority: Set<number>
  expertise: Set<string>
  interests: Set<string>
  careerStage: Set<string>
  country: Set<string>
  seekingWork: Set<string>
  assignedTo: Set<string>   // user_ids
}

const emptyFilters = (): FilterState => ({
  tagIds: new Set(),
  priority: new Set(),
  expertise: new Set(),
  interests: new Set(),
  careerStage: new Set(),
  country: new Set(),
  seekingWork: new Set(),
  assignedTo: new Set(),
})

// ── Persistence ───────────────────────────────────────────────────────────
// Keep query, filter selections, and sort mode across navigations within the
// same browser. Sets aren't JSON-serializable so they round-trip via arrays.
const STORAGE_KEY = 'pulse.attendees.prefs.v1'

type PersistedPrefs = {
  query: string
  sortMode: SortMode
  filters: {
    tagIds: string[]
    priority: number[]
    expertise: string[]
    interests: string[]
    careerStage: string[]
    country: string[]
    seekingWork: string[]
    assignedTo?: string[]
  }
}

function loadPrefs(): PersistedPrefs | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedPrefs
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function savePrefs(prefs: PersistedPrefs) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // quota or privacy mode — silent
  }
}

function filtersToJson(f: FilterState): PersistedPrefs['filters'] {
  return {
    tagIds:       [...f.tagIds],
    priority:     [...f.priority],
    expertise:    [...f.expertise],
    interests:    [...f.interests],
    careerStage:  [...f.careerStage],
    country:      [...f.country],
    seekingWork:  [...f.seekingWork],
    assignedTo:   [...f.assignedTo],
  }
}

function filtersFromJson(j: PersistedPrefs['filters'] | undefined): FilterState {
  if (!j) return emptyFilters()
  return {
    tagIds:       new Set(j.tagIds ?? []),
    priority:     new Set(j.priority ?? []),
    expertise:    new Set(j.expertise ?? []),
    interests:    new Set(j.interests ?? []),
    careerStage:  new Set(j.careerStage ?? []),
    country:      new Set(j.country ?? []),
    seekingWork:  new Set(j.seekingWork ?? []),
    assignedTo:   new Set(j.assignedTo ?? []),
  }
}

function activeCount(f: FilterState): number {
  return (
    f.tagIds.size +
    f.priority.size +
    f.expertise.size +
    f.interests.size +
    f.careerStage.size +
    f.country.size +
    f.seekingWork.size +
    f.assignedTo.size
  )
}

export function AttendeeList({ attendees, allTags, teamMembers = [], assignments = {} }: AttendeeListProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState<FilterState>(emptyFilters())
  const [applied, setApplied] = useState<FilterState>(emptyFilters())
  const [sortMode, setSortMode] = useState<SortMode>('name')
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Restore persisted prefs on mount (after hydration so SSR markup matches)
  useEffect(() => {
    const p = loadPrefs()
    if (p) {
      if (typeof p.query === 'string') {
        setQuery(p.query)
        setDebouncedQuery(p.query)
      }
      if (p.sortMode === 'name' || p.sortMode === 'priority') setSortMode(p.sortMode)
      const restored = filtersFromJson(p.filters)
      setApplied(restored)
      setDraft(restored)
    }
    setPrefsLoaded(true)
  }, [])

  // Persist whenever the user-visible prefs change
  useEffect(() => {
    if (!prefsLoaded) return
    savePrefs({ query, sortMode, filters: filtersToJson(applied) })
  }, [prefsLoaded, query, sortMode, applied])

  // ⌘K / Ctrl-K focuses the search bar from anywhere on /attendees
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setQuery('')
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

    if (applied.assignedTo.size > 0) {
      result = result.filter((a) => {
        const ids = assignments[a.id]
        if (!ids || ids.length === 0) return false
        return [...applied.assignedTo].some((u) => ids.includes(u))
      })
    }

    if (sortMode === 'priority') {
      // Highest priority first (5 → 1), then unprioritized (null) by name.
      result = [...result].sort((a, b) => {
        const pa = typeof a.priority === 'number' ? a.priority : -1
        const pb = typeof b.priority === 'number' ? b.priority : -1
        if (pa !== pb) return pb - pa
        const an = `${a.last_name ?? ''} ${a.first_name ?? ''}`.toLowerCase()
        const bn = `${b.last_name ?? ''} ${b.first_name ?? ''}`.toLowerCase()
        return an.localeCompare(bn)
      })
    }

    return result
  }, [attendees, debouncedQuery, applied, sortMode, assignments])

  // Memoize teammate display lookup once so each row render is O(1)
  const teamMembersById = useMemo(() => {
    const map = new Map<string, TeamMember>()
    for (const m of teamMembers) map.set(m.id, m)
    return map
  }, [teamMembers])

  const assigneeListFor = (attendeeId: string): AssigneeMini[] => {
    const ids = assignments[attendeeId]
    if (!ids || ids.length === 0) return []
    return ids
      .map((uid) => {
        const tm = teamMembersById.get(uid)
        if (!tm) return null
        const name = tm.display_name ?? tm.email
        const initials = name
          .split(/\s+/)
          .map((w) => w[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase()
        return { user_id: uid, display_name: name, initials }
      })
      .filter((x): x is AssigneeMini => x !== null)
  }

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  })

  // Force re-measurement when the scroll container resizes (mobile keyboard
  // appearing/disappearing, orientation change, etc.) AND on initial mount.
  // Without this, the virtualizer occasionally reads height 0 on first paint
  // on mobile and renders no rows even when `filtered` has items.
  useEffect(() => {
    const node = parentRef.current
    if (!node) return
    virtualizer.measure()
    const ro = new ResizeObserver(() => virtualizer.measure())
    ro.observe(node)
    return () => ro.disconnect()
  }, [virtualizer])

  const appliedCount = activeCount(applied)

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-full md:min-h-0 flex-1">
      {/* Search bar row */}
      <div className="flex gap-2 px-4 py-2 sticky top-0 bg-background/85 backdrop-blur-md z-10 border-b border-border/70 shrink-0">
        <div className="relative flex-1">
          {/* Left search icon */}
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70"
            strokeWidth={2.2}
          />
          <Input
            ref={searchInputRef}
            placeholder="Search by name or company…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-16 h-10 text-[14px] rounded-full bg-card/60 border-border/60 focus-visible:border-[var(--color-teal)]/40 focus-visible:ring-[var(--color-teal)]/15"
            aria-label="Search attendees"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted/70 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          ) : (
            <kbd
              aria-hidden
              className="hidden md:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-0.5 rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tracking-tight"
            >
              ⌘K
            </kbd>
          )}
        </div>
        <button
          onClick={() => setSortMode((m) => (m === 'name' ? 'priority' : 'name'))}
          aria-label={`Sort: ${SORT_LABEL[sortMode]}. Click to change.`}
          title={`Sort: ${SORT_LABEL[sortMode]}`}
          className={`press h-10 px-3 rounded-full flex items-center gap-1.5 transition-all text-xs font-medium ${
            sortMode === 'priority'
              ? 'bg-[var(--color-teal)]/10 text-[var(--color-teal)] border border-[var(--color-teal)]/30'
              : 'bg-card/60 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-card/90'
          }`}
        >
          <ArrowUpDown size={13} strokeWidth={2.2} />
          <span className="hidden sm:inline">{SORT_LABEL[sortMode]}</span>
        </button>
        <button
          onClick={() => {
            setDraft({
              tagIds: new Set(applied.tagIds),
              priority: new Set(applied.priority),
              expertise: new Set(applied.expertise),
              interests: new Set(applied.interests),
              careerStage: new Set(applied.careerStage),
              country: new Set(applied.country),
              seekingWork: new Set(applied.seekingWork),
              assignedTo: new Set(applied.assignedTo),
            })
            setFilterOpen(true)
          }}
          aria-label="Filters"
          className={`press relative h-10 w-10 rounded-full flex items-center justify-center transition-all ${
            appliedCount > 0
              ? 'bg-[var(--color-teal)] text-white shadow-md hover:bg-[var(--color-teal-deep)]'
              : 'bg-card/60 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-card/90'
          }`}
        >
          <SlidersHorizontal size={16} strokeWidth={2.2} />
          {appliedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[var(--color-gold)] text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center leading-none border-2 border-background">
              {appliedCount}
            </span>
          )}
        </button>
      </div>

      {/* Result count strip + active filter chips */}
      {(appliedCount > 0 || debouncedQuery) && (
        <div className="px-4 py-2 text-xs bg-muted/30 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground tabular-nums shrink-0">
              {filtered.length.toLocaleString()} of {attendees.length.toLocaleString()}
            </span>
            {/* Priority chips */}
            {[...applied.priority]
              .sort((a, b) => b - a)
              .map((p) => (
                <button
                  key={`pri-${p}`}
                  onClick={() =>
                    setApplied((a) => ({ ...a, priority: toggleSet(a.priority, p, false) }))
                  }
                  className="press inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-teal)]/10 text-[var(--color-teal)] hover:bg-[var(--color-teal)]/15"
                >
                  {PRIORITY_LABELS[p]}
                  <X size={11} />
                </button>
              ))}
            {/* Tag chips */}
            {[...applied.tagIds].map((id) => {
              const t = allTags.find((tag) => tag.id === id)
              if (!t) return null
              return (
                <button
                  key={`tag-${id}`}
                  onClick={() =>
                    setApplied((a) => ({ ...a, tagIds: toggleSet(a.tagIds, id, false) }))
                  }
                  className="press inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80"
                  style={{ color: t.color }}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  {t.name}
                  <X size={11} />
                </button>
              )
            })}
            {/* Assigned-to chips */}
            {[...applied.assignedTo].map((uid) => {
              const tm = teamMembersById.get(uid)
              const label = tm?.display_name ?? tm?.email ?? uid
              return (
                <button
                  key={`assignedTo-${uid}`}
                  onClick={() =>
                    setApplied((a) => ({ ...a, assignedTo: toggleSet(a.assignedTo, uid, false) }))
                  }
                  className="press inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-teal)]/10 text-[var(--color-teal)] border border-[var(--color-teal)]/30 hover:bg-[var(--color-teal)]/15"
                  title={`Assigned to ${label}`}
                >
                  <span className="max-w-[160px] truncate">{label}</span>
                  <X size={11} />
                </button>
              )
            })}
            {/* Generic value chips for the text dimensions */}
            {([
              ['expertise', applied.expertise] as const,
              ['interests', applied.interests] as const,
              ['careerStage', applied.careerStage] as const,
              ['country', applied.country] as const,
              ['seekingWork', applied.seekingWork] as const,
            ]).flatMap(([key, set]) =>
              [...set].map((v) => (
                <button
                  key={`${key}-${v}`}
                  onClick={() =>
                    setApplied((a) => ({ ...a, [key]: toggleSet(a[key], v, false) }))
                  }
                  className="press inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card border border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                  title={v}
                >
                  <span className="max-w-[160px] truncate">{v}</span>
                  <X size={11} />
                </button>
              ))
            )}
            {appliedCount > 0 && (
              <button
                onClick={() => setApplied(emptyFilters())}
                className="press text-[var(--color-teal)] hover:underline shrink-0 ml-auto"
              >
                Clear all
              </button>
            )}
          </div>
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
        ) : virtualizer.getVirtualItems().length === 0 ? (
          // Virtualizer hasn't measured yet (or container is hidden) —
          // render up to 20 rows in normal flow so the user always sees results.
          // Once the virtualizer measures, it takes over via the branch below.
          <div className="relative w-full">
            {filtered.slice(0, 20).map((a) => (
              <AttendeeRow
                key={a.id}
                attendee={a}
                assignees={assigneeListFor(a.id)}
                style={{ position: 'relative', width: '100%', height: '72px' }}
              />
            ))}
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize() }} className="relative w-full">
            {virtualizer.getVirtualItems().map((item) => (
              <AttendeeRow
                key={item.key}
                attendee={filtered[item.index]}
                assignees={assigneeListFor(filtered[item.index].id)}
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

      {/* Filter Sheet — side panel on desktop, full-width drawer on mobile */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60 shrink-0">
            <SheetTitle className="flex items-center justify-between gap-2">
              <span>Filters</span>
              {activeCount(draft) > 0 && (
                <span className="text-xs font-medium text-[var(--color-teal)]">
                  {activeCount(draft)} selected
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {/* Priority — large chip toggles for fastest interaction */}
            {facets.priority.length > 0 && (
              <FilterSection
                title="Priority"
                count={draft.priority.size}
                defaultOpen
              >
                <div className="flex flex-wrap gap-1.5">
                  {facets.priority.map(([p, count]) => {
                    const selected = draft.priority.has(p)
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, priority: toggleSet(d.priority, p, !selected) }))
                        }
                        className={`press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                          selected
                            ? 'bg-[var(--color-teal)] text-white border-[var(--color-teal)]'
                            : 'bg-card border-border hover:border-[var(--color-teal)]/40 hover:bg-muted/40'
                        }`}
                      >
                        {PRIORITY_LABELS[p]}
                        <span className={`tabular-nums text-[10px] ${selected ? 'opacity-80' : 'text-muted-foreground'}`}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </FilterSection>
            )}

            {/* Assigned to — filter attendees by which teammate(s) are on them */}
            {teamMembers.length > 0 && (
              <FilterSection
                title="Assigned to"
                count={draft.assignedTo.size}
                defaultOpen={draft.assignedTo.size > 0}
              >
                <div className="flex flex-wrap gap-1.5">
                  {teamMembers.map((tm) => {
                    const selected = draft.assignedTo.has(tm.id)
                    const label = tm.display_name ?? tm.email
                    return (
                      <button
                        key={tm.id}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, assignedTo: toggleSet(d.assignedTo, tm.id, !selected) }))
                        }
                        className={`press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                          selected
                            ? 'bg-[var(--color-teal)] text-white border-[var(--color-teal)]'
                            : 'bg-card border-border hover:border-[var(--color-teal)]/40 hover:bg-muted/40'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
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

          <div className="flex gap-2 px-5 py-3 border-t border-border/60 bg-background shrink-0">
            <Button
              variant="ghost"
              className="flex-1 text-muted-foreground"
              onClick={() => setDraft(emptyFilters())}
              disabled={activeCount(draft) === 0}
            >
              Reset
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-[var(--color-teal)] hover:bg-[var(--color-teal-deep)]"
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
    <details className="rounded-lg bg-card border border-border/60 group" open={defaultOpen}>
      <summary className="px-3.5 py-2.5 cursor-pointer select-none flex items-center justify-between hover:bg-muted/30 rounded-lg list-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-sm font-medium">
          {title}
          {count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-teal)] text-white text-[10px] font-bold tabular-nums">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          className="text-muted-foreground transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <div className="px-3.5 pb-3 pt-1 border-t border-border/40">{children}</div>
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
