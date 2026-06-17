# Handoff — Slice 17: Consolidation Restore (archived → active)

**Read first (verbatim):** `docs/working-agreements.md`, `docs/issues/0017-consolidation-restore.md` (this slice), `docs/prd/consolidate-active-archived.md`, `docs/adr/0005-active-archived-lead-lifecycle.md`, `CONTEXT.md` (**Active Lead / Archived Lead**).

Implement in a **fresh context** via `/tdd`. Slices 0015 + 0016 are **DONE and merged** — the model and the `archived` state are already in the app. This is the **final, small** slice: surface the archived count and a one-tap **Restore**.

## Where things stand — the real API you build on
- `src/lib/leads.ts`: **`restoreAll(active, archived)`** → `{ active: [...active, ...archived], archived: [] }` (pure, non-destructive).
- `src/App.tsx` (slice 0016): holds `const [leads, setLeads] = useState(() => loadLeads())` and
  `const [archived, setArchived] = useState(() => loadArchived())`; persisters `saveLeads` / `saveArchived` are
  imported; `handleArchive()` is the symmetric sibling of what you'll add. The Home **footer** is
  `<footer className="foot">` with a `.foot-links` row containing the "Make a badge" and "Import a list" entries.
  **Read `src/App.tsx`** (the footer + `handleArchive`).

## What this slice delivers

An **"N archived — Restore"** affordance in the Home footer (alongside "Make a badge" / "Import a list"):
- Shows the archived **count** (`archived.length`) when there are archived Leads; **hidden/absent at 0 archived**.
- Tapping **Restore** runs `restoreAll(leads, archived)`, sets both states, and **persists both stores**
  (`saveLeads(active)` + `saveArchived(archived)`) — symmetric to `handleArchive`. Afterward Home shows the
  restored Leads, the count returns to 0 (control hides), and Export/Raffle/Share see them again.
- **Non-destructive** — Restore only *moves* Leads; nothing is deleted, and there is **no** data-wipe action.

## TDD cycle list (one test → minimal code each; prior art `src/App.export.test.tsx`, `src/App.raffle.test.tsx`)
1. With archived seeded (e.g. `dayofdata.archived` has 2, active has 1), the footer shows an archived-count
   affordance reading "2" (or "2 archived"); with **0** archived it is absent.
2. Tapping **Restore** moves all archived → active: Home's lead count rises to 3, `loadArchived()` is now empty,
   `loadLeads()` has all 3; the count affordance disappears (0 archived).
3. Restore is **non-destructive** — no Lead lost or duplicated, `scannedAt` preserved (assert the merged set
   equals active + archived).

Refactor with green.

## Do NOT
- Do not add any delete / "wipe everything" action (out of scope — Restore only moves Leads).
- Do not modify `restoreAll`/`archiveAll`/storage (slices 0015/0016 — use as-is). Do not change Export/Raffle/Scan
  logic. No new dependency, no router.

## Live QA (the ORCHESTRATOR runs this on inspection)
Playwright MCP: seed active + archived; confirm the footer shows the archived count; tap **Restore** → Home shows
the restored Leads, `dayofdata.archived` empties, `dayofdata.leads` has them all, the count affordance is gone,
Export/Raffle enabled. Round-trip with archive (archive then restore) is lossless.

## Acceptance criteria
See `docs/issues/0017-consolidation-restore.md`. Plus `npm test` all green, `tsc -b` + `npm run lint` clean.

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time. Behavior through public interfaces. Glossary: Lead / Active Lead /
Archived Lead. Respect **ADR-0005** (Restore non-destructive; no data-wipe). **Never assume; chase bugs to ROOT
CAUSE.** The orchestrator will **independently and adversarially review** (re-run, re-read, try to make Restore
lose/duplicate a Lead, look for any hidden delete) and will not trust this report alone. Report faithfully.

## Exact next action
1. `npm test` → confirm the 141-green baseline.
2. Cycle 1: a failing test — the archived-count affordance shows when archived is non-empty. Red → green → continue.
3. Add `handleRestore()` (symmetric to `handleArchive`, using `restoreAll`) + the footer count/Restore control.
   Hand back to the orchestrator for live QA.
