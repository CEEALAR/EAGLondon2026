'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type ImportResult = {
  inserted: number
  updated: number
  skipped: number
  errors: string[]
}

type Status = 'idle' | 'uploading' | 'done' | 'error'

export function ImportWidget() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleFile(file: File) {
    setStatus('uploading')
    setResult(null)
    setErrorMsg(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/import', { method: 'POST', body: fd })
    if (!res.ok) {
      setStatus('error')
      setErrorMsg(await res.text())
      return
    }
    setResult(await res.json())
    setStatus('done')
  }

  function reset() {
    setStatus('idle')
    setResult(null)
    setErrorMsg(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (status === 'uploading') {
    return <Button disabled className="w-full">Importing…</Button>
  }

  if (status === 'done' && result) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm">
          <p className="font-medium text-green-800 mb-1">Import complete</p>
          <p className="text-green-700">
            Inserted: <span className="font-semibold">{result.inserted}</span>
            {' · '}Updated: <span className="font-semibold">{result.updated}</span>
            {' · '}Skipped: <span className="font-semibold">{result.skipped}</span>
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 text-red-600 list-disc list-inside">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
        <Button onClick={reset} variant="outline" size="sm">Import another file</Button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="space-y-3">
        <p className="text-red-600 text-sm">{errorMsg}</p>
        <Button onClick={reset} variant="outline" size="sm">Try again</Button>
      </div>
    )
  }

  return (
    <>
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
        <p className="text-gray-500 text-sm">Drop Swapcard .xlsx here or click to browse</p>
      </div>
    </>
  )
}
