'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Tag } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2 } from 'lucide-react'

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

export default function ManageTagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#0F766E')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.auth.getUser(),
      fetch('/api/tags').then((r) => r.json()),
      supabase.from('attendee_tags').select('tag_id'),
    ]).then(([{ data: { user } }, tagList, { data: assignments }]) => {
      setCurrentUserId(user?.id ?? null)
      setTags(tagList ?? [])
      const counts: Record<string, number> = {}
      for (const row of assignments ?? []) {
        counts[row.tag_id] = (counts[row.tag_id] ?? 0) + 1
      }
      setAssignmentCounts(counts)
    })
  }, [])

  const displayTags = [
    ...tags.filter((t) => t.is_system).sort((a, b) => a.name.localeCompare(b.name)),
    ...tags.filter((t) => !t.is_system && t.created_by === currentUserId).sort((a, b) => a.name.localeCompare(b.name)),
  ]

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  const handleSave = async () => {
    if (!editingId) return
    setSaving(true)
    const res = await fetch(`/api/tags/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, color: editColor }),
    })
    if (res.ok) {
      const updated: Tag = await res.json()
      setTags((prev) => prev.map((t) => (t.id === editingId ? updated : t)))
      setEditingId(null)
    }
    setSaving(false)
  }

  const handleDelete = (tagId: string) => {
    void fetch(`/api/tags/${tagId}`, { method: 'DELETE' }).then((res) => {
      if (res.ok || res.status === 204) {
        setTags((prev) => prev.filter((t) => t.id !== tagId))
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Link href="/me" className="text-sm text-muted-foreground">
        ← Back to Profile
      </Link>

      <h1 className="text-2xl font-bold">My Tags</h1>

      {displayTags.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No tags yet. Create one from an attendee&apos;s detail page.
        </p>
      )}

      {displayTags.map((tag) => {
        const count = assignmentCounts[tag.id] ?? 0
        const isEditing = editingId === tag.id
        const canEdit = !tag.is_system && tag.created_by === currentUserId

        return (
          <div
            key={tag.id}
            className="border rounded-lg px-4 py-3 flex items-center gap-3 bg-card"
          >
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: isEditing ? editColor : tag.color }}
            />

            {isEditing ? (
              <div className="flex-1 space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="flex flex-wrap gap-1">
                  {SWATCHES.map((swatch) => (
                    <div
                      key={swatch}
                      onClick={() => setEditColor(swatch)}
                      className={`w-5 h-5 rounded cursor-pointer flex-shrink-0 ${
                        editColor === swatch ? 'ring-2 ring-offset-1 ring-black' : ''
                      }`}
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="default" disabled={saving} onClick={handleSave}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <span className="font-medium text-sm">{tag.name}</span>
                {tag.is_system && (
                  <span className="text-xs bg-muted text-muted-foreground rounded px-1">system</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">{count} assigned</span>
                {canEdit && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startEdit(tag)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      disabled={count > 0}
                      title={count > 0 ? 'Remove all assignments first' : 'Delete tag'}
                      onClick={() => handleDelete(tag.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
