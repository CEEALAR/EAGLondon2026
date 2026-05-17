'use client'

/**
 * Root-level error boundary. Catches uncaught errors from app/(app)/layout.tsx
 * and below — e.g. RealtimeProvider, unread-feed query, CalendarAutoSync.
 * Prevents a single failure from leaving all four users on a white screen
 * with no recovery during the conference.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[var(--color-cream)]">
      <h1 className="editorial-h1 text-2xl mb-2 text-foreground">Something broke.</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        The error was logged. Tap below to try again, or refresh the page.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-md bg-[var(--color-teal)] text-white text-sm font-medium hover:bg-[var(--color-teal-deep)] transition-colors"
      >
        Try again
      </button>
      {error.digest && (
        <p className="mt-6 text-[10px] text-muted-foreground/60 font-mono">{error.digest}</p>
      )}
    </div>
  )
}
