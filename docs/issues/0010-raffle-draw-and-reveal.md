# Slice 10 — Raffle: draw + reveal

**Type:** AFK
**PRD:** `docs/prd/raffle.md`

## What to build

The Raffle tracer bullet — a working, fair draw, *without* the fancy animation yet. Home gains a third action
button (**Scan · Export · Raffle**), disabled at 0 Leads. Tapping **Raffle** opens a full-screen view that
reveals one winning **Lead** (name + email), chosen by a pure `pickWinner(leads, rng)` over the current Leads
using an **injected random source**. A **Draw again** button re-draws (a fresh independent pick — the same
person can recur); a **Done** button returns to Home. The draw is **read-only**: it never adds, removes,
reorders, persists, or clears a Lead. A simple/instant reveal is fine here — the gamified rolling reel is
Slice 11.

## Acceptance criteria

- [ ] A pure `pickWinner(leads, rng)` (built test-first) returns a uniformly-random Lead from `leads`: the
      result is always one of the input Leads; a single-Lead list returns that Lead; the selection spans the
      whole list (no off-by-one excluding first/last); the empty-list contract is defined and tested.
- [ ] The random source is an **injected capability** on `App` (default the platform RNG), mirroring the
      existing `createScanner` / `exportLeads` / `makeQrDataUrl` seams — so tests pin the winner and the draw
      stays out of render purity.
- [ ] A **Raffle** button is the third action on Home (Scan · Export · Raffle), **disabled at 0 Leads**,
      enabled at ≥1.
- [ ] Tapping Raffle opens a full-screen Raffle view revealing the `rng`-chosen winning Lead (name + email).
- [ ] **Draw again** performs another independent draw (a new `rng` value → the next winner); **Done** returns
      to Home.
- [ ] The Leads list is **unchanged** after any number of draws (read-only / non-destructive).
- [ ] Durable Vitest/RTL tests cover `pickWinner` (pure, edges) and the Raffle view via an injected `rng`
      (disabled at 0, reveals the chosen winner, Draw again redraws, Leads unchanged). A live Playwright MCP QA
      pass seeds Leads, opens Raffle, draws, and confirms the reveal.
- [ ] `npm test` all green, `tsc -b` + `npm run lint` clean.

## Blocked by

- None — can start immediately (the Lead core is in place; Leads load/persist).

## Disciplines

Build via **`/tdd`** (red → green → refactor, **one test at a time**; vertical tracer-bullet, never horizontal).
Follow `docs/working-agreements.md` **verbatim**, and these in full — a subagent MUST NOT skip them:

- **Never assume. Chase every bug to its ROOT CAUSE** — no band-aids, no "probably," no jumping to conclusions;
  reproduce → minimize → fix the actual cause; never blame the network or the model.
- **Test behavior through public interfaces, not implementation** (tests survive refactors). Pure logic in
  `src/lib/` tested directly (prior art: `src/lib/leads.test.ts`, `src/lib/scan.test.ts`); effects **injected as
  capabilities** that default to the real impl and are faked in tests (prior art: `createScanner`,
  `exportLeads`, `makeQrDataUrl`).
- **Durable Vitest/RTL tests for everything verified, PLUS live Playwright MCP QA** (non-headless).
- Use the **`CONTEXT.md` glossary** verbatim (Attendee, Vendor, Lead, **Raffle**) in code, tests, and UI.
- Implement from a dedicated slice **`/handoff`** in **fresh context**.
- **The orchestrator will independently and adversarially review** the result and its proof — re-running the
  suite, re-reading the code, and trying to break the claims — and will **never** trust the subagent's report
  alone. Report faithfully, including any mis-step.

(No new ADR — pick-then-animate and independent draws are standard, recorded as a deliberate "no ADR" in the grill.)
