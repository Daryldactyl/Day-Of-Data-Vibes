# Slice 11 — Raffle: gamified vertical name-reel

**Type:** AFK (with a HITL feel-check on the prototype)
**PRD:** `docs/prd/raffle.md`

## What to build

Layer the **gamified reveal** onto Slice 10's working draw: a **vertical name reel** — the actual Lead names
roll/scroll upward fast, then **decelerate (ease-out) and settle on the winner**, which **pops to full size**.
**Draw again** replays the roll to the next winner. Crucially, the winner is **still the pre-chosen
`pickWinner` result** — the reel is choreography that *lands on* it, never the thing that *decides* it.

**Prototype first.** The exact feel — spin speed, total duration (~2–3s), easing curve, and the final pop — is
tuned by **`/prototype`** (a throwaway interactive mock) and eyeballed before the real `/tdd` build. The
prototype's locked motion parameters/structure feed this slice's handoff.

## Acceptance criteria

- [x] A `/prototype` of the reel motion is built and its **feel approved** before implementation.
- [x] The reel cycles the **actual Lead names**, decelerates, and lands on the winner, which pops to full size.
- [x] The revealed winner is **always the `rng`-chosen one** (the animation never determines the winner) —
      asserted via an injected `rng`.
- [x] **Draw again** replays the roll to the next chosen winner; **Done** returns to Home; Leads remain unchanged.
- [x] `prefers-reduced-motion` falls back to an instant reveal (no jarring motion for users who opted out).
- [x] Durable tests assert the **outcome** (the chosen winner is revealed) via the injected `rng`; the **motion
      itself is QA'd live** (Playwright MCP) + via the prototype, not unit-asserted.
- [x] `npm test` all green, `tsc -b` + `npm run lint` clean.

## Implementation notes (Slice 11)

- **`/prototype`** built as a throwaway mock (`/tmp/raffle-reel-prototype.html`) with live tuners; the Vendor
  locked **Duration 3.0s · 8 loops · easeOutExpo `cubic-bezier(.16,1,.3,1)`**, baked into `RaffleOverlay` as
  named constants.
- **Pick-then-animate (fairness):** `makeSpin` calls `pickWinner(leads, random)` **first**; the revealed card
  shows `spin.winner` **directly**, so the reel's `landTranslate` only positions pixels — the animation can
  never change the winner. The reveal fires after `RAFFLE_DURATION_MS` via a **timer** (not `transitionend`, so
  jsdom can test it). `prefers-reduced-motion` (injectable `prefersReducedMotion`, default `matchMedia`) → instant
  reveal, no reel.
- **Verified:** built by a subagent via TDD (+5 reel tests; the two Slice-10 App tests migrated to advance fake
  timers and still assert the chosen winner). **Independently/adversarially inspected**: re-ran (114 green),
  re-read the code (confirmed the winner is `pickWinner`'s result, displayed directly — the animation cannot
  disagree). **Live Playwright QA**: the reel rolls and hides the winner mid-roll, pops a real winner after ~3s,
  Draw again replays to a new winner, reduced-motion reveals instantly with no reel, Leads unchanged.

## Blocked by

- **Slice 10 — Raffle: draw + reveal** (the reveal this animates).

> **Handoff note (do NOT pre-write):** craft this slice's `/handoff` **after Slice 10 has landed and been
> inspected, and after the `/prototype`** — it needs Slice 10's *real* Raffle-view structure/props and the
> prototype's *locked* motion parameters. Writing it now would brief against an API and a motion spec that don't
> exist yet.

## Disciplines

Build via **`/tdd`** (red → green → refactor, **one test at a time**; vertical tracer-bullet, never horizontal).
Follow `docs/working-agreements.md` **verbatim**, and these in full — a subagent MUST NOT skip them:

- **Never assume. Chase every bug to its ROOT CAUSE** — no band-aids, no "probably," no jumping to conclusions;
  reproduce → minimize → fix the actual cause; never blame the network or the model.
- **Test behavior through public interfaces, not implementation.** Assert the *outcome* (chosen winner revealed)
  via the injected `rng` (prior art: `src/App.scan.test.tsx`); the animation's frames are visual, QA'd live, not
  unit-asserted.
- **Durable Vitest/RTL tests for the outcome, PLUS live Playwright MCP QA** (non-headless) for the motion.
- Use the **`CONTEXT.md` glossary** verbatim (Lead, **Raffle**) in code, tests, and UI.
- Implement from a dedicated slice **`/handoff`** in **fresh context** (crafted per the handoff note above).
- **The orchestrator will independently and adversarially review** the result and its proof — re-running the
  suite, re-reading the code, and trying to break the claims (does the animation *ever* change the winner? does
  reduced-motion work?) — and will **never** trust the subagent's report alone. Report faithfully.
