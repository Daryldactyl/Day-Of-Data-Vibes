# Slice 1 — Lead collection core + persistent Leads on Home

**Type:** AFK
**PRD:** `docs/prd/scan-and-collect-leads.md`

## What to build

The data spine of the Scan feature, end-to-end through logic → storage → UI, with no camera yet.

A pure `addLead(leads, contact, scannedAt) → { leads, status }` that appends a new Lead when the contact's email is unseen and reports `status: 'saved'`, or returns the list unchanged with `status: 'duplicate'` when the email is already present. Identity is the normalized (lowercased, trimmed) email, per ADR-0002. A thin `localStorage` seam (`loadLeads` / `saveLeads`) that only serializes/deserializes. Home renders the Leads count + list, rehydrated from storage on load.

`Lead = { name, email, scannedAt }`, `scannedAt` an ISO timestamp passed *into* `addLead` (no internal clock, so the logic stays pure).

## Acceptance criteria

- [ ] `addLead` appends a brand-new contact and reports `status: 'saved'`
- [ ] `addLead` ignores a contact whose email already exists and reports `status: 'duplicate'`, list unchanged
- [ ] Email matching is case-insensitive and ignores surrounding whitespace
- [ ] Existing Leads keep their order and contents; new Lead carries the passed-in `scannedAt`
- [ ] Leads persist to `localStorage` and the list + count survive a page reload
- [ ] Unit tests cover the above, in the style of `src/lib/vcard.test.ts`

## Blocked by

None — can start immediately.
