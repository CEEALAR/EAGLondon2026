import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function MePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member } = await (supabase as any)
    .from('team_members')
    .select('display_name, avatar_url, email, created_at')
    .eq('id', user.id)
    .single()

  const name = member?.display_name ?? user.email ?? 'Unknown'
  const email = member?.email ?? user.email ?? ''
  const avatarUrl = member?.avatar_url as string | null
  const initial = name[0]?.toUpperCase() ?? '?'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Me</h1>

      {/* Profile card */}
      <div className="border rounded-lg p-5 bg-card flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-14 h-14 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[var(--color-teal)]/10 flex items-center justify-center shrink-0">
            <span className="text-xl font-semibold text-[var(--color-teal)]">{initial}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-base truncate">{name}</p>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
        </div>
      </div>

      {/* Tags */}
      <div className="border rounded-lg p-4 bg-card flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">Tags</p>
          <p className="text-sm text-muted-foreground">Create and manage your custom tags</p>
        </div>
        <Link
          href="/me/tags"
          className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
        >
          Manage Tags
        </Link>
      </div>
    </div>
  )
}
