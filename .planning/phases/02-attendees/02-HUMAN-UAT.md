---
status: partial
phase: 02-attendees
source: [02-VERIFICATION.md]
started: 2026-05-15T00:00:00Z
updated: 2026-05-15T00:00:00Z
---

## Current Test

[awaiting human testing — requires live Supabase session + imported attendee data]

## Tests

### 1. XLSX import end-to-end
expected: Drag real Swapcard .xlsx onto /admin/import — page shows Inserted/Updated/Skipped counts after upload completes
result: [pending]

### 2. Virtualized list performance
expected: 1,904 rows load without lag on a 375px mobile device; DevTools shows only ~10–15 rows in DOM at a time
result: [pending]

### 3. Search with real data
expected: Typing a name in the search bar narrows the list within 200ms (debounced); clearing search restores full list
result: [pending]

### 4. Autosave persists
expected: Editing a strategic context textarea and tabbing away (blur) saves the value to Supabase; value still present after page reload
result: [pending]

### 5. "Saved" indicator timing
expected: Green "Saved" text appears next to the field label immediately after blur, then fades after ~2 seconds
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
