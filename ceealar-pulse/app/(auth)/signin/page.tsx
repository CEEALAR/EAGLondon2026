'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

function SignInContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const supabase = createClient()

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: 'ceealar.org' },
      },
    })
  }

  return (
    <>
      {error === 'unauthorized' && (
        <div className="w-full max-w-xs rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This tool is for the CEEALAR team only.
        </div>
      )}

      <Button
        onClick={handleSignIn}
        className="w-full max-w-xs"
        style={{ backgroundColor: '#0F766E' }}
      >
        Continue with Google
      </Button>
    </>
  )
}

export default function SignInPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4" style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className="flex flex-col items-center gap-2">
        <h1 className="font-display italic text-2xl" style={{ color: '#0F766E' }}>
          CEEALAR Pulse
        </h1>
        <p className="text-sm text-muted-foreground">Conference coordination</p>
      </div>

      <Suspense fallback={null}>
        <SignInContent />
      </Suspense>
    </main>
  )
}
