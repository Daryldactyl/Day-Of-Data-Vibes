# Q&A Session — Raffle & Merge Grilling (round two)

**Skill:** `/grill-with-docs`
**Scope:** The two features added *after the first build shipped* (`spec_sheet.md` §10), from the organizers' feedback — **Raffle** (§10.1) and **Share/merge a teammate's list** (§10.2).
**Outcome docs:** `CONTEXT.md` (Raffle + Merge entries), `docs/adr/0004-merge-lists-chunked-qr.md`. PRDs to follow via `/to-prd`.

This is the raw record of the grilling — the questions, the recommendations, the answers chosen. It's the first grill of "round two": the original three features (Scan, Export, Badge Generator) were the brief we opened the build from; these two came from a stakeholder using the working app and asking for more.

---

## Raffle (§10.1)

### Q1 — Reveal: how is the winner shown?
**Asked:** Row-highlight in the Leads list, or a full-screen winner reveal? (Confirmed the framing first: Raffle is **ephemeral and non-destructive** — picks and shows a winner, persists nothing, alters no Leads.)

**Recommendation given:** A **full-screen reveal** of the winning Lead's card — matches the app's overlay idiom (Scan, Badge Generator), is unmistakable to a booth crowd, and gives a natural **Draw again** button.

**Answer:** Full-screen reveal — **and gamified.** The user wanted it to "feel like a raffle": names *rolling/cycling* before landing on the winner shown big. So suspense isn't optional polish; it's core. (This also resolved the separate "suspense?" branch.)

### Q2 — Re-roll: what happens on each Draw again?
**Asked:** Independent each press (with replacement, same person *can* recur) vs guarantee no immediate repeat.

**Recommendation given:** **Independent each press** — the fair, truthful raffle model, simplest; a legitimate repeat is rare past a handful of Leads.

**Answer:** **"Yes I agree with A"** — independent uniform-random each press, with replacement. Edges: disabled at 0 Leads; a 1-Lead list always wins; read-only (never adds/removes/reorders).

**Fairness note (baked in):** the **winner is chosen first by a fair random draw; the animation is choreography that lands on the pre-chosen winner** — not "wherever the wheel stops." Keeps it provably uniform and testable: the random source is **injected as a seam** (mirroring `createScanner` / `exportLeads` / `makeQrDataUrl`), so a test pins the winner deterministically — and it sidesteps the `react-hooks/purity` lint that flagged `Date.now()` on the scan debounce.

### Q3 — The animation: what kind of roll, and how to nail the feel?
**Asked:** A vertical name reel (slot-machine) vs a radial spinning wheel; and whether to `/prototype` the motion.

**Recommendation given:** **Vertical name reel** — reads instantly as "drawing a winner," reuses the real names (no wheel layout math), simplest to build well on a phone; the ease-out deceleration into the winner gives the suspense. **Prototype** the exact spin/duration/easing/pop before the TDD slice.

**Answer:** **"Yes I like A!"** — vertical name reel; prototype the motion. The draw logic (`pickWinner(leads, rng)`) gets TDD'd regardless; the prototype is just for the feel.

**No ADR** — nothing here is hard-to-reverse or surprising; pick-then-animate and independent draws are standard.

---

## Share / merge a teammate's list (§10.2)

### Q4 — How does a list travel between phones? (the key fork)
**Asked:** File/share-sheet import vs single QR vs chunked QR. Insight surfaced: **the "share" half already exists** — Export already builds a CSV and hands it off via the share sheet, so the only genuinely new work is the **Import** side + the existing dedup.

**Recommendation given:** **(A) File / share-sheet import**, reusing the export CSV as the interchange format — lowest effort, any size, reuses Export's share + ADR-0002 dedup, scanner untouched.

**Answer:** The user chose **(C) chunked QR** instead — deliberately paying for the in-app QR experience over the lower-effort file route. They proposed chunking K Leads per code up to N codes and scrolling through them.

### Q5 — The chunked-QR model
**Asked:** Show all codes as a scrollable stack the receiver scans one-by-one, vs an auto-cycling carousel; and explicit sign-off on the two taxes.

**Recommendation given:** **Scrollable stack, receiver-paced** — sender renders M codes (each stamped transfer-id + "chunk *i* of *M*"), receiver scans each with a live "imported *i* of *M*" progress count until complete, then merges. Deterministic; an auto-cycling carousel drops frames at a loud booth. **Taxes:** (1) a **second scan mode** distinct from vCard-badge scanning (import payload clearly marked so it can't be confused with a badge); (2) **scan-count scales** with list size (~1 code / 20–25 Leads).

**Answer:** **"Yes! This sounds great"** — chunked QR, scrollable indexed stack, receiver-paced with progress; both taxes accepted.

### Q6 — Merge rules
**Asked:** How to combine an imported list with your own.

**Recommendation given:** Run each incoming Lead through the existing **`addLead`** (ADR-0002): de-dupe by **normalized email** (existing Leads win), **preserve each new Lead's original `scannedAt`**, append new ones, skip dupes; share the **whole list**; **non-destructive**; show an **"imported N new (P already had)"** summary.

**Answer:** **"Yes exactly the above."**

### Q7 — Privacy affordance & ADR
**Asked:** Put friction on it (a consent note) or keep it frictionless; and record the transport decision as an ADR?

**Recommendation given:** **(A) Frictionless** — it's the booth's own staff sharing the Leads they collected; the privacy rationale belongs in the record, not a tap-through. And **write one ADR** for the chunked-QR / peer-to-peer / no-central-store decision (it's hard-to-reverse, surprising, and a real trade-off — and gives §10.3's "no central DB" a permanent home).

**Answer:** **"Yes A"** — frictionless; ADR recorded as **ADR-0004**.

---

## Net decisions (summary)

| # | Decision | Where recorded |
|---|----------|----------------|
| 1 | Raffle: full-screen, **gamified** reveal | this file, PRD |
| 2 | Raffle: **vertical name reel**, ease-out, pop the winner; prototype the feel | this file, PRD |
| 3 | Raffle: **pick-then-animate** (fair RNG decides; injected seam → testable) | this file, PRD |
| 4 | Raffle: **independent** draw each press; read-only; disabled at 0 Leads | CONTEXT.md, PRD |
| 5 | Merge: **chunked QR**, scrollable indexed stack, receiver-paced with progress | ADR-0004, PRD |
| 6 | Merge: reuse **`addLead`** email dedup (existing wins, incoming `scannedAt` kept); non-destructive; import summary | ADR-0004, CONTEXT.md, PRD |
| 7 | Merge: **frictionless**, **peer-to-peer, no central store** (central DB declined, spec §10.3) | ADR-0004 |

**Next step:** `/to-prd` — two PRDs under `docs/prd/` (Raffle is small; Merge is substantial), then `/to-issues`, with a `/prototype` of the Raffle reel motion, then `/handoff` → `/tdd` per slice. The chunked-QR protocol (chunk encode/decode/reassemble) is pure logic to TDD; the camera import is live-QA'd (Playwright + a real second phone).
