'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function MeetingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
      <h1 className="text-xl font-semibold">Couldn&apos;t load schedule</h1>
      <pre className="text-xs bg-red-50 text-red-900 border border-red-200 rounded-md p-3 whitespace-pre-wrap break-words">
        {error.message}
        {error.digest && `\n\n(digest: ${error.digest})`}
      </pre>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline" size="sm">Try again</Button>
        <Link href="/" className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted transition-colors">
          Home
        </Link>
      </div>
    </div>
  )
}
