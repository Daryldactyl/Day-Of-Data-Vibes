# Handoff — Slice 10: Raffle (draw + reveal)

**Read first (verbatim):** `docs/working-agreements.md` (disciplines), `docs/issues/0010-raffle-draw-and-reveal.md` (this slice), `docs/prd/raffle.md`, `CONTEXT.md` (glossary — note the **Raffle** entry).

Implement in a **fresh context** via `/tdd`. This is the **tracer bullet** for the Raffle: a working, fair draw with a **simple/instant reveal**. The gamified rolling reel is a *separate* later slice (0011) — **do not build the animation here.**

---

## What this slice delivers

Home gains a third action button (**Scan · Export · Raffle**), disabled at 0 Leads. Tapping **Raffle** opens a
full-screen view that reveals one winning **Lead** (name + email), chosen by a fair random draw over the current
Leads. **Draw again** re-draws (independent each press); **Done** returns to Home. Read-only — never mutates,
reorders, persists, or clears a Lead.

## Architecture & seams (match the existing patterns exactly)

`App` (`src/App.tsx`) is a single screen that toggles full-screen overlays via `useState` (`scanning` →
`ScanOverlay`, `makingBadge` → `BadgeGenerator`) and injects effects as optional props with real defaults
(`createScanner`, `exportLeads`, `makeQrDataUrl`). **Mirror this.**

### 1. New pure logic — `src/lib/raffle.ts` (TDD this first)

```
import type { Lead } from './leads'
export function pickWinner(leads: Lead[], rng: () => number): Lead | null
//   returns null for an empty list; otherwise a uniformly-random Lead.
//   index = Math.floor(rng() * leads.length), clamped to the last index so a
//   fake rng returning exactly 1 can't go out of bounds. rng is Math.random-shaped
//   (returns [0, 1)). The winner is decided HERE — the UI never decides it.
```

Pure, no DOM. Test directly (model: `src/lib/leads.test.ts`, `src/lib/badge.test.ts`).

### 2. New injected capability — the random source

Add an optional `random?: () => number` prop to `App` (default `Math.random`), exactly like `createScanner` /
`exportLeads` / `makeQrDataUrl`. Thread it into the Raffle view. This keeps the draw deterministic under test
and out of render purity (the same `react-hooks/purity` concern that flagged `Date.now()` — do **not** call
`Math.random()` inline in render; call it through the injected capability in an event handler).

### 3. New component — `src/RaffleOverlay.tsx`

Props: `{ leads: Lead[]; onDone: () => void; random?: () => number }` (default `Math.random`).
- On open, draw a winner: `pickWinner(leads, random)`; show the winning Lead's **name + email** big and centered
  (a simple/instant reveal — **no reel/animation**, that's slice 0011). Full-screen container; mirror the
  `.badge-overlay` / `.scan-overlay` styling in `src/App.css`.
- **Draw again** button → draw again (a fresh `pickWinner(leads, random)` call → the next winner).
- **Done** button → `onDone`.
- Glossary in UI copy: it's a **Raffle**, the winner is a **Lead**.

### 4. `src/App.tsx` wiring

- Add optional `random?: () => number` to `AppProps` (default `Math.random`).
- Add `const [raffling, setRaffling] = useState(false)`.
- Add a **Raffle** button as the third control in the `.actions` row (Scan · Export · Raffle), **disabled when
  `leads.length === 0`**.
- Render `<RaffleOverlay leads={leads} onDone={() => setRaffling(false)} random={random} />` when `raffling`.
- Home's Leads / Scan / Export are untouched.

## TDD cycle list (one test → minimal code each)

`src/lib/raffle.test.ts`:
1. `pickWinner` returns a Lead that is one of the input Leads (deterministic `rng`).
2. With a single-Lead list, returns that Lead (any `rng`).
3. Selection spans the whole list — `rng → 0` picks the first, `rng → ~0.999` picks the last (no off-by-one).
4. Empty list → returns `null` (the defined contract).

`src/App.raffle.test.tsx` (RTL; inject a fake `random` through `App`, prior art `src/App.scan.test.tsx` / `src/App.export.test.tsx`):
5. The **Raffle** button is **disabled at 0 Leads** and **enabled at ≥1**.
6. Tapping Raffle reveals the `random`-chosen winning Lead (name + email).
7. **Draw again** performs another draw (advance the fake `random` → the next winner is revealed).
8. After any number of draws, the Leads list is **unchanged** (read-only); **Done** returns to Home.

Refactor with green.

## Do NOT
- Do **not** build the rolling reel / any animation (that's slice 0011). A simple instant reveal only.
- Do not call `Math.random()` (or `Date.now()`) inline in render — use the injected `random` in a handler.
- Do not mutate, reorder, persist, or clear Leads. Do not touch scan/export/badge logic or their tests.
- No new dependency, no router.

## Live QA (the ORCHESTRATOR runs this on inspection — note what it asserts)
Playwright MCP, non-headless, screenshots to `/tmp`: seed Leads in `localStorage` (`dayofdata.leads`), open
Raffle from Home, confirm a winning Lead is revealed; Draw again changes/redraws; Done returns; the Leads list
is unchanged. (The reveal's *correctness vs the rng* is the asserted part; there's no animation to judge yet.)

## Acceptance criteria
See `docs/issues/0010-raffle-draw-and-reveal.md`. Plus `npm test` all green, `tsc -b` + `npm run lint` clean.

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time; vertical tracer-bullet. Behavior through public interfaces.
Glossary: Raffle / Lead / Vendor. **Never assume; chase bugs to ROOT CAUSE — no jumping to conclusions.** The
orchestrator will **independently and adversarially review** (re-run, re-read, try to break it) and will not
trust this report alone. Report faithfully (real test output), including any mis-step.

## Exact next action
1. `npm test` → confirm the current baseline is green.
2. Cycle 1: a failing test for `pickWinner` (returns a Lead from the list). Red → green → continue the list.
3. Land the pure `pickWinner`, then the Raffle view (inject `random`), then the Home button (disabled at 0).
   Hand back to the orchestrator for live QA.
