import Link from 'next/link'

export default function MePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Me</h1>
      <p className="text-muted-foreground">Profile — coming in Phase 7.</p>

      <div className="border rounded-lg p-4 bg-card flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">Tags</p>
          <p className="text-sm text-muted-foreground">Create and manage your custom tags</p>
        </div>
        <Link href="/me/tags">
          <button className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted transition-colors">
            Manage Tags
          </button>
        </Link>
      </div>
    </div>
  )
}
