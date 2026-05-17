import Link from 'next/link'

/**
 * Custom 404. Replaces the default Next.js page so 404s match the app's look
 * and don't leak framework branding.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[var(--color-cream)]">
      <h1 className="editorial-h1 text-3xl mb-2 text-foreground">Not found.</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist. It may have been deleted, or the link is wrong.
      </p>
      <div className="flex gap-3">
        <Link
          href="/attendees"
          className="px-4 py-2 rounded-md bg-[var(--color-teal)] text-white text-sm font-medium hover:bg-[var(--color-teal-deep)] transition-colors"
        >
          Attendees
        </Link>
        <Link
          href="/feed"
          className="px-4 py-2 rounded-md border border-border text-foreground text-sm font-medium hover:bg-muted/40 transition-colors"
        >
          Feed
        </Link>
      </div>
    </div>
  )
}
