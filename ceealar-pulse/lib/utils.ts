import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Return the URL only if it parses as http(s). Blocks javascript:, data:,
 * vbscript:, etc. — used everywhere we render an attendee-supplied link.
 *
 * Attendee fields (linkedin, swapcard_url) come from the Swapcard XLSX and
 * are partially under attendee control. A `javascript:` href would execute
 * in our origin and could exfiltrate via /api/export.
 */
export function safeHttpUrl(u: string | null | undefined): string | null {
  if (!u) return null
  const trimmed = u.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString()
    }
  } catch {
    // Not a parseable URL
  }
  return null
}
