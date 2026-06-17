# Leads have an active/archived lifecycle for incremental consolidation

Once Merge ([ADR-0004](0004-merge-lists-chunked-qr.md)) let teammates hand Leads phone-to-phone, the small QR
chunks made it natural to **consolidate throughout the day** rather than in one end-of-day batch. That surfaced a
need: when a Vendor hands a batch off to a teammate, those Leads should leave the Vendor's working list (so they
aren't shown, exported, raffled, or re-shared again) — **without** ever allowing the handed-off Attendees to be
re-scanned, and with a way to get them back if a handoff needs redoing.

We split a Vendor's Leads into two buckets, persisted separately on the device:

- **Active Leads** — shown on Home; the **only** Leads that Export, Raffle, and a Merge handoff act on.
- **Archived Leads** — Leads deliberately handed off and set aside. Hidden from the active list, but **retained**.

The rules:

- **Dedup spans the union.** Every Scan and every Merge import de-duplicates by normalized email against
  **active ∪ archived** (existing wins, regardless of bucket). So an archived Attendee is still "already
  scanned" and can never be re-captured — the "one Lead per Attendee" invariant just widened from the active
  list to all Leads the Vendor holds ([ADR-0002 revision](0002-dedupe-leads-by-email.md)).
- **Archiving is a deliberate, reversible Vendor action — never automatic.** Chunked QR is one-way with **no
  delivery confirmation**, so auto-archiving on share could silently drop Leads a teammate never actually
  scanned. Instead, the Vendor explicitly archives the (whole) active list *after* confirming the handoff landed.
- **Restore** moves **all** archived Leads back to active in one action — non-destructive (it only moves Leads
  between buckets) and itself reversible by archiving again. This is how a Vendor re-shares to a *different*
  teammate, or recovers from a missed handoff.
- **No data-wipe in this round.** A true "erase everything and start over" (which would clear the dedup memory
  and allow re-scanning) stays out of scope, consistent with the spec's "no delete in v1" (§5) — Restore only
  ever *moves* data, never destroys it.

Why this, over the alternatives:

- **vs a separate "seen" email-set** (a parallel forever-list of scanned emails, kept even if a Lead is deleted):
  rejected because nothing in this design permanently *deletes* a Lead — archived Leads are retained and
  restorable — so the archived bucket already *is* the persistent memory. A separate set would be redundant state
  that could drift out of sync with the Leads.
- **vs no archiving** (just leave everything active): rejected because the whole point is to declutter the
  working list as you consolidate and to stop re-offering already-shared Leads in the next QR batch.
- **vs auto-archive on share:** rejected for the silent-data-loss risk above (no delivery confirmation).

Recorded because it is **hard to reverse** (it changes the core Lead data model and the dedup scope that
ADR-0002 established), **surprising** (a future reader will wonder why "the list" is two buckets and why dedup
checks a hidden one), and a **real trade-off** (we weighed a separate seen-set, no-archive, and auto-archive and
chose this for safety + simplicity). Provenance: spec_sheet.md §10.4 and the consolidation grilling session.
