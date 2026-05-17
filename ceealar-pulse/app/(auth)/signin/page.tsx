'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const EVENT_START = new Date('2026-05-29T09:00:00+01:00').getTime()
const EVENT_END   = new Date('2026-05-31T18:00:00+01:00').getTime()

type CountdownState =
  | { phase: 'pre'; days: number; hours: number; minutes: number }
  | { phase: 'live' }
  | { phase: 'post' }

function useCountdown(start: number, end: number): CountdownState | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    // Minute precision is plenty — saves 60× the renders compared to 1s.
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  if (now == null) return null
  if (now >= end)  return { phase: 'post' }
  if (now >= start) return { phase: 'live' }
  const diff = start - now
  return {
    phase: 'pre',
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  }
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
  const c = useCountdown(EVENT_START, EVENT_END)
  if (!c) return <div className="h-[44px]" /> // reserve space pre-hydration
  if (c.phase === 'live') {
    return (
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-teal)]">
        EAG London 2026 · Live now
      </p>
    )
  }
  if (c.phase === 'post') {
    return (
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        EAG London 2026 · Sign in to wrap up notes
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
      {/* Hero image — more pronounced cinematic motion */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-center will-change-transform"
        style={{
          backgroundImage: 'url(/signin-hero.png)',
          animation: 'hero-drift 14s ease-in-out infinite alternate',
        }}
      />

      {/* Cream wash with a gentle breathing pulse so the entire scene feels alive */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(250,247,240,0.55) 0%, rgba(250,247,240,0.75) 60%, rgba(250,247,240,0.9) 100%)',
          animation: 'wash-breathe 9s ease-in-out infinite',
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

      {/* Two-layer aura — teal pulse + counter-rotating gold accent */}
      <div
        aria-hidden
        className="absolute top-[36%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full pointer-events-none -z-10 will-change-transform"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(15,118,110,0.30), transparent 65%)',
          animation: 'pulse-aura 4s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        className="absolute top-[36%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full pointer-events-none -z-10 will-change-transform mix-blend-multiply"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(212,160,23,0.22), transparent 65%)',
          animation: 'pulse-gold 5s ease-in-out infinite reverse',
        }}
      />

      {/* Drifting confetti dots — three sizes, three speeds */}
      <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <span className="absolute w-2 h-2 rounded-full bg-[var(--color-teal)]/40 blur-[1px]" style={{ left: '12%', top: '20%', animation: 'float-a 11s ease-in-out infinite' }} />
        <span className="absolute w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]/60 blur-[0.5px]" style={{ left: '82%', top: '28%', animation: 'float-b 13s ease-in-out infinite' }} />
        <span className="absolute w-1 h-1 rounded-full bg-[var(--color-teal)]/50" style={{ left: '18%', top: '70%', animation: 'float-c 9s ease-in-out infinite' }} />
        <span className="absolute w-2 h-2 rounded-full bg-[var(--color-gold)]/35 blur-[1px]" style={{ left: '76%', top: '78%', animation: 'float-a 12s ease-in-out infinite 1s' }} />
        <span className="absolute w-1 h-1 rounded-full bg-[var(--color-teal)]/60" style={{ left: '50%', top: '14%', animation: 'float-b 10s ease-in-out infinite 0.6s' }} />
        <span className="absolute w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]/50" style={{ left: '8%', top: '50%', animation: 'float-c 14s ease-in-out infinite 2s' }} />
        <span className="absolute w-1 h-1 rounded-full bg-[var(--color-teal)]/45" style={{ left: '90%', top: '60%', animation: 'float-a 10s ease-in-out infinite 1.4s' }} />
      </div>

      <style>{`
        @keyframes pulse-aura {
          0%, 100% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.3; }
          50%      { transform: translate(-50%, -50%) scale(1.18); opacity: 0.85; }
        }
        @keyframes pulse-gold {
          0%, 100% { transform: translate(-50%, -50%) scale(1.1) rotate(0deg); opacity: 0.4; }
          50%      { transform: translate(-50%, -50%) scale(0.85) rotate(15deg); opacity: 0.85; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.9); }
        }
        @keyframes hero-drift {
          0%   { transform: scale(1)    translate(0, 0); }
          100% { transform: scale(1.12) translate(-3%, 2%); }
        }
        @keyframes wash-breathe {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.85; }
        }
        @keyframes float-a {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(40px, -28px); }
        }
        @keyframes float-b {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-32px, 36px); }
        }
        @keyframes float-c {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(24px, -40px); }
        }
        @keyframes wordmark-glow {
          0%, 100% { text-shadow: 0 4px 24px rgba(15,118,110,0.18); }
          50%      { text-shadow: 0 8px 36px rgba(15,118,110,0.42), 0 0 60px rgba(212,160,23,0.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-reduced-motion-respect],
          [aria-hidden] { animation: none !important; }
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

        {/* Wordmark — breathing glow synced with the aura */}
        <h1
          data-reduced-motion-respect
          className="font-display italic text-7xl md:text-8xl tracking-tight leading-none text-[var(--color-teal)]"
          style={{
            animation: 'wordmark-glow 4s ease-in-out infinite',
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
