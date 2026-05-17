#!/usr/bin/env node
/**
 * One-off: find (owner_id, attendee_id) pairs that have more than one
 * want_to_meet row in Pulse, keep the oldest, delete the rest.
 *
 * Why: before the "On your list" fix landed, the Want-to-meet button on the
 * attendee page didn't know whether a row already existed, so repeated clicks
 * created duplicates. iCal-sourced rows are NOT deduped — those are owned by
 * the sync engine.
 *
 * Usage (from ceealar-pulse/):
 *   node scripts/dedup-want-to-meets.mjs            # dry run
 *   node scripts/dedup-want-to-meets.mjs --apply    # delete duplicates
 *
 * Safety:
 *   - Only deletes rows with status='want_to_meet' (never planned/done).
 *   - Skips rows with non-null ical_uid (those came from the calendar sync,
 *     not from the button).
 *   - Always keeps the oldest row in each duplicate group — that row holds
 *     any notes/comments/follow-up date you typed early.
 */

import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { config as dotenvConfig } from 'dotenv'

dotenvConfig({ path: resolve(process.cwd(), '.env.local') })

const APPLY = process.argv.includes('--apply')

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE env vars in .env.local')
  const admin = createClient(url, key, { auth: { persistSession: false } })

  // 1. Fetch every manual want_to_meet row (ical_uid IS NULL)
  const { data: rows, error } = await admin
    .from('meetings')
    .select('id, owner_id, attendee_id, created_at, why_relevant, talking_points, meeting_notes, comments, follow_up_date, ical_uid, attendees(first_name, last_name), team_members!meetings_owner_id_fkey(display_name, email)')
    .eq('status', 'want_to_meet')
    .is('ical_uid', null)
    .order('created_at', { ascending: true })
  if (error) throw error

  // 2. Group by (owner_id, attendee_id)
  const groups = new Map()
  for (const r of rows ?? []) {
    if (!r.owner_id) continue
    const key = `${r.owner_id}|${r.attendee_id}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }

  // 3. Find duplicates
  const dupGroups = [...groups.values()].filter((g) => g.length > 1)

  if (dupGroups.length === 0) {
    console.log('No duplicates found — nothing to do.')
    return
  }

  let totalToDelete = 0
  const toDelete = []
  const warnings = []

  console.log('\n=== Duplicate groups ===')
  for (const g of dupGroups) {
    const [keep, ...dups] = g
    const ownerName = keep.team_members?.display_name ?? keep.team_members?.email ?? '?'
    const attName = [keep.attendees?.first_name, keep.attendees?.last_name].filter(Boolean).join(' ') || '?'
    console.log(`\n  ${ownerName} → ${attName}  (${g.length} rows)`)
    console.log(`    KEEP  ${keep.id}  created ${keep.created_at}`)
    for (const d of dups) {
      const hasContent = !!(d.why_relevant || d.talking_points || d.meeting_notes || d.comments || d.follow_up_date)
      if (hasContent) {
        warnings.push({ id: d.id, ownerName, attName, why: d.why_relevant ? 'why_relevant' : d.talking_points ? 'talking_points' : d.meeting_notes ? 'meeting_notes' : d.comments ? 'comments' : 'follow_up_date' })
        console.log(`    DEL ?  ${d.id}  created ${d.created_at}  *HAS CONTENT (${warnings.at(-1).why})*`)
      } else {
        console.log(`    DEL    ${d.id}  created ${d.created_at}`)
        toDelete.push(d.id)
        totalToDelete++
      }
    }
  }

  console.log(`\n${dupGroups.length} duplicate groups, ${totalToDelete} rows safe to delete`)
  if (warnings.length > 0) {
    console.log(`${warnings.length} rows have content (notes / talking points / follow-up) and were NOT marked for deletion:`)
    for (const w of warnings) {
      console.log(`  ${w.id}  ${w.ownerName} → ${w.attName}  (has ${w.why})`)
    }
    console.log('Review these manually before re-running.')
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to delete the safe rows.')
    return
  }

  if (toDelete.length === 0) {
    console.log('\nNothing safe to delete.')
    return
  }

  console.log('\nDeleting…')
  const { error: delErr } = await admin
    .from('meetings')
    .delete()
    .in('id', toDelete)
  if (delErr) throw delErr

  console.log(`\nDeleted ${toDelete.length} duplicate rows.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
