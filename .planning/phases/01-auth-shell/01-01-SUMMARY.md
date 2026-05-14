---
plan: 01-01
phase: 01-auth-shell
status: complete
completed: 2026-05-14
subsystem: auth
tags: [supabase, auth, oauth, middleware, rls]
dependency_graph:
  requires: []
  provides: [auth-clients, session-middleware, oauth-callback, signin-page, team-members-schema]
  affects: [all-subsequent-plans]
tech_stack:
  added: ["@supabase/ssr createBrowserClient", "@supabase/ssr createServerClient", "Next.js middleware", "Supabase RLS"]
  patterns: ["PKCE OAuth flow", "service role inline client for upsert", "Next.js 15 async cookies()", "Suspense boundary for useSearchParams"]
key_files:
  created:
    - ceealar-pulse/lib/supabase/client.ts
    - ceealar-pulse/lib/supabase/server.ts
    - ceealar-pulse/middleware.ts
    - ceealar-pulse/app/auth/callback/route.ts
    - ceealar-pulse/app/(auth)/signin/page.tsx
    - ceealar-pulse/supabase/migrations/0001_team_members.sql
    - ceealar-pulse/.env.local (gitignored, not committed)
  modified:
    - ceealar-pulse/app/page.tsx
decisions:
  - "Service role client created inline in callback route with empty cookie store — RLS has no insert policy so anon client would fail the team_members upsert"
  - "Next.js 15: cookies() is async — await used throughout server.ts"
  - "PKCE flow accepted as CSRF protection (Supabase default, no additional CSRF token needed)"
  - "SUPABASE_SERVICE_ROLE_KEY absent from client.ts (browser-safe boundary enforced by design)"
  - "useSearchParams wrapped in Suspense boundary — required by Next.js 15 static generation"
metrics:
  duration: "~12 minutes"
  completed: "2026-05-14"
  tasks_completed: 3
  files_created: 7
  files_modified: 1
---

# Phase 01 Plan 01: Supabase Auth — Clients, Middleware, Callback, Sign-in Page Summary

One-liner: JWT session auth via Google OAuth with @ceealar.org domain enforcement, PKCE flow, service-role team_members upsert, and RLS-protected schema.

## What Was Done

- Created browser Supabase client (`lib/supabase/client.ts`) using `createBrowserClient` from `@supabase/ssr`
- Created server Supabase client (`lib/supabase/server.ts`) using `createServerClient` with Next.js 15 async `cookies()`
- Created session-refresh middleware (`middleware.ts`) protecting all routes except `/signin` and `/auth/*`
- Created OAuth callback route (`app/auth/callback/route.ts`) with `@ceealar.org` domain check, `signOut` for unauthorized accounts, `team_members` upsert via inline service role client
- Created sign-in page (`app/(auth)/signin/page.tsx`) with "Continue with Google" button, `hd=ceealar.org` OAuth param, error message for unauthorized accounts
- Replaced root `app/page.tsx` to redirect based on auth state: `/attendees` if authenticated, `/signin` if not
- Created migration SQL (`supabase/migrations/0001_team_members.sql`) with RLS-enabled `team_members` table and both select + update policies

## Requirements Satisfied

- AUTH-01: "Continue with Google" button on `/signin` ✓
- AUTH-02: `hd=ceealar.org` OAuth param + application-layer email check in callback ✓
- AUTH-03: Non-`@ceealar.org` accounts → `signOut` + redirect to `/signin?error=unauthorized` + "This tool is for the CEEALAR team only." message ✓
- AUTH-04: `team_members` upsert on successful `@ceealar.org` sign-in ✓

## Key Decisions

- **Service role client inline in callback:** RLS has no `INSERT` policy on `team_members`. The anon client would fail the upsert. Service role client created inline with empty cookie store — no session needed for service role operations.
- **Next.js 15 async cookies():** `await cookies()` required throughout `server.ts` and anywhere cookies are accessed server-side.
- **PKCE flow for CSRF protection:** Supabase uses PKCE by default — the code verifier is tied to the originating session. No additional CSRF token needed (T-01-04 accepted).
- **Suspense boundary for useSearchParams:** Next.js 15 static generation requires `useSearchParams()` to be wrapped in `<Suspense>`. Refactored sign-in page to hoist `useSearchParams` into a child `SignInContent` component wrapped in `<Suspense fallback={null}>`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Suspense boundary for useSearchParams in sign-in page**
- **Found during:** Task 3 build verification (`npm run build`)
- **Issue:** Next.js 15 static generation throws `useSearchParams() should be wrapped in a suspense boundary at page "/signin"` during prerendering
- **Fix:** Extracted `SignInContent` sub-component that uses `useSearchParams`; wrapped it in `<Suspense fallback={null}>` inside the exported `SignInPage` component
- **Files modified:** `ceealar-pulse/app/(auth)/signin/page.tsx`
- **Commit:** `0b53d4e`

## Artifacts

- `ceealar-pulse/.env.local` — Supabase env vars (gitignored, never committed)
- `ceealar-pulse/lib/supabase/client.ts` — browser-safe client, no server-only imports
- `ceealar-pulse/lib/supabase/server.ts` — server client with async cookies adapter
- `ceealar-pulse/middleware.ts` — session refresh on every request, route protection
- `ceealar-pulse/app/auth/callback/route.ts` — OAuth exchange, domain enforcement, team_members upsert
- `ceealar-pulse/app/(auth)/signin/page.tsx` — Google OAuth sign-in with error handling
- `ceealar-pulse/app/page.tsx` — root redirect based on auth state
- `ceealar-pulse/supabase/migrations/0001_team_members.sql` — DDL + RLS + 2 policies

## Commits

- `8a401a4` — feat(01-01): Supabase clients and session-refresh middleware
- `273a94a` — feat(01-01): auth callback route with domain check and team_members migration
- `0b53d4e` — feat(01-01): sign-in page and root redirect

## Self-Check: PASSED

All created files verified to exist. All commits verified in git log. Build exits 0. Grep checks all pass.
