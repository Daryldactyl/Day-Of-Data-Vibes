# Slice 14 — Merge: receiver "Import a list" + merge + summary

**Type:** AFK
**PRD:** `docs/prd/merge-teammate-lists.md`
**ADR:** `docs/adr/0004-merge-lists-chunked-qr.md` (reuses `docs/adr/0002-dedupe-leads-by-email.md`; respects `docs/adr/0001-vcard-badge-payload.md`)

## What to build

The **receiver** half of Merge: an "Import a list" view that scans a teammate's QR codes and merges them. It
uses the existing **`createScanner`** in an **import mode** — decodes are routed to Slice 12's `decodeChunk` /
`reassembleChunks` (the "second scan mode"), **not** the Badge `handleScan` path. It shows live progress
**"imported *i* of *M*"** and which chunk indices are still missing; a duplicate or foreign-transfer code is
handled per Slice 12; a **vCard Badge scanned here is ignored** (it's not a chunk). When all chunks are in, it
**merges** via `mergeLeads` into the receiver's Leads, **persists**, the Home list reflects the combined,
de-duplicated list, and a summary shows **"Imported N new Leads (P already had)."** Non-destructive; one-way
(the sender's list is untouched).

## Acceptance criteria

- [x] An "Import a list" view scans codes with the camera; decodes are routed to `decodeChunk`/`reassembleChunks`
      (import mode), **not** the Badge `handleScan` path.
- [x] Live **"imported *i* of *M*"** progress; shows which chunk indices are still **missing**; duplicate /
      foreign-transfer codes are handled per Slice 12 (idempotent / ignored).
- [x] A **vCard Badge** scanned in import mode is **ignored** (`decodeChunk` → `null`) — never confused with a
      chunk (ADR-0001).
- [x] On completion: `mergeLeads` merges the incoming Leads into the receiver's Leads and **persists**
      (localStorage); Home reflects the combined, email-de-duplicated list; a **summary** shows "Imported N new
      Leads (P already had)."
- [x] **Non-destructive**; **one-way** (the sender's own list is unaffected).
- [x] Durable Vitest/RTL tests via an injected `createScanner` feeding chunk strings: progress advances,
      duplicate/foreign codes handled, a vCard is rejected, completion merges + shows the summary. A **DEV scan
      seam** (`__importChunk`) is exposed for Playwright.
- [x] `npm test` all green, `tsc -b` + `npm run lint` clean.
- [ ] **Verified on real hardware (pending the Vendor's 2nd phone):** Phone A shows the codes, Phone B scans them
      over `npm run share` → confirm they **scan reliably** at 9/chunk + the 680px QR and the list merges. (The
      orchestrator already proved the full loop in-browser on real QR pixels; this is the camera-to-camera step.)

## Implementation notes (Slice 14) — basic Merge complete

- **Receiver** `src/ImportListView.tsx` — `createScanner` in **import mode**: each decode → `decodeChunk` (null →
  ignored, so vCard/junk/foreign drop) → accumulate → `reassembleChunks` → progress "Imported i of total" +
  "Still need: …"; on `complete` → `mergeLeads` (ADR-0002) → `onLeadsChange` + `saveLeads` + summary "Imported N
  new (P already had)". One-shot via `doneRef`. Camera lifecycle + **graceful failures** (diagnose + error card +
  Retry) mirror `ScanOverlay`. DEV seam `__importChunk`. App "Import a list" footer entry.
- **Tuning:** `DEFAULT_CHUNK_SIZE` 20 → **9**; new `defaultMakeListQrDataUrl` at **680px** for the sender's list
  codes (badge QR stays 320px).
- **Verified (independent + adversarial):** 126 tests green, tsc + lint clean. **Full in-browser loop on real QR
  pixels**: the sender's 680px codes all **decode** (the 320px density failure is resolved), a vCard fed to
  import is **ignored**, out-of-order + duplicate chunks reassemble, merge deduped (shared email skipped) →
  **"Imported 11 new Leads (1 already had)"**, Home = 14. **Review caught a gap** the subagent honestly flagged:
  `scanner.start()` floated its rejection with no error UI — added the graceful-failure path **test-first** (no
  more console error; error card + Retry in headless).
- Real camera-to-camera scannability is the Vendor's pending 2nd-phone step.

## Blocked by

- **Slice 12 — Merge: chunk protocol + merge** (provides `decodeChunk` / `reassembleChunks` / `mergeLeads`).
  Pairs with **Slice 13** (the sender it scans from).

> **Handoff note (do NOT pre-write):** craft this slice's `/handoff` **after Slice 12 has landed and been
> inspected** — it needs the *real* `decodeChunk` / `reassembleChunks` / `mergeLeads` signatures + return shapes
> and the DEV-seam design. This is the **largest** slice; if it proves too big at handoff time, split it
> (scan + progress vs merge + summary) then.

> **⚠️ Density/scannability tuning (carried from Slice 0013):** the QR codes the sender renders must actually be
> **scannable by this receiver on real hardware**. Slice 0013's inspection measured a 20-Lead chunk at **1,881
> bytes** (~160-module QR) — too dense at the reused **320px** render — and found jsQR-from-a-PNG to be a **flaky
> proxy** (non-monotonic across sizes), so the real call needs phones. **This slice owns that decision:** during
> the **real-second-phone QA**, test scannability across realistic list sizes and **tune `DEFAULT_CHUNK_SIZE`
> (in `src/lib/listTransfer.ts`) and/or the sender's QR render size** until codes scan reliably end-to-end. Do
> NOT finalize a chunk size from headless jsQR alone — measure on real cameras.
>
> **Decision (Vendor):** target **8–10 Leads per chunk** AND **maximize the QR render size** for the viewing
> screen (render the sender's codes larger than the 320px badge QR — as large as comfortably fits, so a scanning
> phone has plenty of pixels per module). Confirm both scan reliably on **real phones** during this slice's QA;
> adjust within 8–10 if needed.

## Disciplines

Build via **`/tdd`** (red → green → refactor, **one test at a time**; vertical tracer-bullet, never horizontal).
Follow `docs/working-agreements.md` **verbatim**, and these in full — a subagent MUST NOT skip them:

- **Never assume. Chase every bug to its ROOT CAUSE** — no band-aids, no "probably," no jumping to conclusions;
  reproduce → minimize → fix the actual cause; never blame the network or the model. (The camera path is where
  this bites — recall the `qr-scanner` masking bug found only by live QA.)
- **Test behavior through public interfaces, not implementation** (tests survive refactors). Reuse the existing
  injected **`createScanner`** seam, routing decodes to the import logic (prior art: `src/App.scan.test.tsx`,
  `src/ScanOverlay.tsx`).
- **Durable Vitest/RTL tests for everything verified, PLUS live Playwright MCP QA** (non-headless), **and a
  real-device** check over the `npm run share` tunnel for the actual camera-to-camera transfer — necessary
  because a headless browser can't prove the camera path (same reason the Badge round-trip + Export share were
  phone-verified).
- Use the **`CONTEXT.md` glossary** verbatim (Lead, **Merge**, Scan, Badge) in code, tests, and UI. Respect
  **ADR-0004** (chunked-QR, peer-to-peer), **ADR-0002** (email dedup — via `mergeLeads`), **ADR-0001** (the
  import payload is a distinct, marked format, never a vCard).
- Implement from a dedicated slice **`/handoff`** in **fresh context** (crafted per the handoff note above).
- **The orchestrator will independently and adversarially review** the result and its proof — re-running the
  suite, re-reading the code, driving the live import end-to-end, and trying to break the claims (partial
  transfers, dup/foreign codes, a vCard in import mode, a real two-phone transfer) — and will **never** trust
  the subagent's report alone. Report faithfully, including any mis-step.
