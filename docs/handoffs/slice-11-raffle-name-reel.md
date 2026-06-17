# Handoff — Slice 11: Raffle gamified vertical name-reel

**Read first (verbatim):** `docs/working-agreements.md` (disciplines), `docs/issues/0011-raffle-name-reel-animation.md` (this slice), `docs/prd/raffle.md`, `CONTEXT.md` (Raffle).

Implement in a **fresh context** via `/tdd`. You are layering the **gamified reveal** onto Slice 10's working draw. **Read Slice 10's code first** — `src/RaffleOverlay.tsx`, `src/lib/raffle.ts` (`pickWinner`), `src/App.raffle.test.tsx`, and the `.raffle-overlay` styles in `src/App.css`. The draw + winner logic already work; you add the motion.

## The locked motion (from a `/prototype` the Vendor tuned — these are final)

Reference implementation of the feel: **`/tmp/raffle-reel-prototype.html`** (a throwaway mock — read it for the reel mechanics). The Vendor selected these exact parameters:

- **Duration: 3.0s**
- **Spin amount: 8 loops** (the reel scrolls through ~8 full passes of the names before settling)
- **Easing: easeOutExpo** → `cubic-bezier(.16, 1, .3, 1)`

Define them as named constants so they're easy to find/tune.

## What this slice delivers

When the Raffle is drawn, instead of an instant reveal: a **vertical name reel** rolls (the real Lead names
scrolling upward fast), **decelerates** over 3.0s with the easeOutExpo curve through ~8 loops, and **settles on
the winner**, which then **pops** to the big winner card (the existing `.raffle-winner` from Slice 10). **Draw
again** replays the roll to the next winner.

## The non-negotiable: pick-then-animate (fairness)

The winner is **still chosen first** by `pickWinner(leads, random)` (the injected RNG seam from Slice 10). The
reel is **choreography that lands on that pre-chosen winner** — the animation NEVER decides the winner. (In the
prototype: pick the winner, then build the strip so the winner sits at the landing position, then animate to it.)

## Accessibility: reduced motion

If `prefers-reduced-motion: reduce` is set, **skip the roll** and reveal the winner **instantly** (the Slice 10
behavior). Detect via `window.matchMedia('(prefers-reduced-motion: reduce)')`, injected/overridable so tests can
exercise both paths.

## Testability (this is the crucial design constraint)

The winner reveal now happens **after** the roll. Make it testable without real CSS transitions (jsdom won't
fire them):
- On draw: set `winner = pickWinner(leads, random)` immediately (known up front), start the reel, and reveal the
  winner card after **`duration`** via a timer (`setTimeout`) — NOT via `transitionend`.
- Tests use **`vi.useFakeTimers()`** and advance by the duration to assert the **revealed winner is the
  `random`-chosen one** (prior art for fake timers: `src/ScanOverlay.ergonomics.test.tsx`,
  `src/ScanOverlay.debounce.test.tsx`).
- Under reduced-motion, the winner reveals **immediately** (no timer) — test that path too.

**Migration:** Slice 10's `src/App.raffle.test.tsx` asserts the winner appears right after the Raffle tap. With
the reel, that reveal is now post-`duration` (or immediate under reduced-motion). **Update those tests** to
either advance fake timers or run under reduced-motion, so they still pass and reflect the new behavior. Keep
asserting the *chosen winner* (the fairness contract is unchanged).

## TDD cycle list (one test → minimal code each)

1. A reduced-motion draw reveals the `random`-chosen winner **instantly** (inject reduced-motion = true).
2. A normal draw reveals **nothing** until the duration elapses, then reveals the `random`-chosen winner
   (fake timers: assert no winner card before `duration`, the chosen winner after).
3. **Draw again** replays and reveals the next `random` value's winner (fake timers).
4. The winner is **always** the `pickWinner` result — assert via the injected `random` that the animation never
   changes it (e.g., scripted `random` → specific winner, regardless of timing).
5. Leads remain unchanged after draws (read-only — still holds).
6. (Update the migrated Slice 10 App tests to green under the new timing.)

Then refactor. The reel's visual motion (the actual scrolling) is **QA'd live**, not unit-asserted — assert the
*outcome* (chosen winner revealed) and the *timing/branch* (instant vs after-duration), not pixel positions.

## Do NOT
- Do not let the animation determine the winner — `pickWinner` decides; the reel lands on it.
- Do not change `pickWinner` or the injected `random` seam. Do not break read-only.
- No new dependency, no router. Keep it within `RaffleOverlay` + `App.css` (+ the reduced-motion seam).

## Live QA (the ORCHESTRATOR runs this on inspection)
Playwright MCP, non-headless: seed Leads, open Raffle, confirm the reel rolls ~3s and lands on a winner that
pops; Draw again replays; the revealed winner is a real Lead; reduced-motion emulation reveals instantly; Leads
unchanged. (Motion feel is a visual check; the chosen-winner correctness is asserted.)

## Acceptance criteria
See `docs/issues/0011-raffle-name-reel-animation.md`. Plus `npm test` all green, `tsc -b` + `npm run lint` clean.

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time. Behavior through public interfaces — assert the **outcome**
(chosen winner) and the **branch/timing**, not the animation frames. Glossary: Raffle / Lead. **Never assume;
chase bugs to ROOT CAUSE — no jumping to conclusions.** The orchestrator will **independently and adversarially
review** (re-run, re-read, drive the live reel, verify the animation can never change the winner) and will not
trust this report alone. Report faithfully, including any mis-step.

## Exact next action
1. `npm test` → confirm the current baseline is green.
2. Cycle 1: a failing test — reduced-motion draw reveals the chosen winner instantly. Red → green → continue.
3. Add the reel (constants: 3.0s, 8 loops, `cubic-bezier(.16,1,.3,1)`), the timer-based reveal, the reduced-motion
   branch; migrate Slice 10's App tests. Hand back to the orchestrator for live QA.
