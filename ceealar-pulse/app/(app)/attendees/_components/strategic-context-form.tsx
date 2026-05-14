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
}

const FIELDS = [
  { key: 'why_they_matter', label: 'Why They Matter' },
  { key: 'how_to_engage', label: 'How to Engage' },
  { key: 'hypothesis', label: 'Hypothesis' },
  { key: 'risks', label: 'Risks' },
  { key: 'collaboration_hooks', label: 'Collaboration Hooks' },
] as const

type FieldKey = typeof FIELDS[number]['key']

export function StrategicContextForm({ attendeeId, initialValues }: StrategicContextFormProps) {
  const [values, setValues] = useState(initialValues)
  const [savedField, setSavedField] = useState<string | null>(null)

  const handleBlur = (key: FieldKey, value: string) => {
    setSavedField(key)
    setTimeout(() => setSavedField(null), 2000)
    const supabase = createClient()
    supabase.from('attendees').update({ [key]: value || null }).eq('id', attendeeId)
  }

  return (
    <div className="space-y-4">
      {FIELDS.map((field) => (
        <div key={field.key}>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor={field.key}
              className="text-sm font-medium text-foreground"
            >
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
        </div>
      ))}
    </div>
  )
}
