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

export default function ImportPage() {
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

    const data: ImportResult = await res.json()
    setResult(data)
    setStatus('done')
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function reset() {
    setStatus('idle')
    setResult(null)
    setErrorMsg(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Import Attendees</h1>

      {status === 'idle' && (
        <>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleInputChange}
          />

          {/* Drag-and-drop zone */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-[#0F766E] transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="text-gray-500 text-sm">
              Drop Swapcard .xlsx here or click to browse
            </p>
          </div>

          <p className="mt-3 text-xs text-amber-700">
            data/swapcard.xlsx is gitignored — never commit the file.
          </p>
        </>
      )}

      {status === 'uploading' && (
        <Button disabled className="w-full">
          Importing...
        </Button>
      )}

      {status === 'done' && result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4 text-sm">
            <p className="font-medium mb-2">Import complete</p>
            <p>
              Inserted: <span className="font-semibold">{result.inserted}</span>
              {' | '}
              Updated: <span className="font-semibold">{result.updated}</span>
              {' | '}
              Skipped: <span className="font-semibold">{result.skipped}</span>
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-red-600 list-disc list-inside">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
          <Button onClick={reset} variant="outline" className="w-full">
            Import another file
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <p className="text-red-600 text-sm">{errorMsg}</p>
          <Button onClick={reset} variant="outline" className="w-full">
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}
