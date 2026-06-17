# PRD — Consolidate throughout the day (active / archived Leads)

**Status:** ready to build
**Scope:** The consolidation lifecycle on top of Merge — a Vendor's Leads split into **active** and **archived** buckets so a batch handed off to a teammate leaves the working list, while an already-scanned Attendee can **never** be re-captured, and handed-off Leads can be **restored**.
**Sources:** `spec_sheet.md` (§10.4), `CONTEXT.md` (Active/Archived Lead + the widened dedup rule), `docs/qa-sessions/consolidation-grilling.md`, `docs/adr/0005-active-archived-lead-lifecycle.md`, `docs/adr/0002-dedupe-leads-by-email.md` (revision), `docs/adr/0004-merge-lists-chunked-qr.md`
**Vocabulary:** Uses the project glossary in `CONTEXT.md` — Attendee, Vendor, Lead, **Active Lead / Archived Lead**, Scan, Export, Raffle, Merge.

---

## Problem Statement

Once Merge let teammates hand Leads phone-to-phone in small QR codes, Vendors realized they'd consolidate **as
they go** — hand a batch to a teammate now and then, not in one end-of-day dump. But that creates a tension the
current model can't express: a Vendor wants the handed-off Leads to **leave their working list** (so they aren't
shown, exported, raffled, or re-shared in the next batch) — yet they must still be **unable to re-scan** those
Attendees (the no-duplicates rule must survive the handoff), and they need a way to **get a batch back** if a
handoff has to be redone (e.g. it goes to a different teammate, or a code was missed). Today the active Leads
list *is* the dedup memory, so "remove from my list" and "still can't re-scan" are in direct conflict.

## Solution

A Vendor's Leads live in two buckets. **Active** Leads are what Home shows and what **Export**, **Raffle**, and a
Merge **handoff** act on. **Archived** Leads are ones the Vendor has deliberately handed off and set aside —
hidden from the active list, but kept. After confirming a handoff landed, the Vendor taps **"archive these,"**
moving the whole active list to archived; their working list is now clear for the next stretch of scanning. A
small **"N archived — Restore"** affordance brings *all* archived Leads back to active in one tap (to re-share to
a different teammate, or recover a missed handoff). Throughout, **scanning or importing an Attendee the Vendor
has ever captured — active *or* archived — is still rejected as a duplicate**, so consolidating can never let the
same person sneak in twice. Nothing is ever deleted; archive and restore only *move* Leads between buckets.

## User Stories

1. As a Vendor, I want handed-off Leads to **leave my active list**, so that my Home list reflects only who I'm still holding and I'm not re-shown their QR codes.
2. As a Vendor, I want an explicit **"archive these"** action after a handoff, so that Leads leave my list only when *I* confirm the transfer landed.
3. As a Vendor, I want archiving to be **deliberate, never automatic**, so that a teammate missing a code can't silently drop Leads from my list.
4. As a Vendor, I want **"archive these" to set aside my whole active list**, so that one tap clears what I just handed off.
5. As a Vendor, I want an **archived Attendee to still count as already-scanned**, so that I can never accidentally re-scan someone I've handed off.
6. As a Vendor importing a teammate's list, I want incoming Leads I **already hold (active or archived)** to be skipped, so that consolidating never creates a duplicate of someone I've met.
7. As a Vendor, I want a **"Restore"** action that brings *all* archived Leads back to active, so that I can re-share them to a different teammate or recover from a botched handoff.
8. As a Vendor, I want Restore to be **non-destructive** (it only moves Leads back), so that I never lose data by restoring.
9. As a Vendor, I want to **see how many Leads are archived**, so that I know there's a set I can restore.
10. As a Vendor, I want **Export to act on my active Leads only**, so that when teammates combine lists each Attendee is exported exactly once, not double-counted.
11. As a Vendor, I want **Raffle to draw from my active Leads only**, so that the consolidation phone (holding everyone) runs the whole-table draw, not each phone partially.
12. As a Vendor, I want a **Share / handoff to offer my active Leads only**, so that I'm not re-sending people I've already handed off.
13. As a Vendor who has archived everyone, I want **Export and Raffle to be empty/disabled**, so that the app reflects that I've consolidated my list onto a teammate's phone.
14. As a Vendor, I want **archive and restore to persist** across a reload or a dead battery, so that my buckets survive the day.
15. As a Vendor, I want my Leads' **scan times preserved** through archive/restore, so that provenance isn't lost when a Lead moves buckets.
16. As a Vendor, I want the single-phone flow (never sharing) to be **unchanged** — everything is just "active" — so that consolidation adds nothing I have to think about unless I use it.
17. As a Vendor, I want **no "erase everything" button** that could wipe my Leads or let me re-scan from scratch, so that I can't fumble away a day's data (consistent with no-delete-in-v1).

## Implementation Decisions

- **Two buckets (ADR-0005).** A Vendor's Leads are partitioned into **active** and **archived**, persisted as two
  separate on-device stores. The active store is the existing one; archived is a new sibling store. The invariant
  is "at most one Lead per Attendee across active ∪ archived."
- **Dedup widened to the union (ADR-0002 revision).** The pure add-a-Lead logic, which today rejects a contact
  whose normalized email is already in the active list, is extended to reject one already in **active ∪
  archived** — defaulting (with an empty archived argument) to exactly today's behavior, so every existing caller
  is unaffected until it opts in. **Both** entry points use it: a **Scan** and a Merge **import**.
- **Pure bucket moves.** `archive-all` moves the whole active list into archived (active becomes empty). `restore-all`
  moves the whole archived set back into active (archived becomes empty). Both are pure list transforms; the
  invariant guarantees the two buckets never share an email, so the moves are simple and lossless. The
  surrounding App action persists both stores after a move.
- **Archiving is a deliberate Vendor action.** Triggered by an explicit **"archive these"** control on the sender
  (handoff) view — *not* a side effect of opening or closing it — because chunked QR (ADR-0004) is one-way with no
  delivery confirmation, so auto-archiving could silently lose un-transferred Leads.
- **Active is the working set everywhere.** Export, Raffle, the Scan overlay's save, and the Share/handoff all
  operate on the **active** Leads (the existing app state) — no change to their logic; they simply never see
  archived Leads. Disabled/empty states (e.g. Export/Raffle at 0 active) fall out naturally.
- **Union-dedup threaded to the add-paths.** The two views that add Leads (the Scan overlay and the import view)
  receive the **archived** Leads as input and pass them into the dedup, mirroring the existing injected-prop
  pattern; the App owns both buckets and threads them down.
- **Restore + archived-count UI.** A small "N archived — Restore" affordance (on Home / in the footer area)
  surfaces the archived count and the one-tap restore. The "archive these" action lives on the handoff view.
- **No deletion / no wipe.** There is no action that erases Leads or clears the dedup memory in this round; archive
  and restore only *move* Leads (consistent with the spec's no-delete-in-v1, §5).

## Testing Decisions

- **Test behavior through public interfaces, not storage internals.** Assert what the pure functions return for
  given active/archived inputs, and what the views do — never the localStorage shape directly.
- **The widened dedup is the primary pure unit (extended).** Cases: a contact already in **active** is rejected
  (unchanged); a contact already in **archived** is **rejected** (the new behavior); a genuinely new contact is
  added to active; with an empty archived argument, behavior is byte-identical to today (regression guard). Prior
  art: `src/lib/leads.test.ts`, `src/lib/scan.test.ts`.
- **`archive-all` / `restore-all` pure tests.** Active→archived empties active and appends to archived (order +
  scan times preserved); restore concatenates archived back into active and empties archived; round-tripping
  (archive then restore) returns the original active set; both are non-destructive (no Lead lost or duplicated).
- **Persistence.** The archived store loads/saves independently of the active store; a reload preserves both
  buckets. Prior art: `src/lib/leadsStorage.test.ts`.
- **View behavior (existing injected seams).** Through component/render tests (prior art: `src/App.scan.test.tsx`,
  `src/App.export.test.tsx`, `src/App.raffle.test.tsx`): a Scan / import of an **archived** Attendee is rejected
  (dedup hit, no new active row); the **"archive these"** action moves active→archived (Home empties, archived
  count rises, Export/Raffle become empty/disabled); **Restore** brings them back; Export/Raffle/Share continue to
  read active only.
- **Live Playwright MCP QA.** Seed active + archived buckets; confirm Home shows active only; archive the list →
  Home clears, "N archived — Restore" shows; scan/inject an archived email → rejected; Restore → list returns;
  Export reflects active only.

## Out of Scope

- **Any deletion or "start over" / data-wipe** — archive and restore only move Leads; nothing clears the dedup
  memory or erases Leads (no-delete-in-v1, §5). A guarded hard reset is a possible *future* action, not this round.
- **Per-Lead or partial archiving / selecting a subset** — archive and restore act on the **whole** bucket
  (matching Share's whole-list handoff).
- **An automatic / delivery-confirmed archive** — rejected (one-way QR, no confirmation); archiving stays manual.
- **A browsable archived-Leads view / search / un-archiving individuals** — only the count + whole-set Restore.
- **Cross-device sync of the active/archived split** — buckets are per-device; Merge already carries Leads between
  phones.
- **Changing Export's columns/format, the Raffle, or the camera/QR pipeline** — untouched; this is a Lead-model +
  small-UI change.

## Further Notes

- This PRD is intentionally local (`docs/prd/`), matching the other PRDs and the ADRs — no issue tracker is used.
- This is **round 2.5** — a feature the *build itself surfaced* (the small Merge chunks made incremental
  consolidation practical, `spec_sheet.md` §10.4); its story is in `docs/walkthrough/07-round-two-evolving-the-app.md`.
- The one hard-to-reverse decision (the active/archived lifecycle + dedup spanning both buckets) is recorded as
  **ADR-0005**, which **revises ADR-0002**. No new ADR is needed for the UI/action choices.
- Build order suggestion: TDD the pure widened dedup + `archive-all`/`restore-all` first, then the archived store
  (persistence), then thread `archived` into the App + the Scan/import views (union-dedup) and Export/Raffle stay
  active-only, then the "archive these" action and the "N archived — Restore" UI. Verify live with Playwright MCP.
- Pairs with **Merge**: the handoff (sender) is where "archive these" lives; the receiver's import already dedups
  and will now dedup against the union too.
