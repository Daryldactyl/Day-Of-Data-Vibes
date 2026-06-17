# Q&A Session — Consolidation Grilling (active/archived Leads)

**Skill:** `/grill-with-docs`
**Scope:** The "consolidate throughout the day" evolution of Merge (`spec_sheet.md` §10.4) — let a Vendor hand off Leads incrementally, removing them from the active list, while never allowing a re-scan of anyone already captured.
**Outcome docs:** `CONTEXT.md` (Active/Archived Lead + the widened dedup rule), `docs/adr/0005-active-archived-lead-lifecycle.md`, the **ADR-0002 revision** (dedup spans active ∪ archived). PRD to follow via `/to-prd`.

This is the raw record of the grilling. It's "round 2.5": the idea emerged *after* the basic Merge shipped, when the small QR chunks made incremental consolidation practical.

---

### Q1 — The data model: how do we remember "already scanned" after a Lead leaves the active list?
**Context surfaced:** today the active Leads list *is* the dedup index (`addLead`/ADR-0002 dedups against the stored `leads` array).

**Recommendation given:** **Two buckets, dedup against their union** — **active** Leads (`dayofdata.leads`, what Home/Export/Raffle/Share act on) and **archived** Leads (a second key, hidden but retained, restorable). Every Scan and import dedups against `active ∪ archived` by normalized email. The archived bucket *is* the persistent memory, so no separate abstract "seen" set is needed. (vs a separate forever email-set — only worth it if Leads could be permanently deleted while still blocking re-scan, which the "restore" framing doesn't call for.)

**Answer:** **"Yes I think this is great."** → two-bucket model, dedup against the union.

### Q2 — *When* does a Lead get archived?
**Tension surfaced:** chunked QR is **one-way, no delivery confirmation** — archiving too eagerly can silently drop Leads a teammate never scanned.

**Recommendation given:** **(A) Deliberate, explicit handoff** — Leads move to archived only when the Vendor taps "I've handed these off — archive them," *after* confirming with their teammate. Archives the whole active list; reversible via Restore. (vs auto-archive on share — rejected for the silent-loss risk.)

**Answer:** **"Yes A."** → deliberate, reversible archive of the whole active list.

### Q3 — What do Export and Raffle operate on?
**Recommendation given:** **Active-only** (archived excluded from Export, Raffle, and the next Share). The consolidation logic makes it clean: you hand off (archive) a batch to a teammate who exports/raffles those people; you act on your active remainder — everyone is counted exactly once across the table, no double-export. Restore brings archived back if a Vendor wants their full list again.

**Answer:** **"Yes this is ideal."** → Export / Raffle / Share act on the active list only.

### Q4 — "Clear shared": exact behavior + a separate full reset?
**Language sharpened:** "clear" reads like *delete*, but the intent is **Restore** (bring handed-off Leads back).

**Recommendation given:** **Restore = move all archived Leads back to active** in one non-destructive action (reversible by archiving again; dedup unaffected — they were always in the union). **No "wipe everything"** in this round — a true erase (clearing the dedup memory so people can be re-scanned) stays out of scope, consistent with the spec's "no delete in v1" (§5). Restore only *moves* data.

**Answer:** **"Yes this is what i was thinking."** → Restore-all (non-destructive); no data-wipe this round.

### Q5 — Does *import* dedup against archived too?
**Recommendation given:** **Yes — import dedups against `active ∪ archived`, identical to Scan** (existing wins regardless of bucket), or the "one Lead per Attendee" invariant breaks (an archived Attendee re-sent by a teammate would create a second, active record). Honest edge: a re-sent archived Attendee **stays archived** (skipped, not pulled to active); Restore brings all archived back if wanted.

**Answer:** **"Yes."** → both Scan and import dedup against the union.

---

## Net decisions (summary)

| # | Decision | Where recorded |
|---|----------|----------------|
| 1 | **Two buckets** — active + archived Leads, persisted separately | ADR-0005, CONTEXT.md |
| 2 | **Dedup spans active ∪ archived** (Scan *and* import; existing wins) | ADR-0002 revision, ADR-0005, CONTEXT.md |
| 3 | **Archiving is deliberate + reversible** (explicit handoff of the whole active list; never auto) | ADR-0005 |
| 4 | **Export / Raffle / Share act on active only** | ADR-0005, PRD |
| 5 | **Restore** = move all archived → active (non-destructive); **no data-wipe** this round | ADR-0005 |

**Next step:** `/to-prd` (a consolidation PRD under `docs/prd/`), then `/to-issues` — likely slices for the active/archived storage + union-dedup (revising `addLead`/`leadsStorage`), the deliberate **archive** action on the sender, the **Restore** action, and the receiver/Scan dedup-against-union — each built test-first via `/tdd`. No new camera/QR work; this is a Lead-model + UI change on top of the shipped Merge.
