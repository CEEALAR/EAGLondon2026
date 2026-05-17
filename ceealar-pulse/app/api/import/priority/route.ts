import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js'

// Map spreadsheet Category values → tag name to use (case-insensitive).
// 'Funder' merges with existing 'funder', 'Talent Partner' merges with 'partner'.
const CATEGORY_TO_TAG: Record<string, string> = {
  funder: 'funder',
  'peer org': 'peer org',
  'talent partner': 'partner',
  'strategic other': 'strategic',
}

// Default colors for newly-created tags
const TAG_COLOR: Record<string, string> = {
  funder: '#16A34A',     // green
  'peer org': '#7C3AED', // violet
  partner: '#D4A017',    // gold
  strategic: '#DB2777',  // pink
}

const HEADER_ROW_INDEX = 0  // top row is the header

function sanitize(val: unknown): string | null {
  if (val === undefined || val === null || val === '') return null
  const s = String(val).trim().replace(/​/g, '')
  return s === '' ? null : s
}

async function getOrCreateTag(admin: SupabaseClient, name: string): Promise<string | null> {
  // Try case-insensitive match first
  const { data: existing } = await admin
    .from('tags')
    .select('id')
    .ilike('name', name)
    .limit(1)
    .maybeSingle()
  if (existing) return (existing as { id: string }).id

  // Create new tag
  const color = TAG_COLOR[name.toLowerCase()] ?? '#0F766E'
  const { data: created, error } = await admin
    .from('tags')
    .insert({ name, color, is_system: true })
    .select('id')
    .single()
  if (error) {
    // Race condition fallback: try lookup again
    const { data: retry } = await admin
      .from('tags')
      .select('id')
      .ilike('name', name)
      .limit(1)
      .maybeSingle()
    return retry ? (retry as { id: string }).id : null
  }
  return (created as { id: string }).id
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try { formData = await req.formData() }
  catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }) }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return NextResponse.json({ error: 'No sheet found' }, { status: 400 })

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
  if (rows.length < 2) return NextResponse.json({ error: 'Sheet has no data rows' }, { status: 400 })

  // Header lookup
  const header = rows[HEADER_ROW_INDEX] as unknown[]
  const idx = (name: string): number => header.findIndex((h) => String(h ?? '').trim().toLowerCase() === name.toLowerCase())
  const colRank = idx('Rank')
  const colCategory = idx('Category')
  const colWhyRelevant = idx('Why Relevant')
  const colTalkingPoints = idx('Talking Points')
  const colSwapcard = idx('Swapcard')

  if (colRank < 0 || colSwapcard < 0) {
    return NextResponse.json({
      error: 'Sheet missing required columns. Need at least: Rank, Swapcard',
    }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Resolve tag IDs upfront
  const tagIds: Record<string, string | null> = {}
  for (const tagName of Object.values(CATEGORY_TO_TAG)) {
    if (!(tagName in tagIds)) tagIds[tagName] = await getOrCreateTag(admin, tagName)
  }

  const now = new Date().toISOString()
  let matched = 0
  let unmatched = 0
  let edited = 0  // user-edited fields preserved
  const errors: string[] = []
  const unmatchedRows: string[] = []

  for (let i = HEADER_ROW_INDEX + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const swapcardUrl = sanitize(row[colSwapcard])
    if (!swapcardUrl) continue  // skip blank rows silently

    const rankRaw = row[colRank]
    const priority = typeof rankRaw === 'number' && rankRaw >= 1 && rankRaw <= 5 ? rankRaw : null
    const category = colCategory >= 0 ? sanitize(row[colCategory]) : null
    const whyRelevant = colWhyRelevant >= 0 ? sanitize(row[colWhyRelevant]) : null
    const talkingPoints = colTalkingPoints >= 0 ? sanitize(row[colTalkingPoints]) : null

    // Find attendee by swapcard_url
    const { data: attendee } = await admin
      .from('attendees')
      .select('id, why_they_matter, how_to_engage, priority_imported_why_relevant, priority_imported_talking_points')
      .eq('swapcard_url', swapcardUrl)
      .maybeSingle()

    if (!attendee) {
      unmatched++
      unmatchedRows.push(swapcardUrl)
      continue
    }

    const a = attendee as {
      id: string
      why_they_matter: string | null
      how_to_engage: string | null
      priority_imported_why_relevant: string | null
      priority_imported_talking_points: string | null
    }

    // Conflict logic: only overwrite the canonical field if the user hasn't
    // touched it (current value equals the previously-imported value, OR is null).
    const updates: Record<string, unknown> = {
      priority,
      priority_category: category,
      priority_imported_at: now,
      priority_imported_why_relevant: whyRelevant,
      priority_imported_talking_points: talkingPoints,
    }

    const whyRelevantClean = a.why_they_matter ?? null
    const previousImportedWhy = a.priority_imported_why_relevant ?? null
    const userEditedWhy = whyRelevantClean !== null && whyRelevantClean !== previousImportedWhy
    if (!userEditedWhy) {
      updates.why_they_matter = whyRelevant
    } else {
      edited++
    }

    const talkingClean = a.how_to_engage ?? null
    const previousImportedTalking = a.priority_imported_talking_points ?? null
    const userEditedTalking = talkingClean !== null && talkingClean !== previousImportedTalking
    if (!userEditedTalking) {
      updates.how_to_engage = talkingPoints
    } else {
      edited++
    }

    const { error: updateErr } = await admin
      .from('attendees')
      .update(updates)
      .eq('id', a.id)

    if (updateErr) {
      errors.push(`${swapcardUrl}: ${updateErr.message}`)
      continue
    }

    // Assign category tag if recognized
    if (category) {
      const targetTagName = CATEGORY_TO_TAG[category.toLowerCase()]
      if (targetTagName) {
        const tagId = tagIds[targetTagName]
        if (tagId) {
          await admin
            .from('attendee_tags')
            .upsert({ attendee_id: a.id, tag_id: tagId }, { onConflict: 'attendee_id,tag_id', ignoreDuplicates: true })
        }
      }
    }

    matched++
  }

  return NextResponse.json({
    matched,
    unmatched,
    edits_preserved: edited,  // count of fields where user edits survived
    unmatched_rows: unmatchedRows,
    errors,
  })
}
