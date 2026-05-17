'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type Result = {
  matched: number
  unmatched: number
  edits_preserved: number
  unmatched_rows: string[]
  errors: string[]
}

export function PriorityImportWidget() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setResult(null)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/import/priority', { method: 'POST', body: fd })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? `Import failed (HTTP ${res.status})`)
        return
      }
      setResult(data)
      toast.success(`Priority list imported — ${data.matched} attendees updated`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (uploading) {
    return <Button disabled className="w-full">Importing priority list…</Button>
  }

  if (result) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm space-y-1">
          <p className="font-medium text-green-800">Priority list imported</p>
          <p className="text-green-700">
            Updated: <span className="font-semibold">{result.matched}</span>
            {' · '}Unmatched: <span className="font-semibold">{result.unmatched}</span>
            {' · '}Your edits preserved: <span className="font-semibold">{result.edits_preserved}</span>
          </p>
          {result.unmatched_rows.length > 0 && (
            <details className="mt-2 text-xs text-amber-900">
              <summary className="cursor-pointer">{result.unmatched_rows.length} attendees not found in DB</summary>
              <ul className="mt-1 list-disc list-inside space-y-0.5 break-all">
                {result.unmatched_rows.map((url, i) => (
                  <li key={i}>{url}</li>
                ))}
              </ul>
            </details>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-2 text-red-600 list-disc list-inside text-xs">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
        <Button onClick={reset} variant="outline" size="sm">Import another</Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          ⚠ {error}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#0F766E] transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => fileInputRef.current?.click()}
      >
        <p className="text-gray-500 text-sm">Drop the CEEALAR Top-50 .xlsx here or click to browse</p>
      </div>
    </div>
  )
}
