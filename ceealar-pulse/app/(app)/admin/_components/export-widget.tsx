'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function ExportWidget() {
  const [loading, setLoading] = useState(false)

  function handleDownload() {
    setLoading(true)
    window.location.href = '/api/export'
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      className="bg-[var(--color-teal)] text-white hover:bg-[var(--color-teal)]/90"
    >
      {loading ? 'Preparing…' : 'Download CSV'}
    </Button>
  )
}
