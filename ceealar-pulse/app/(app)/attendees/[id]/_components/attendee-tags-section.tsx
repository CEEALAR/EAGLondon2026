'use client'

import { useState, useEffect } from 'react'
import { Tag } from '@/lib/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X } from 'lucide-react'

const SWATCHES = [
  '#0F766E',
  '#7C3AED',
  '#B45309',
  '#1D4ED8',
  '#B91C1C',
  '#047857',
  '#9D174D',
  '#374151',
]

interface AttendeeTagsSectionProps {
  attendeeId: string
  initialTags: Tag[]
}

export function AttendeeTagsSection({ attendeeId, initialTags }: AttendeeTagsSectionProps) {
  const [assigned, setAssigned] = useState<Tag[]>(initialTags)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedColor, setSelectedColor] = useState('#0F766E')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then(setAllTags)
  }, [])

  const handleRemove = (tagId: string) => {
    void fetch(`/api/attendees/${attendeeId}/tags/${tagId}`, { method: 'DELETE' })
      .then(() => setAssigned((prev) => prev.filter((t) => t.id !== tagId)))
  }

  const assignTag = (tag: Tag) => {
    setAssigned((prev) => [...prev, tag])
    setPopoverOpen(false)
    setSearchQuery('')
    void fetch(`/api/attendees/${attendeeId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tag.id }),
    })
  }

  const handleCreate = async () => {
    const name = searchQuery.trim()
    if (!name) return
    setCreating(true)
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color: selectedColor }),
    })
    if (res.ok) {
      const newTag: Tag = await res.json()
      setAllTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)))
      assignTag(newTag)
    }
    setCreating(false)
    setSearchQuery('')
    setSelectedColor('#0F766E')
  }

  const assignedIds = new Set(assigned.map((t) => t.id))
  const filtered = allTags.filter(
    (t) =>
      !assignedIds.has(t.id) &&
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const exactMatch = allTags.some(
    (t) => t.name.toLowerCase() === searchQuery.trim().toLowerCase()
  )
  const showCreate = searchQuery.trim().length > 0 && !exactMatch

  return (
    <div className="space-y-2">
      {/* Assigned chips */}
      <div className="flex flex-wrap gap-1.5">
        {assigned.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs bg-background"
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            <span className="font-medium">{tag.name}</span>
            <button
              type="button"
              onClick={() => handleRemove(tag.id)}
              aria-label={`Remove tag ${tag.name}`}
              className="ml-0.5 text-muted-foreground hover:text-foreground"
            >
              <X size={11} />
            </button>
          </span>
        ))}

        {/* Add tag popover */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger className="inline-flex items-center gap-1 h-6 rounded-full border border-input bg-background text-xs px-2 hover:bg-accent hover:text-accent-foreground transition-colors">
            <Plus size={11} />
            Add tag
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <Input
              autoFocus
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm mb-2"
            />

            {/* Existing matching tags */}
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {filtered.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => assignTag(tag)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex items-center gap-2"
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))}
            </div>

            {/* Create new tag */}
            {showCreate && (
              <div className="border-t mt-2 pt-2 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Create &quot;{searchQuery.trim()}&quot;
                </p>
                <div className="flex flex-wrap gap-1">
                  {SWATCHES.map((swatch) => (
                    <div
                      key={swatch}
                      onClick={() => setSelectedColor(swatch)}
                      className={`w-5 h-5 rounded cursor-pointer flex-shrink-0 ${
                        selectedColor === swatch ? 'ring-2 ring-offset-1 ring-black' : ''
                      }`}
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="default"
                  disabled={creating}
                  onClick={handleCreate}
                  className="w-full"
                >
                  {creating ? 'Creating…' : 'Create'}
                </Button>
              </div>
            )}

            {filtered.length === 0 && !showCreate && (
              <p className="text-xs text-muted-foreground px-2 py-1">
                {searchQuery ? 'No matches' : 'No tags available — type to create one'}
              </p>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
