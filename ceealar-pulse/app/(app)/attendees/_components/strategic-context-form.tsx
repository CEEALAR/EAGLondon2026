'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/textarea'

interface StrategicContextFormProps {
  attendeeId: string
  initialValues: {
    why_they_matter: string | null
    how_to_engage: string | null
    hypothesis: string | null
    risks: string | null
    collaboration_hooks: string | null
  }
  spreadsheetSays?: {
    why_they_matter: string | null
    how_to_engage: string | null
    imported_at: string | null
  }
}

const FIELDS = [
  { key: 'why_they_matter', label: 'Why They Matter (Why Relevant)' },
  { key: 'how_to_engage', label: 'How to Engage (Talking Points)' },
  { key: 'hypothesis', label: 'Hypothesis' },
  { key: 'risks', label: 'Risks' },
  { key: 'collaboration_hooks', label: 'Collaboration Hooks' },
] as const

type FieldKey = typeof FIELDS[number]['key']

export function StrategicContextForm({ attendeeId, initialValues, spreadsheetSays }: StrategicContextFormProps) {
  const [values, setValues] = useState(initialValues)
  const [savedField, setSavedField] = useState<string | null>(null)

  const handleBlur = (key: FieldKey, value: string) => {
    setSavedField(key)
    setTimeout(() => setSavedField(null), 2000)
    const supabase = createClient()
    supabase.from('attendees').update({ [key]: value || null }).eq('id', attendeeId)
  }

  function spreadsheetDiff(key: FieldKey): string | null {
    if (!spreadsheetSays) return null
    let sheetValue: string | null = null
    if (key === 'why_they_matter') sheetValue = spreadsheetSays.why_they_matter
    else if (key === 'how_to_engage') sheetValue = spreadsheetSays.how_to_engage
    if (!sheetValue) return null
    const currentValue = (values[key] ?? '').trim()
    if (currentValue === sheetValue.trim()) return null
    return sheetValue
  }

  return (
    <div className="space-y-4">
      {FIELDS.map((field) => {
        const diff = spreadsheetDiff(field.key)
        return (
          <div key={field.key}>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={field.key} className="text-sm font-medium text-foreground">
                {field.label}
              </label>
              {savedField === field.key && (
                <span className="text-xs text-green-600">Saved</span>
              )}
            </div>
            <Textarea
              id={field.key}
              value={values[field.key] ?? ''}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              onBlur={() => handleBlur(field.key, values[field.key] ?? '')}
              rows={3}
              placeholder="Add notes..."
            />
            {diff && (
              <div className="mt-1.5 text-xs rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                <p className="font-medium text-amber-900">
                  Spreadsheet says{spreadsheetSays?.imported_at ? ` (${new Date(spreadsheetSays.imported_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})` : ''}:
                </p>
                <p className="text-amber-800 whitespace-pre-wrap mt-0.5">{diff}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
