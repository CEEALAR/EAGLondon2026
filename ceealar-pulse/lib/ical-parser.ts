/**
 * Minimal iCal parser. Zero dependencies.
 * Handles the subset of iCal that Google Calendar / Swapcard produces:
 * VEVENT, SUMMARY, DTSTART, DTEND, UID, LOCATION, line continuations (RFC 5545),
 * escaped commas/semicolons, basic Z-suffix and TZID dates.
 *
 * Does NOT handle RRULE, recurring exceptions, alarms — Swapcard 1:1s are
 * always single-instance.
 */

export type ParsedEvent = {
  uid: string
  summary: string
  startAt: Date
  endAt: Date | null
  location: string | null
  candidateName: string | null  // null = not a "Meet *" event
}

const MEET_PREFIX_RE = /^meet\s+/i

/** Unfold RFC 5545 line continuations: lines beginning with space/tab continue the previous line. */
function unfoldLines(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const out: string[] = []
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1)
    } else {
      out.push(line)
    }
  }
  return out
}

/** Unescape iCal text values: \\ \, \; \n \N */
function unescapeText(s: string): string {
  return s
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

/** Parse an iCal DATE-TIME value into a Date. Handles 20260529T140000Z and 20260529T140000 (local). */
function parseDateTime(value: string): Date | null {
  // Trim TZID params if present (value sometimes includes them as part of the property header)
  const v = value.trim()
  // YYYYMMDD'T'HHMMSS optionally followed by Z
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/)
  if (m) {
    const [, y, mo, d, h, mi, s, z] = m
    if (z === 'Z') {
      return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
    }
    // Treat naive datetimes as UTC (Swapcard's feed uses Z; this is a fallback)
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
  }
  // Date-only YYYYMMDD
  const md = v.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (md) {
    const [, y, mo, d] = md
    return new Date(Date.UTC(+y, +mo - 1, +d))
  }
  return null
}

/**
 * Split a "PROPERTY[;PARAM=val]:VALUE" line into name (lowercased), params, value.
 */
function splitProperty(line: string): { name: string; value: string } | null {
  const colon = line.indexOf(':')
  if (colon < 0) return null
  const left = line.slice(0, colon)
  const value = line.slice(colon + 1)
  const semicolon = left.indexOf(';')
  const name = (semicolon < 0 ? left : left.slice(0, semicolon)).trim().toLowerCase()
  return { name, value }
}

export function parseICal(text: string): ParsedEvent[] {
  const lines = unfoldLines(text)
  const events: ParsedEvent[] = []
  let current: Partial<ParsedEvent> & { _start?: string; _end?: string } | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
      continue
    }
    if (line === 'END:VEVENT') {
      if (current) {
        const startAt = current._start ? parseDateTime(current._start) : null
        const endAt = current._end ? parseDateTime(current._end) : null
        if (current.uid && current.summary && startAt) {
          const summary = current.summary
          const candidateName = MEET_PREFIX_RE.test(summary)
            ? summary.replace(MEET_PREFIX_RE, '').trim() || null
            : null
          events.push({
            uid: current.uid,
            summary,
            startAt,
            endAt: endAt ?? null,
            location: current.location ?? null,
            candidateName,
          })
        }
      }
      current = null
      continue
    }
    if (!current) continue

    const prop = splitProperty(line)
    if (!prop) continue
    switch (prop.name) {
      case 'uid':
        current.uid = prop.value.trim()
        break
      case 'summary':
        current.summary = unescapeText(prop.value)
        break
      case 'dtstart':
        current._start = prop.value
        break
      case 'dtend':
        current._end = prop.value
        break
      case 'location':
        current.location = unescapeText(prop.value)
        break
    }
  }

  return events
}
