'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function ExportPage() {
  const [loading, setLoading] = useState(false)

  function handleDownload() {
    setLoading(true)
    window.location.href = '/api/export'
    // Reset loading state after a short delay (download triggers navigation)
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">Export Attendees</h1>
      <p className="text-gray-600 text-sm mb-6">
        Downloads a CSV with all attendees, strategic context, tags, and meeting summary.
      </p>

      {loading ? (
        <Button
          disabled
          className="bg-[var(--color-teal)] text-white hover:bg-[var(--color-teal)]/90"
        >
          Preparing download...
        </Button>
      ) : (
        <Button
          onClick={handleDownload}
          className="bg-[var(--color-teal)] text-white hover:bg-[var(--color-teal)]/90"
        >
          Download CSV
        </Button>
      )}
    </div>
  )
}
