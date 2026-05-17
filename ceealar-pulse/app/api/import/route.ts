import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Helper: sanitize a cell value to string | null
// Strips zero-width spaces and trims whitespace. Returns null for empty/null/undefined.
function sanitize(val: unknown): string | null {
  if (val === undefined || val === null || val === '') return null
  const str = String(val).trim().replace(/​/g, '')
  return str === '' ? null : str
}

// Helper: split a semicolon-delimited field into a string[] | null
function splitArray(val: unknown): string[] | null {
  const s = sanitize(val)
  if (s === null) return null
  const parts = s
    .split(';')
    .map((p) => sanitize(p))
    .filter((p): p is string => p !== null)
  return parts.length > 0 ? parts : null
}

// Helper: pass the raw Swapcard "Seeking work?" text through unchanged.
// Values look like: "I'm actively looking for a new role", "I'm not interested
// in a new role", "I'm happy where I am but feel free to pitch me new ideas",
// "I'm seeking collaborators for an existing project/research". Yes/No legacy
// values come through as-is too.
function seekingWork(val: unknown): string | null {
  return sanitize(val)
}

export async function POST(req: NextRequest) {
  // T-02-02: Auth check — must have a valid session before processing the file
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse multipart form data
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Read file buffer and parse with SheetJS
  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  // Target the 'Attendee Data' sheet; fall back to first sheet
  const sheet =
    workbook.Sheets['Attendee Data'] ??
    workbook.Sheets[workbook.SheetNames[0]]

  if (!sheet) {
    return NextResponse.json({ error: 'No sheets found in workbook' }, { status: 400 })
  }

  // Convert to 2D array starting at row index 4 (row 5 in 1-indexed = header row)
  // result[0] = header row, result[1+] = data rows
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: 4 })

  if (rows.length < 2) {
    return NextResponse.json({ inserted: 0, updated: 0, skipped: 0, errors: [] })
  }

  // Build dynamic header index map from row 0
  const headerRow = rows[0] as unknown[]
  const headerMap: Record<string, number> = {}
  headerRow.forEach((h, i) => {
    if (h !== null && h !== undefined) {
      headerMap[String(h)] = i
    }
  })

  const dataRows = rows.slice(1) as unknown[][]

  // Build upsert rows, counting skipped (blank swapcard_url)
  type AttendeeRow = {
    swapcard_url: string
    first_name: string | null
    last_name: string | null
    company: string | null
    job_title: string | null
    career_stage: string | null
    biography: string | null
    expertise: string[] | null
    interests: string[] | null
    how_others_can_help: string | null
    how_i_can_help: string | null
    country: string | null
    seeking_work: string | null
    recruitment: string | null
    linkedin: string | null
  }

  const upsertRows: AttendeeRow[] = []
  let skipped = 0
  const syntheticKeySeen = new Set<string>()

  for (const row of dataRows) {
    const swapcardUrl = sanitize(row[headerMap['Swapcard']])
    const firstName = sanitize(row[headerMap['First Name']])
    const lastName = sanitize(row[headerMap['Last Name']])

    let effectiveUrl: string
    if (swapcardUrl) {
      effectiveUrl = swapcardUrl
    } else if (firstName || lastName) {
      // Generate a deterministic synthetic key so re-imports update rather than duplicate
      const slug = [firstName, lastName]
        .filter(Boolean)
        .join('-')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      let candidate = `synthetic://${slug}`
      let suffix = 2
      while (syntheticKeySeen.has(candidate)) {
        candidate = `synthetic://${slug}-${suffix++}`
      }
      syntheticKeySeen.add(candidate)
      effectiveUrl = candidate
    } else {
      skipped++
      continue
    }

    upsertRows.push({
      swapcard_url: effectiveUrl,
      first_name: firstName,
      last_name: lastName,
      company: sanitize(row[headerMap['Company']]),
      job_title: sanitize(row[headerMap['Job Title']]),
      career_stage: sanitize(row[headerMap['Career Stage']]),
      biography: sanitize(row[headerMap['Biography']]),
      expertise: splitArray(row[headerMap['Areas of Expertise']]),
      interests: splitArray(row[headerMap['Areas of Interest']]),
      how_others_can_help: sanitize(row[headerMap['How Others Can Help Me']]),
      how_i_can_help: sanitize(row[headerMap['How I Can Help Others']]),
      country: sanitize(row[headerMap['Country']]),
      seeking_work: seekingWork(row[headerMap['Seeking work?']]),
      recruitment: sanitize(row[headerMap['Recruitment']]),
      linkedin: sanitize(row[headerMap['LinkedIn']]),
    })
  }

  if (upsertRows.length === 0) {
    return NextResponse.json({ inserted: 0, updated: 0, skipped, errors: [] })
  }

  // Service role client — bypasses RLS for bulk upsert (T-02-02)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch existing swapcard_urls (paginated — Supabase caps single response at 1000)
  type ExistingRow = { swapcard_url: string }
  let existingRows: ExistingRow[] = []
  try {
    const PAGE = 1000
    let from = 0
    for (;;) {
      const { data, error } = await adminClient
        .from('attendees')
        .select('swapcard_url')
        .range(from, from + PAGE - 1)
      if (error) throw error
      const batch = (data ?? []) as ExistingRow[]
      existingRows = existingRows.concat(batch)
      if (batch.length < PAGE) break
      from += PAGE
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: `Failed to fetch existing attendees: ${msg}` },
      { status: 500 }
    )
  }

  const existingUrls = new Set((existingRows ?? []).map((r: { swapcard_url: string }) => r.swapcard_url))

  const insertCount = upsertRows.filter((r) => !existingUrls.has(r.swapcard_url)).length
  const updateCount = upsertRows.filter((r) => existingUrls.has(r.swapcard_url)).length

  // Upsert in batches of 100
  const BATCH_SIZE = 100
  const errors: string[] = []

  for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
    const batch = upsertRows.slice(i, i + BATCH_SIZE)
    const { error: upsertError } = await adminClient
      .from('attendees')
      .upsert(batch, { onConflict: 'swapcard_url', ignoreDuplicates: false })

    if (upsertError) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upsertError.message}`)
    }
  }

  return NextResponse.json({
    inserted: insertCount,
    updated: updateCount,
    skipped,
    errors,
  })
}
