'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const EVENT_START = new Date('2026-05-29T09:00:00+01:00').getTime()

function useCountdown(target: number) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (now == null) return null
  const diff = Math.max(0, target - now)
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return { days, hours, minutes, done: diff === 0 }
}

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const supabase = createClient()

  // 'idle' = ready to sign in, 'detected' = already authenticated (auto-redirect),
  // 'oauth' = OAuth flow in progress (browser will navigate away)
  const [authState, setAuthState] = useState<'idle' | 'detected' | 'oauth'>('idle')

  // On mount, check if the user is already authenticated. This handles the
  // post-OAuth round-trip where cookies haven't fully propagated yet — the
  // (app) layout bounces them back to /signin, but the session IS there.
  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      if (data?.user) {
        setAuthState('detected')
        // The auth/callback decides destination based on user_ical_urls.
        // Re-hit it so the right routing logic runs again on the server.
        router.replace('/auth/callback')
      }
    })

    // Also subscribe to onAuthStateChange in case the session arrives slightly
    // after mount (race between cookie propagation and client check)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'SIGNED_IN' && session?.user) {
        setAuthState('detected')
        router.replace('/auth/callback')
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [router, supabase])

  async function handleSignIn() {
    setAuthState('oauth')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: 'ceealar.org' },
      },
    })
  }

  if (authState === 'detected') {
    return (
      <div className="w-full max-w-sm rounded-xl bg-white/95 backdrop-blur border border-white/60 px-5 py-4 shadow-lg flex items-center gap-3 fade-up">
        <span
          aria-hidden
          className="w-5 h-5 rounded-full border-2 border-[var(--color-teal)]/30 border-t-[var(--color-teal)] animate-spin"
        />
        <div className="text-sm">
          <p className="font-semibold">Welcome back — signing you in…</p>
          <p className="text-xs text-muted-foreground mt-0.5">One moment.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {error === 'unauthorized' && (
        <div className="w-full max-w-sm rounded-lg border border-red-200 bg-red-50/90 backdrop-blur px-4 py-3 text-sm text-red-700 shadow-sm fade-up">
          This tool is for the CEEALAR team only.
        </div>
      )}

      <button
        onClick={handleSignIn}
        disabled={authState === 'oauth'}
        className="press group w-full max-w-sm h-12 rounded-xl flex items-center justify-center gap-3 bg-white/95 backdrop-blur border border-white/60 text-foreground text-sm font-medium shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-[var(--color-teal)]/15 hover:border-[var(--color-teal)]/40 transition-all duration-300 disabled:opacity-70 disabled:cursor-wait"
      >
        {authState === 'oauth' ? (
          <>
            <span
              aria-hidden
              className="w-4 h-4 rounded-full border-2 border-[var(--color-teal)]/30 border-t-[var(--color-teal)] animate-spin"
            />
            Redirecting to Google…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.6-5.05-3.74H.97v2.34A9 9 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.95 10.68A5.4 5.4 0 0 1 3.66 9c0-.58.1-1.15.29-1.68V4.98H.97A9 9 0 0 0 0 9c0 1.45.35 2.83.97 4.02l2.98-2.34z" fill="#FBBC05"/>
              <path d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .97 4.98l2.98 2.34C4.66 5.18 6.65 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
            <span className="ml-1 text-muted-foreground/60 group-hover:text-[var(--color-teal)] transition-colors">
              →
            </span>
          </>
        )}
      </button>
    </>
  )
}

function Countdown() {
  const c = useCountdown(EVENT_START)
  if (!c) return <div className="h-[44px]" /> // reserve space pre-hydration
  if (c.done) {
    return (
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-teal)]">
        EAG London 2026 · Live now
      </p>
    )
  }
  return (
    <div className="flex items-baseline gap-3 text-foreground/80">
      {[
        { v: c.days, l: 'days' },
        { v: c.hours, l: 'hrs' },
        { v: c.minutes, l: 'min' },
      ].map(({ v, l }) => (
        <div key={l} className="flex items-baseline gap-1">
          <span className="font-display text-3xl md:text-4xl tabular-nums text-[var(--color-teal)] leading-none">
            {String(v).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{l}</span>
        </div>
      ))}
    </div>
  )
}

export default function SignInPage() {
  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center gap-10 px-4 relative overflow-hidden isolate"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      {/* Hero image — slow zoom for cinematic feel */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/signin-hero.png)',
          animation: 'hero-drift 24s ease-in-out infinite alternate',
        }}
      />

      {/* Cream wash to keep content readable over the image */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(250,247,240,0.55) 0%, rgba(250,247,240,0.75) 60%, rgba(250,247,240,0.9) 100%)',
        }}
      />

      {/* Top + bottom edge fades for vignette */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-32 -z-10 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, var(--color-cream) 0%, transparent 100%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-32 -z-10 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to top, var(--color-cream) 0%, transparent 100%)',
        }}
      />

      {/* Decorative slow-pulse aura around the wordmark */}
      <div
        aria-hidden
        className="absolute top-[36%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full opacity-40 pointer-events-none -z-10"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(15,118,110,0.22), transparent 65%)',
          animation: 'pulse-aura 6s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes pulse-aura {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
          50%      { transform: translate(-50%, -50%) scale(1.08); opacity: 0.7; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.6); }
        }
        @keyframes hero-drift {
          0%   { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.05) translate(-1%, 1%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-reduced-motion-respect] { animation: none !important; }
        }
      `}</style>

      {/* Eyebrow */}
      <div className="relative flex flex-col items-center gap-3 fade-up" style={{ animationDelay: '40ms' }}>
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/80 font-semibold">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-teal)]"
            data-reduced-motion-respect
            style={{ animation: 'pulse-dot 1.6s ease-in-out infinite' }}
          />
          CEEALAR · EAG London 2026
        </span>

        {/* Wordmark */}
        <h1
          className="font-display italic text-7xl md:text-8xl tracking-tight leading-none text-[var(--color-teal)]"
          style={{
            textShadow: '0 4px 24px rgba(15,118,110,0.15)',
          }}
        >
          Pulse
        </h1>
        <p className="text-sm md:text-base text-muted-foreground -mt-1 max-w-md text-center">
          Conference coordination, in one tap. Find anyone, schedule anything, debrief instantly.
        </p>
      </div>

      {/* Countdown */}
      <div className="relative fade-up" style={{ animationDelay: '180ms' }}>
        <Countdown />
      </div>

      {/* Sign-in */}
      <div
        className="relative flex flex-col items-center gap-3 w-full fade-up"
        style={{ animationDelay: '320ms' }}
      >
        <Suspense fallback={null}>
          <SignInContent />
        </Suspense>
        <p className="text-xs text-muted-foreground/70 text-center">
          Restricted to{' '}
          <span className="font-mono text-foreground/70">@ceealar.org</span> accounts
        </p>
      </div>

      {/* Footer hint */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/40 fade-up"
        style={{ animationDelay: '500ms' }}
      >
        Blackpool · London · Worldwide
      </div>
    </main>
  )
}
