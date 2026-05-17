import Link from 'next/link'

export default function MeetingNotFound() {
  return (
    <div className="max-w-2xl mx-auto md:mx-0 px-4 py-12 space-y-3">
      <h1 className="text-xl font-semibold">Meeting not found</h1>
      <p className="text-sm text-muted-foreground">
        This meeting may have been deleted, or the link is wrong.
      </p>
      <Link
        href="/meetings"
        className="inline-block text-sm border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
      >
        Back to schedule
      </Link>
    </div>
  )
}
