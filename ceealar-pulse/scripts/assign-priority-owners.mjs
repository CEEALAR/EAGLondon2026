#!/usr/bin/env node
/**
 * One-off: for each Top-50 priority row owned by Attila or Jonas, create a
 * want_to_meet meeting in Pulse owned by the matching team_member.
 *
 * Usage (from ceealar-pulse/):
 *   node scripts/assign-priority-owners.mjs            # dry run, prints plan
 *   node scripts/assign-priority-owners.mjs --apply    # writes to DB
 *
 * Idempotency: skips creating a new meeting if an active (non-cancelled)
 * meeting already exists for that owner + attendee.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { config as dotenvConfig } from 'dotenv'

dotenvConfig({ path: resolve(process.cwd(), '.env.local') })

const SRC_XLSX = '/Users/attilaujvari/Library/CloudStorage/OneDrive-CEEALAR/CEEALAR Staff - Documents/5. Development & External Relations/CEEALAR_EAG_London_Top50.xlsx'
const APPLY = process.argv.includes('--apply')

const OWNER_MAP = {
  attila: { match: ['attila', 'attila ujvari'],     email: 'attila@ceealar.org' },
  jonas:  { match: ['jonas'],                        email: 'jonas@ceealar.org'  },
  david:  { match: ['david', 'david staley'],        email: 'david@ceealar.org'  },
}

function norm(s) {
  return String(s ?? '').trim().toLowerCase()
}

function whichOwner(value) {
  const n = norm(value)
  for (const [key, { match }] of Object.entries(OWNER_MAP)) {
    if (match.some((m) => n === m || n.includes(m))) return key
  }
  return null
}

async function main() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE env vars in .env.local')
  const admin = createClient(url, key, { auth: { persistSession: false } })

  // 1. Read XLSX
  const buf = readFileSync(SRC_XLSX)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })
  if (rows.length < 2) throw new Error('Sheet has no data rows')

  const header = rows[0].map((h) => norm(h))
  const idx = (name) => header.findIndex((h) => h === norm(name))
  const colRank      = idx('Rank')
  const colSwapcard  = idx('Swapcard')
  const colOwner     = idx('Owner')
  const colFirstName = idx('First Name')
  const colLastName  = idx('Last Name')

  if (colSwapcard < 0 || colOwner < 0) {
    console.error('Header row:', rows[0])
    throw new Error('Sheet missing required columns: Swapcard, Owner')
  }

  // 2. Filter rows for Attila or Jonas
  const targets = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const ownerKey = whichOwner(row[colOwner])
    if (!ownerKey) continue
    const swapcard = row[colSwapcard] ? String(row[colSwapcard]).trim() : null
    if (!swapcard) {
      console.warn(`Row ${i + 1} owner=${ownerKey} has no Swapcard URL, skipping`)
      continue
    }
    targets.push({
      rank: row[colRank] ?? '?',
      ownerKey,
      swapcard,
      name: [row[colFirstName], row[colLastName]].filter(Boolean).join(' ').trim() || '(unnamed)',
    })
  }

  const knownOwners = Object.keys(OWNER_MAP).join(' or ')
  console.log(`\nFound ${targets.length} rows owned by ${knownOwners}`)

  // 3. Look up team_member ids by email
  const emails = [...new Set(Object.values(OWNER_MAP).map((o) => o.email))]
  const { data: tmRows, error: tmErr } = await admin
    .from('team_members')
    .select('id, email, display_name')
    .in('email', emails)
  if (tmErr) throw tmErr
  const tmByEmail = new Map(tmRows.map((r) => [r.email.toLowerCase(), r]))
  const ownerToTm = {}
  for (const [key, { email }] of Object.entries(OWNER_MAP)) {
    const tm = tmByEmail.get(email.toLowerCase())
    if (!tm) {
      console.error(`No team_member found for ${email} — skipping ${key}`)
    }
    ownerToTm[key] = tm
  }

  // 4. Look up attendees by swapcard URL
  const swapcards = [...new Set(targets.map((t) => t.swapcard))]
  const { data: attRows, error: attErr } = await admin
    .from('attendees')
    .select('id, swapcard_url, first_name, last_name')
    .in('swapcard_url', swapcards)
  if (attErr) throw attErr
  const attByUrl = new Map(attRows.map((a) => [a.swapcard_url, a]))

  // 5. Check existing meetings (owner + attendee) to avoid duplicates
  const ownerIds = Object.values(ownerToTm).filter(Boolean).map((tm) => tm.id)
  const attendeeIds = attRows.map((a) => a.id)
  const { data: existingMeetings, error: emErr } = await admin
    .from('meetings')
    .select('owner_id, attendee_id, status')
    .in('owner_id', ownerIds)
    .in('attendee_id', attendeeIds)
    .neq('status', 'cancelled')
  if (emErr) throw emErr
  const existingKeys = new Set(
    (existingMeetings ?? []).map((m) => `${m.owner_id}|${m.attendee_id}`)
  )

  // 6. Build plan
  const plan = []
  const unmatched = []
  const duplicates = []
  for (const t of targets) {
    const tm = ownerToTm[t.ownerKey]
    const att = attByUrl.get(t.swapcard)
    if (!tm) continue
    if (!att) {
      unmatched.push(t)
      continue
    }
    const key = `${tm.id}|${att.id}`
    if (existingKeys.has(key)) {
      duplicates.push({ ...t, attendeeId: att.id })
      continue
    }
    plan.push({
      ownerEmail: tm.email,
      ownerName: tm.display_name ?? tm.email,
      ownerId: tm.id,
      attendeeId: att.id,
      attendeeName: [att.first_name, att.last_name].filter(Boolean).join(' '),
      rank: t.rank,
      swapcard: t.swapcard,
      rowName: t.name,
    })
  }

  // 7. Print plan
  console.log('\n=== PLAN ===')
  for (const p of plan) {
    console.log(`  Rank ${p.rank}: ${p.attendeeName.padEnd(35)} → ${p.ownerName}`)
  }
  if (duplicates.length > 0) {
    console.log(`\n${duplicates.length} skipped (active meeting already exists):`)
    for (const d of duplicates) {
      console.log(`  Rank ${d.rank}: ${d.name}`)
    }
  }
  if (unmatched.length > 0) {
    console.log(`\n${unmatched.length} unmatched (no attendee with that Swapcard URL):`)
    for (const u of unmatched) {
      console.log(`  Rank ${u.rank}: ${u.name} — ${u.swapcard}`)
    }
  }

  console.log(`\nSummary: ${plan.length} to create, ${duplicates.length} duplicates, ${unmatched.length} unmatched`)

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write.')
    return
  }

  if (plan.length === 0) {
    console.log('\nNothing to write.')
    return
  }

  // 8. Apply
  console.log('\nWriting…')
  const inserts = plan.map((p) => ({
    attendee_id: p.attendeeId,
    owner_id: p.ownerId,
    status: 'want_to_meet',
    scheduled_at: null,
  }))
  const { data: created, error: insErr } = await admin
    .from('meetings')
    .insert(inserts)
    .select('id, owner_id, attendee_id')
  if (insErr) throw insErr

  // 9. Activity rows + meeting_members for each new meeting
  const activityRows = created.map((m) => ({
    actor_id: m.owner_id,
    meeting_id: m.id,
    attendee_id: m.attendee_id,
    action: 'meeting_created',
    detail: { status: 'want_to_meet', source: 'priority_import_owner_assignment' },
  }))
  const memberRows = created.map((m) => ({
    meeting_id: m.id,
    user_id: m.owner_id,
    added_by: m.owner_id,
  }))
  await admin.from('activity').insert(activityRows)
  await admin.from('meeting_members').upsert(memberRows, { onConflict: 'meeting_id,user_id', ignoreDuplicates: true })

  console.log(`\nCreated ${created.length} want_to_meet meetings.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
