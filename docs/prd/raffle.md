# PRD — Raffle

**Status:** ready to build
**Scope:** The Raffle feature — a Vendor-triggered random draw that picks one collected Lead as the prize winner, with a gamified full-screen reveal, re-rollable as often as the Vendor likes. A third action on Home (Scan · Export · Raffle).
**Sources:** `spec_sheet.md` (§10.1), `CONTEXT.md`, `docs/qa-sessions/raffle-and-merge-grilling.md`
**Vocabulary:** Uses the project glossary in `CONTEXT.md` — Attendee, Vendor, Lead, Raffle.

---

## Problem Statement

A Vendor has spent the day scanning Attendees and now has a list of Leads in the app. At the booth they want to run a **prize raffle** — pick one of those people at random as the winner — and do it *from the app*, since the list already lives there. Doing it by hand (scribbling names on paper, picking blindly) is clumsy, hard to make look fair to a watching crowd, and no fun. They want a single button that draws a random winner, makes a little moment of it, and can be pressed again and again (the first winner already left; let's draw another; let's do a second prize).

## Solution

The Home screen gains a third button beside **Scan** and **Export**: **Raffle**. With at least one Lead collected, tapping Raffle opens a full-screen draw: the collected names **roll past like a reel**, decelerate, and **land on a randomly chosen winner**, shown big and center with their name and email. A **Draw again** button re-rolls to a fresh random winner; a **Done** button returns to the list. With zero Leads the button is disabled (nothing to draw). The draw is purely for show-and-pick — it **never changes the Leads**: no one is removed, nothing is recorded, and you can draw all night.

## User Stories

1. As a Vendor, I want a **Raffle** button on Home beside Scan and Export, so that I can run the booth's prize draw from the same app that holds the Leads.
2. As a Vendor, I want tapping Raffle to **pick one Lead at random** as the winner, so that the draw is fair and effortless.
3. As a Vendor, I want the winner shown **full-screen, big and clear** (name + email), so that everyone crowded around the booth can see who won.
4. As a Vendor, I want the draw to **feel like a raffle** — names rolling and landing on the winner — so that it's a fun moment, not just text appearing.
5. As a Vendor, I want a **Draw again** button, so that I can re-roll (the winner left, or I'm drawing a second prize) without leaving the screen.
6. As a Vendor, I want each press to be an **independent random draw**, so that every draw is fair on its own (the same person *can* come up again — that's honest randomness).
7. As a Vendor, I want the draw to be **truly uniform** across my Leads, so that no one is more or less likely to win than anyone else.
8. As a Vendor, I want the Raffle to **never alter my Leads** (no removal, no reordering, nothing saved), so that I can draw as many times as I like and still have my full, intact list to export.
9. As a Vendor with **no Leads yet**, I want the Raffle button **disabled**, so that I'm not handed an empty or broken draw.
10. As a Vendor with **exactly one Lead**, I want that person to win, so that the feature still behaves sensibly at the edge.
11. As a Vendor, I want a clear way to **leave the draw** and get back to my Leads list, so that I'm never stuck on the raffle screen.
12. As a Vendor, I want the rolling animation to **settle quickly** (a couple of seconds), so that the booth keeps moving.
13. As an onlooker at the booth, I want the reveal to be **unambiguous**, so that there's no doubt about who the winner is.
14. As a Vendor, I want the winner the animation lands on to be the **actual randomly-chosen** winner (not "wherever the reel happened to stop"), so that the result is genuinely fair, not theater pretending to be fair.

## Implementation Decisions

- **Pick-then-animate.** A pure `pickWinner(leads, rng)` chooses the winner *first* by a uniform-random draw over the current Leads; the reel animation is **choreography that lands on that pre-chosen winner**. Fairness lives in the pure function, not in where an animation stops. This is the core (and only) real logic.
- **Random source is injected.** The randomness is supplied as a capability (default the platform RNG), passed into the draw the same way `scannedAt` is passed to `addLead` and the way `createScanner` / `exportLeads` / `makeQrDataUrl` are injected into the app. This makes the winner deterministic under test and keeps the draw out of the component's render purity (the same `react-hooks/purity` concern that affected the scan clock).
- **Independent draws (with replacement).** Each press is a fresh uniform pick over all current Leads; the previous winner is eligible again. No "avoid immediate repeat" special-casing.
- **Full-screen reveal, toggled by state.** A Raffle view is shown/hidden via an App state flag, the same overlay pattern as Scan and the Badge Generator — no router. It contains the rolling reel, the big winner card, a **Draw again** action (re-invokes the draw), and a **Done** action (returns to Home).
- **The reel.** A vertical name reel that cycles the *actual* Lead names, fast then decelerating (ease-out) to settle on the winner, which then pops to full size. The exact spin/duration/easing/pop is tuned via `/prototype` before the build; it is presentation only and carries no decision logic.
- **Placement & edges.** A third button in Home's action row (Scan · Export · Raffle), **disabled at 0 Leads**; a 1-Lead list always yields that Lead.
- **Read-only / non-destructive.** The Raffle reads the current Leads and never mutates, reorders, removes, persists, or clears anything.
- **No new ADR.** Nothing here is hard-to-reverse or surprising; pick-then-animate and independent draws are standard (recorded as a deliberate "no ADR" in the grill).

## Testing Decisions

- **Test behavior through public interfaces, not the animation.** Assert *which* Lead `pickWinner` returns for a given injected `rng`, and that the reveal shows that Lead — never the reel's internal frames.
- **`pickWinner(leads, rng)` is the primary unit under test (new, pure).** Cases: a deterministic `rng` selects the expected index/Lead; the result is always one of the input Leads; a single-Lead list returns that Lead; coverage that the selection spans the whole list (no off-by-one excluding the first/last); define and test the empty-list contract (the button disables at 0, but the function's behavior is pinned). Prior art: `src/lib/leads.test.ts`, `src/lib/scan.test.ts` (pure in/out, explicit edge cases).
- **Raffle view via injected `rng` (existing seam pattern).** Through App/component render tests (prior art: `src/App.scan.test.tsx`, `src/App.export.test.tsx`): the Raffle button is **disabled at 0 Leads** and enabled at ≥1; tapping it reveals the `rng`-chosen winner; **Draw again** triggers another draw (a new `rng` value → the next winner); Leads are unchanged after any number of draws.
- **The reel animation is QA'd, not unit-asserted.** Tuned via `/prototype`, then exercised with live Playwright MCP (seed Leads, open Raffle, draw) to confirm it rolls and reveals; the *feel* is a visual check, the *winner* is the asserted part.

## Out of Scope

- **Recording winners / draw history** — the Raffle is ephemeral; nothing is saved.
- **Removing the winner from the pool / draw-without-replacement** — every draw is independent with replacement; we don't "use up" winners.
- **Multiple winners at once, weighting, or tiers** — one uniformly-random winner per press.
- **Raffling across multiple phones** — a single phone draws from its own Leads; combining lists first is the **Merge** feature's job (see `docs/prd/merge-teammate-lists.md`), after which the Raffle naturally covers the combined list.
- **Persisting or exporting the draw result** — Export is unchanged and unrelated.

## Further Notes

- This PRD is intentionally local (`docs/prd/`), matching the other PRDs and the ADRs — no issue tracker is used for this project.
- This is a **round-two** feature (added after the first build shipped, from organizer feedback — `spec_sheet.md` §10.1); its story is told in `docs/walkthrough/07-round-two-evolving-the-app.md`.
- Build order suggestion: `/prototype` the reel motion to lock the feel, then TDD the pure `pickWinner` (fairness + edges), then the Raffle view (draw → reveal → Draw again) on the injected `rng` seam, then the Home button (disabled at 0). Verify live with Playwright MCP.
- Pairs with **Merge**: merge a teammate's list first, then raffle the combined pool for one fair table-wide draw.
