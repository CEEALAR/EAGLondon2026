---
status: partial
phase: 07-export-polish
source: [07-VERIFICATION.md]
started: 2026-05-15T00:00:00Z
updated: 2026-05-15T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. CSV download works in browser
expected: Visiting /admin/export and clicking "Download CSV" triggers a browser file download named "ceealar-pulse-export.csv"
result: [pending]

### 2. CSV has correct data
expected: Opening the CSV shows 27 columns (id through updated_at) and approximately 1,904 data rows
result: [pending]

### 3. iOS home screen icon shows
expected: Adding the app to iOS home screen (Share → Add to Home Screen) shows a teal icon labeled "Pulse", not a generic screenshot
result: [pending]

### 4. Browser notification permission prompt appears
expected: On first load of the app (or after clearing permissions), a browser notification permission prompt appears
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
