# Slice 17 — Consolidation: Restore archived Leads to active

**Type:** AFK
**PRD:** `docs/prd/consolidate-active-archived.md`
**ADR:** `docs/adr/0005-active-archived-lead-lifecycle.md`

## What to build

The **restore thread**. A Vendor with archived Leads sees an **"N archived — Restore"** affordance (the archived
count, plus a one-tap restore). Tapping **Restore** moves **all** archived Leads back to active in one action
(Slice 15's `restoreAll`), persists both stores, and is **non-destructive** — afterward Home shows the restored
Leads again, the archived count returns to 0, and Export / Raffle / Share see them. This is how a Vendor
re-shares to a *different* teammate or recovers from a missed handoff. There is **no** action that erases Leads or
the dedup memory (no data-wipe this round).

## Acceptance criteria

- [x] An archived-count affordance shows **N** when there are archived Leads, and is hidden/absent at **0** archived.
- [x] Tapping **Restore** moves **all** archived Leads → active (`restoreAll`), persists **both** stores; Home then
      shows the restored Leads, the archived count returns to 0, and Export/Raffle include them again.
- [x] Restore is **non-destructive** — no Lead lost or duplicated, `scannedAt` preserved. **No** action erases
      Leads or clears the dedup memory (no data-wipe).
- [x] Durable RTL tests: the count shows when archived is non-empty; **Restore** moves archived→active and persists
      both stores; round-trip with archive (Slice 16) is lossless. A live Playwright MCP QA pass: with archived
      seeded, Restore brings the list back to Home.
- [x] `npm test` all green, `tsc -b` + `npm run lint` clean.

## Blocked by

- **Slice 16 — Consolidation: archive** (provides the App's `archived` state, the persistence wiring, and the
  UI surface this affordance sits on).

> **Handoff note (do NOT pre-write):** craft this slice's `/handoff` **after Slice 16 has landed and been
> inspected** — it needs the *real* App `archived` state shape, the persist-both wiring, and where the
> archived-count/Restore control should live.

## Disciplines

Build via **`/tdd`** (red → green → refactor, **one test at a time**; vertical tracer-bullet, never horizontal).
Follow `docs/working-agreements.md` **verbatim**, and these in full — a subagent MUST NOT skip them:

- **Never assume. Chase every bug to its ROOT CAUSE** — no band-aids, no "probably," no jumping to conclusions;
  reproduce → minimize → fix the actual cause; never blame the network or the model.
- **Test behavior through public interfaces, not implementation** (tests survive refactors). Use the existing
  injected-prop / seam patterns (prior art: `src/App.export.test.tsx`, `src/App.raffle.test.tsx`).
- **Durable Vitest/RTL tests for everything verified, PLUS live Playwright MCP QA** (non-headless).
- Use the **`CONTEXT.md` glossary** verbatim (Lead, **Active Lead / Archived Lead**) in code, tests, and UI.
  Respect **ADR-0005** (Restore is non-destructive; no data-wipe).
- Implement from a dedicated slice **`/handoff`** in **fresh context** (crafted per the handoff note above).
- **The orchestrator will independently and adversarially review** the result and its proof — re-running the
  suite, re-reading the code, and trying to break it (does Restore ever lose or duplicate a Lead? is there any
  hidden delete?) — and will **never** trust the subagent's report alone. Report faithfully, including any mis-step.
