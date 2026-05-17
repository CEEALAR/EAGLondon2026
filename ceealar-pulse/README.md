# CEEALAR Pulse

Conference coordination tool for CEEALAR team members at EAG London 2026.

**Live app:** https://eag-london2026.vercel.app/

---

## What it does

Pulse lets the four CEEALAR team members find, tag, schedule, and debrief any of the 1,904 EAG London attendees from their phones — no spreadsheet required.

- **Browse 1,904 attendees** with fast search and multi-tag filters
- **Schedule meetings** with time, location, and prep notes
- **Three-day team timeline** (29–31 May) with soft conflict warnings
- **Structured debrief** — notes, action items, follow-up dates
- **Real-time sync** — all four devices stay live without refresh
- **Activity feed** — see what the rest of the team is doing
- **CSV export** — full attendee + meeting data after the conference

---

## Sign in

Sign in at https://eag-london2026.vercel.app/ with your **@ceealar.org** Google account.

Non-@ceealar.org accounts are rejected at the door.

---

## Conference dates

| Day | Date |
|-----|------|
| Day 1 | Thursday 29 May 2026 |
| Day 2 | Friday 30 May 2026 |
| Day 3 | Saturday 31 May 2026 |

---

## Environment variables

These are set in Vercel. You need them if running locally:

```
NEXT_PUBLIC_SUPABASE_URL=https://cjjlctmdfbvutjtoxagm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase project anon key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service role key — server-side only, never expose>
```

Google OAuth is configured in the Supabase Auth dashboard (not env vars).

---

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. You'll need the env vars above in a `.env.local` file.

---

## Admin tasks

### Import attendees

1. Go to `/admin/import`
2. Drag and drop the Swapcard `.xlsx` export
3. Re-importing is safe — rows are upserted by `swapcard_url`

### Export data

1. Go to `/admin/export`
2. Click **Download CSV**
3. Gets all attendees + strategic context + tags + meeting counts (~1,904 rows, 27 columns)

---

## If it breaks

**App won't load / blank screen**
- Check https://vercel.com for deployment status
- Check the browser console for errors

**Sign-in redirect loops**
- Clear cookies for the domain
- Check Supabase Auth settings — Google OAuth may need the redirect URL updated

**"Email domain not permitted" on a @ceealar.org account**
- The domain check is in `app/auth/callback/route.ts` — should only block non-@ceealar.org accounts

**Attendees not showing**
- Check the Supabase `attendees` table has rows
- Re-import from `/admin/import` if empty

**Real-time not working**
- Supabase Realtime is enabled on the `meetings`, `action_items`, and `activity` tables
- Check the Supabase dashboard → Realtime → Enabled tables

**Notifications not arriving**
- Browser notifications require user gesture to enable (shown as banner on first visit)
- iOS Safari does not support Web Push — use Chrome or Firefox on Android
- Check `/me` page for notification permission status

---

## Tech stack

- **Framework:** Next.js 15 App Router, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Backend:** Supabase (Postgres + Auth + Realtime)
- **Deployment:** Vercel
- **Fonts:** DM Sans (body), Playfair Display italic (accent)
