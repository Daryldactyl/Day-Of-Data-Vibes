# Handoff — Slice 16: Consolidation archive (wire the model in)

**Read first (verbatim):** `docs/working-agreements.md`, `docs/issues/0016-consolidation-archive.md` (this slice), `docs/prd/consolidate-active-archived.md`, `docs/adr/0005-active-archived-lead-lifecycle.md`, `docs/adr/0002-dedupe-leads-by-email.md` (Revision), `CONTEXT.md` (**Active Lead / Archived Lead**).

Implement in a **fresh context** via `/tdd`. Slice 0015 is **DONE and merged** — you build on its real, shipped API. This is the **visible archive thread**: both buckets in the app, union-dedup on Scan + import, and a deliberate "archive these" handoff action.

## Where things stand — Slice 0015's real API (in `src/lib/leads.ts` / `leadsStorage.ts`)
```
addLead(leads, contact, scannedAt, archived: Lead[] = []): { leads, status }   // dedups against active ∪ archived
archiveAll(active, archived): { active: [], archived: [...archived, ...active] }
restoreAll(active, archived): { active: [...active, ...archived], archived: [] }
export interface LeadBuckets { active: Lead[]; archived: Lead[] }
loadArchived(): Lead[]            // key 'dayofdata.archived'; absent → []
saveArchived(leads: Lead[]): void
```

## Read these (the call sites you thread `archived` through)
- `src/lib/scan.ts` (`handleScan(leads, rawQrText, scannedAt)` → calls `addLead`) + `src/lib/scan.test.ts`
- `src/lib/listTransfer.ts` (`mergeLeads(existing, incoming)` → folds through `addLead`) + its test
- `src/ScanOverlay.tsx`, `src/ImportListView.tsx` (the two add-paths; they get an `archived` prop)
- `src/ShareListView.tsx` (the sender — gets the "archive these" action)
- `src/App.tsx` (holds `leads`; add `archived` state + the archive handler; thread `archived` down)
- `src/App.scan.test.tsx`, `src/App.import.test.tsx`, `src/App.share.test.tsx`, `src/App.export.test.tsx`, `src/App.raffle.test.tsx`

## What this slice delivers

1. **Both buckets in the App.** `App` gains `archived` state, loaded once on init via `loadArchived()` (lazy
   initializer, like `leads`). It threads `archived` into the two add-paths.
2. **Union-dedup on Scan AND import.** Extend `handleScan(leads, rawQrText, scannedAt, archived = [])` to pass
   `archived` into `addLead`; extend `mergeLeads(existing, incoming, archived = [])` to pass it through too
   (defaults `[]` so nothing else breaks). `ScanOverlay` and `ImportListView` each gain an **`archived: Lead[]`
   prop** and pass it down. Result: a Scan or import of an Attendee in **active OR archived** is rejected.
3. **Deliberate "archive these" on the sender.** `ShareListView` gains an explicit action — e.g. a button
   **"I've handed these off — archive them"** — wired to an `onArchive` prop. `App`'s handler runs
   `archiveAll(leads, archived)`, sets both states, and **persists both** (`saveLeads(active)` + `saveArchived(archived)`),
   then closes the view (back to Home). Opening/closing the share view archives **nothing** — only this button does.
4. **Active stays the working set.** Home, Export, Raffle, and the Share handoff already read the active `leads`
   — **do not change their logic**. After archiving, `leads` is `[]`, so Home shows the empty state and
   Export/Raffle are disabled — verify this falls out for free. (The "N archived — Restore" UI is the *next* slice
   0017; here, archived data is simply persisted and restorable later.)

## TDD cycle list (one test → minimal code each)

Pure first:
1. `handleScan(..., archived)` → a vCard whose email is in `archived` yields `notification: 'duplicate'` (extend `scan.test.ts`).
2. `mergeLeads(existing, incoming, archived)` → an incoming Lead whose email is in `archived` is skipped (extend the listTransfer test).

Component / App (inject the existing seams; prior art `src/App.scan.test.tsx`):
3. `App` loads `archived` on init and passes it to `ScanOverlay` + `ImportListView`; a **Scan** of an archived
   email is rejected ("Already saved", no new active row). (Seed `dayofdata.archived`.)
4. An **import** of an email in archived is skipped (mergeLeads via the import view dedups against the union).
5. The sender's **"archive these"** action moves the whole active list → archived, **persists both stores**
   (`loadLeads()` empty, `loadArchived()` has them), and returns to Home; Home shows the empty state.
6. **Not automatic:** opening then closing the share view (without the archive button) leaves active/archived
   unchanged.
7. After archiving, **Export and Raffle are disabled/empty** (they read active only) — assert no logic change broke them.

Refactor with green. **Migration:** if any existing `mergeLeads`/`handleScan` tests assumed the 3-arg form, the
new optional `archived` defaults to `[]` so they should still pass — run them and confirm.

## Do NOT
- Do not build the "N archived — Restore" UI (slice 0017). Do not change Export/Raffle/Home logic — they already
  read active; just thread `archived` to the add-paths and add the archive action.
- Do not modify `addLead`/`archiveAll`/`restoreAll`/the storage (slice 0015 — use as-is). No new dependency.

## Live QA (the ORCHESTRATOR runs this on inspection)
Playwright MCP, non-headless: seed active + archived; confirm Home shows active only; inject a Scan of an
**archived** email (`__scanBadge`) → rejected ("Already saved"); tap the sender's **"archive these"** → Home
clears, `dayofdata.archived` now holds the list, `dayofdata.leads` empty; Export/Raffle disabled.

## Acceptance criteria
See `docs/issues/0016-consolidation-archive.md`. Plus `npm test` all green, `tsc -b` + `npm run lint` clean.

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time. Behavior through public interfaces; reuse the injected seams.
Glossary: Lead / Active Lead / Archived Lead / Scan / Export / Raffle / Merge. Respect **ADR-0005** + the
**ADR-0002 revision** (dedup spans active ∪ archived). **Never assume; chase bugs to ROOT CAUSE.** The
orchestrator will **independently and adversarially review** (re-run, re-read, try to re-scan an archived
Attendee, confirm opening the share view archives nothing, confirm Export/Raffle never show archived) and will
not trust this report alone. Report faithfully (real test output), including any mis-step.

## Exact next action
1. `npm test` → confirm the 135-green baseline.
2. Cycle 1: a failing test — `handleScan` rejects an archived email. Red → green → continue.
3. Thread `archived` through scan/import + App, add the "archive these" action, verify active-only Export/Raffle.
   Hand back to the orchestrator for live QA. Report the App `archived` state shape + the archive handler (slice
   0017's handoff is written from it).
