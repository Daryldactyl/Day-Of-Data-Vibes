# Slice 15 — Active/archived Lead model: union dedup + bucket moves + archived store

**Type:** AFK
**PRD:** `docs/prd/consolidate-active-archived.md`
**ADR:** `docs/adr/0005-active-archived-lead-lifecycle.md` (+ the `docs/adr/0002-dedupe-leads-by-email.md` revision)

## What to build

The **pure model foundation** for consolidation — **no UI, no camera** in this slice. Three pieces:

- **Widen the dedup to the union.** Extend the add-a-Lead logic so it de-duplicates against **active ∪ archived**
  by normalized email: a contact whose email is in **active** is rejected (unchanged), one in **archived** is
  **rejected** (new behavior), a genuinely new contact is appended to **active**. Add the archived input as an
  optional argument **defaulting to empty**, so every existing caller's behavior is byte-identical until it opts in.
- **Pure bucket moves.** `archiveAll(active, archived)` → the whole active list moves into archived (active
  empties; order + `scannedAt` preserved). `restoreAll(active, archived)` → all archived move back into active
  (archived empties). Both pure, non-destructive (no Lead lost or duplicated); the dedup invariant guarantees the
  buckets never share an email.
- **Archived store.** Persist the archived bucket on a **separate key** (e.g. `dayofdata.archived`) alongside the
  existing active store — load/save mirroring the existing `loadLeads`/`saveLeads`; absent/empty → `[]`.

## Acceptance criteria

- [ ] The add-a-Lead logic de-dupes against **active ∪ archived**: a contact already in **active** → rejected; a
      contact already in **archived** → **rejected**; a new contact → added to active. With the archived argument
      defaulting to empty, behavior is **byte-identical to today** (regression guard test).
- [ ] `archiveAll(active, archived)` moves the whole active list into archived (active empties; order + `scannedAt`
      preserved); `restoreAll(active, archived)` moves all archived back into active; **archive-then-restore
      round-trips** to the original active set; both are **non-destructive** (no Lead lost or duplicated).
- [ ] The archived bucket loads/saves on a **separate key**, independent of the active store; absent/empty → `[]`.
- [ ] Durable pure Vitest tests cover all of the above (prior art: `src/lib/leads.test.ts`,
      `src/lib/leadsStorage.test.ts`, `src/lib/scan.test.ts`). **No UI/camera** in this slice.
- [ ] `npm test` all green, `tsc -b` + `npm run lint` clean.

## Blocked by

- None — can start immediately (extends the existing `addLead` / `leadsStorage`).

## Disciplines

Build via **`/tdd`** (red → green → refactor, **one test at a time**; vertical tracer-bullet, never horizontal).
Follow `docs/working-agreements.md` **verbatim**, and these in full — a subagent MUST NOT skip them:

- **Never assume. Chase every bug to its ROOT CAUSE** — no band-aids, no "probably," no jumping to conclusions;
  reproduce → minimize → fix the actual cause; never blame the network or the model.
- **Test behavior through public interfaces, not implementation** (tests survive refactors). Pure logic in
  `src/lib/` tested directly (prior art: `src/lib/leads.test.ts`, `src/lib/leadsStorage.test.ts`).
- **Durable Vitest tests for everything verified** (this slice is pure; live Playwright QA comes in the UI slices
  0016/0017).
- Use the **`CONTEXT.md` glossary** verbatim (Lead, **Active Lead / Archived Lead**) in code and tests. Respect
  **ADR-0005** (active/archived lifecycle) and the **ADR-0002 revision** (dedup spans active ∪ archived).
- Implement from a dedicated slice **`/handoff`** in **fresh context**.
- **The orchestrator will independently and adversarially review** the result and its proof — re-running the
  suite, re-reading the code, and trying to break the claims (does the empty-archived default truly preserve
  today's behavior? do the moves ever lose/duplicate a Lead?) — and will **never** trust the subagent's report
  alone. Report faithfully, including any mis-step.
