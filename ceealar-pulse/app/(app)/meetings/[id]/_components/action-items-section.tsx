'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import type { ActionItem } from '@/lib/types'

interface ActionItemsSectionProps {
  meetingId: string
  initialItems: ActionItem[]
}

export function ActionItemsSection({ meetingId, initialItems }: ActionItemsSectionProps) {
  const [items, setItems] = useState<ActionItem[]>(initialItems)
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleAdd() {
    const text = newText.trim()
    if (!text) return
    setAdding(true)
    try {
      const res = await fetch(`/api/meetings/${meetingId}/action-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error(await res.text())
      const item = await res.json() as ActionItem
      setItems((prev) => [...prev, item])
      setNewText('')
      inputRef.current?.focus()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add action item')
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(item: ActionItem) {
    const newDone = !item.done
    const prev = items
    setItems((xs) => xs.map((i) => (i.id === item.id ? { ...i, done: newDone } : i)))
    try {
      const res = await fetch(`/api/meetings/${meetingId}/action-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: newDone }),
      })
      if (!res.ok) throw new Error(await res.text())
    } catch (e) {
      setItems(prev)
      toast.error(e instanceof Error ? e.message : 'Could not save')
    }
  }

  async function handleDelete(itemId: string) {
    const prev = items
    setItems((xs) => xs.filter((i) => i.id !== itemId))
    try {
      const res = await fetch(`/api/meetings/${meetingId}/action-items/${itemId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await res.text())
    } catch (e) {
      setItems(prev)
      toast.error(e instanceof Error ? e.message : 'Could not delete')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No action items yet — add one below.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <Checkbox
                id={`item-${item.id}`}
                checked={item.done}
                onCheckedChange={() => handleToggle(item)}
                className="mt-0.5"
              />
              <label
                htmlFor={`item-${item.id}`}
                className={`flex-1 text-sm cursor-pointer ${
                  item.done ? 'line-through text-muted-foreground' : 'text-foreground'
                }`}
              >
                {item.text}
                {item.due_date && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    due {item.due_date}
                  </span>
                )}
              </label>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete action item"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add new item */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Add action item…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={adding || !newText.trim()}
          onClick={handleAdd}
        >
          Add
        </Button>
      </div>
    </div>
  )
}
