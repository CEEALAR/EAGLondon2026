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
        <div className="w-full max-w-xs rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm fade-up">
          This tool is for the CEEALAR team only.
        </div>
      )}

      <button
        onClick={handleSignIn}
        className="press w-full max-w-xs h-11 rounded-lg flex items-center justify-center gap-3 bg-white border border-border/80 text-foreground text-sm font-medium shadow-sm hover:shadow-md hover:border-[var(--color-teal)]/40 transition-all duration-200"
      >
        {/* Inline Google G */}
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.6-5.05-3.74H.97v2.34A9 9 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.95 10.68A5.4 5.4 0 0 1 3.66 9c0-.58.1-1.15.29-1.68V4.98H.97A9 9 0 0 0 0 9c0 1.45.35 2.83.97 4.02l2.98-2.34z" fill="#FBBC05"/>
          <path d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .97 4.98l2.98 2.34C4.66 5.18 6.65 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <p className="text-xs text-muted-foreground/80 text-center max-w-xs">
        Restricted to <span className="font-mono text-foreground/70">@ceealar.org</span> accounts
      </p>
    </>
  )
}

export default function SignInPage() {
  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center gap-8 px-4 relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      {/* Soft brand orbs in the background */}
      <div
        aria-hidden
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 blur-3xl"
        style={{ backgroundImage: 'radial-gradient(circle, var(--color-teal-soft), transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-25 blur-3xl"
        style={{ backgroundImage: 'radial-gradient(circle, var(--color-gold-soft), transparent 70%)' }}
      />

      <div className="relative flex flex-col items-center gap-2 fade-up">
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 font-semibold">
          CEEALAR · EAG London 2026
        </span>
        <h1
          className="font-display italic text-5xl tracking-tight"
          style={{ color: 'var(--color-teal)' }}
        >
          Pulse
        </h1>
        <p className="text-sm text-muted-foreground -mt-1">Conference coordination, in one tap</p>
      </div>

      <Suspense fallback={null}>
        <div className="relative w-full flex flex-col items-center gap-3 fade-up">
          <SignInContent />
        </div>
      </Suspense>
    </main>
  )
}
