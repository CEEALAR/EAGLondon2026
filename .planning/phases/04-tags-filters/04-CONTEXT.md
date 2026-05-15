# Phase 4 Context: Tags + Filters

## Phase Goal

Tag chips on attendee detail, "Add tag" popover with color picker, multi-tag AND filter on /attendees,
tag management at /me/tags.

## Requirements

TAG-01 through TAG-04 (all covered by plans 04-01 and 04-02).

## Plans

| Plan | Wave | Description |
|------|------|-------------|
| 04-01 | 1 | DB migration, TypeScript types, 6 API routes |
| 04-02 | 2 | UI: tag chips, AddTagPopover, filter sheet, /me/tags |

## New Tables

### tags
- `id` uuid PK, `name` text UNIQUE, `color` text (hex default '#0F766E')
- `created_by` uuid → auth.users, `is_system` boolean, `created_at`
- RLS: all authenticated users SELECT; INSERT own; UPDATE/DELETE own non-system only

### attendee_tags (junction)
- PK (attendee_id, tag_id); `created_by`, `created_at`
- RLS: authenticated SELECT/INSERT/DELETE

### System tags seeded (is_system=true, created_by=null)
- partner (#0F766E), alumni (#7C3AED), funder (#B45309), prospect (#1D4ED8)

## New TypeScript Types (lib/types.ts)

```typescript
export type Tag = {
  id: string
  name: string
  color: string           // hex
  created_by: string | null
  is_system: boolean
  created_at: string
}

export type AttendeeTag = {
  attendee_id: string
  tag_id: string
  created_by: string | null
  created_at: string
}

// Attendee type extended:
// attendee_tags?: { tag_id: string }[]
```

## API Routes

| Route | Method | Auth | Business Rules |
|-------|--------|------|----------------|
| /api/tags | GET | required | Returns all tags ordered by name |
| /api/tags | POST | required | name + color; created_by = user.id; 409 on duplicate name |
| /api/tags/[id] | PATCH | required | Owner only; is_system blocks; 403 otherwise |
| /api/tags/[id] | DELETE | required | Owner only; is_system blocks; 409 if attendee_tags exist |
| /api/attendees/[id]/tags | POST | required | Assigns tag_id to attendee |
| /api/attendees/[id]/tags/[tagId] | DELETE | required | Removes assignment |

## Key UI Patterns

### AttendeeTagsSection
- Client component at `app/(app)/attendees/[id]/_components/attendee-tags-section.tsx`
- Props: `attendeeId: string`, `initialTags: Tag[]`
- Fetches allTags via GET /api/tags on mount (.then() — no async in useEffect)
- All mutations use fire-and-forget (void fetch(...).then(...)) pattern

### Tag chips
- Color dot (backgroundColor: tag.color) + name + X button
- X calls DELETE /api/attendees/[id]/tags/[tagId]

### AddTagPopover
- shadcn Popover; Input for search; filters allTags by name substring
- "Create '{query}'" option when no exact match — opens 8-swatch color picker
- 8 swatches: #0F766E #7C3AED #B45309 #1D4ED8 #B91C1C #047857 #9D174D #374151

### Multi-tag AND filter (/attendees)
- Server page: `select('*, attendee_tags(tag_id)')` on attendees; fetches allTags
- Client filter: `activeTagIds.every(id => attendee.attendee_tags.some(at => at.tag_id === id))`
- Filter state: selectedTagIds (working) + activeTagIds (applied on "Apply" click)
- allTags prop passed from server page to AttendeeList

### /me/tags page
- Client component; fetches on mount
- Shows own tags (created_by === user.id) + system tags
- Inline rename/recolor: editingId state drives edit vs view mode
- Delete disabled when assignmentCounts[tag.id] > 0
- System tags: no edit/delete UI

## Attendee Query Pattern (with tags join)
```typescript
supabase.from('attendees').select('*, attendee_tags(tag_id)')
// Returns attendee_tags: { tag_id: string }[] on each row
```

## Phase 5 Notes

Phase 5 (Schedule + Conflicts) can now use tags as additional context in conflict warnings.
The attendee_tags join pattern established here is safe to reuse in any server component that
needs tag data alongside attendee data.
