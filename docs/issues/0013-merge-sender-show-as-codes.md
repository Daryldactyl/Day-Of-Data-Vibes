# Slice 13 — Merge: sender "Show my list as codes"

**Type:** AFK
**PRD:** `docs/prd/merge-teammate-lists.md`
**ADR:** `docs/adr/0004-merge-lists-chunked-qr.md`

## What to build

The **sender** half of Merge: a "Show my list as codes" view that turns the Vendor's current Leads into a
**scrollable stack of QR codes** so a teammate can scan them. It uses Slice 12's `encodeListChunks` to produce
the payload strings, renders each as a QR image via the existing **`makeQrDataUrl`**, and labels each
**"code *i* of *M*"**. The transfer id comes from an **injected `makeTransferId`** capability (default random),
so a transfer is deterministic under test. Read-only — sharing alters no Leads.

## Acceptance criteria

- [x] A "Show my list as codes" view renders ⌈N/chunkSize⌉ QR images (via the injected `makeQrDataUrl`) in a
      **scrollable stack**, each labelled "code *i* of *M*".
- [x] It uses Slice 12's `encodeListChunks`; the transfer id comes from an injected `makeTransferId` (default
      random), deterministic under test.
- [x] Sensible **empty behavior at 0 Leads** (nothing to share).
- [x] An entry point sits with the list-sharing actions; a way back to Home; **read-only** (alters no Leads).
- [x] Durable Vitest/RTL tests: N Leads → the expected number of codes + correct labels (inject a fake
      `makeQrDataUrl` + a fixed `makeTransferId`). A live Playwright MCP QA pass opens the view and confirms the
      scrollable QR stack renders.
- [x] `npm test` all green, `tsc -b` + `npm run lint` clean.

## Implementation notes (Slice 13)

- **New seam** `src/transferId.ts` — `MakeTransferId = () => string` + `defaultMakeTransferId` (random id);
  injected into `App` (default real) like `makeQrDataUrl`. Generated **once** via a lazy `useState` initializer in
  the view (never inline in render → no purity lint).
- **Component** `src/ShareListView.tsx` — computes one transfer id, `encodeListChunks(leads, id,
  DEFAULT_CHUNK_SIZE)`, generates a QR data URL per chunk via the reused `makeQrDataUrl` (in an effect, with a
  cancel guard), and renders a scrollable `.share-stack` of cards each labelled **"Code i+1 of M"** (1-based).
  Full-screen, Done returns. Read-only. Footer entry "Show my list as codes" (beside "Make a badge"), disabled at
  0 Leads.
- **Verified + a real finding (chased, not hand-waved):** built by a subagent via TDD (8 tests). **Independently
  inspected**: re-ran (109 green), re-read the code, and **decoded a real rendered QR's pixels** (jsQR) → a small
  chunk round-tripped to a valid `ListChunk` with the seeded Leads (encoding/rendering **proven correct**).
  **However**, a 20-Lead chunk is **1,881 bytes** (~160-module QR) and would not decode at the reused **320px**
  render size. Probing chunk sizes 6/8/10/12/14/16/20 gave **non-monotonic** jsQR results — i.e. jsQR-from-a-320px
  PNG is a **flaky proxy** for real scannability (alignment-sensitive), so the exact scannable chunk size **cannot
  be settled here**. The encoding is right; the **density/scannability tuning is deferred to Slice 0014's
  real-phone QA** (see its note). `DEFAULT_CHUNK_SIZE` deliberately left unchanged — no guessing from noisy data.
- Implemented from `docs/handoffs/slice-13-merge-sender-show-as-codes.md`.

## Blocked by

- **Slice 12 — Merge: chunk protocol + merge** (provides `encodeListChunks` and the payload shape).

> **Handoff note (do NOT pre-write):** craft this slice's `/handoff` **after Slice 12 has landed and been
> inspected** — it needs the *real* `encodeListChunks(leads, transferId, chunkSize)` signature and the actual
> payload string shape the subagent produced, plus the real `makeTransferId` seam name.

## Disciplines

Build via **`/tdd`** (red → green → refactor, **one test at a time**; vertical tracer-bullet, never horizontal).
Follow `docs/working-agreements.md` **verbatim**, and these in full — a subagent MUST NOT skip them:

- **Never assume. Chase every bug to its ROOT CAUSE** — no band-aids, no "probably," no jumping to conclusions;
  reproduce → minimize → fix the actual cause; never blame the network or the model.
- **Test behavior through public interfaces, not implementation** (tests survive refactors). Reuse the existing
  injected **`makeQrDataUrl`** seam (prior art: `src/BadgeGenerator.test.tsx`, `src/badgeQr.ts`); the new
  `makeTransferId` is injected the same way.
- **Durable Vitest/RTL tests for everything verified, PLUS live Playwright MCP QA** (non-headless).
- Use the **`CONTEXT.md` glossary** verbatim (Lead, **Merge**) in code, tests, and UI. Respect **ADR-0004**.
- Implement from a dedicated slice **`/handoff`** in **fresh context** (crafted per the handoff note above).
- **The orchestrator will independently and adversarially review** the result and its proof — re-running the
  suite, re-reading the code, and trying to break the claims — and will **never** trust the subagent's report
  alone. Report faithfully, including any mis-step.
