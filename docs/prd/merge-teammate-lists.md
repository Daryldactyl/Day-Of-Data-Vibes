# PRD — Merge a teammate's list

**Status:** ready to build
**Scope:** The Merge feature — combining another Vendor's collected Leads into your own, peer-to-peer via chunked QR codes (no server, no central store), de-duplicated by email. A sender shows the list as a scrollable stack of QR codes; a receiver scans them and merges.
**Sources:** `spec_sheet.md` (§10.2, §10.3), `CONTEXT.md`, `docs/qa-sessions/raffle-and-merge-grilling.md`, `docs/adr/0004-merge-lists-chunked-qr.md`, `docs/adr/0002-dedupe-leads-by-email.md`, `docs/adr/0001-vcard-badge-payload.md`
**Vocabulary:** Uses the project glossary in `CONTEXT.md` — Attendee, Vendor, Badge, Scan, Lead, Merge.

---

## Problem Statement

Several staff often work one sponsor booth, each scanning Attendees on their **own** phone, so each ends the day with a **separate** list of Leads. They want to walk away with **one combined, de-duplicated list** — and to run **one fair Raffle** over everyone the booth met, not just the people one phone happened to scan. Today they'd export each phone's CSV and hand-merge them in a spreadsheet later. They want the phones to do it for them, on the spot — **without** standing up a server or a central database of attendee contacts (the organizers explicitly flagged the PII baggage of a central store, and the whole app is deliberately local-only).

## Solution

Two new views let one phone hand its Leads to another, entirely on-device:

- The **sender** opens **"Show my list as codes."** The app splits the Leads into chunks and renders them as a **scrollable stack of QR codes**, each labelled (e.g. "code 2 of 5").
- The **receiver** opens **"Import a list"** and scans those codes one by one. A live **"imported 2 of 5"** progress readout shows what's been captured and what's still missing; scanning the same code twice does nothing; codes from a different transfer are ignored.
- When all the codes are in, the receiver's app **merges** the incoming Leads into its own list — **de-duplicating by email exactly as a single phone already does** (existing Leads win; genuinely new people are added with their original scan time) — and shows a summary: **"Imported 12 new Leads (8 already on your list)."**

Nothing leaves the two phones; there's no account, no upload, no shared database. The data moves device-to-device by camera and stays local. Afterward the receiver can Export the combined list, or Raffle over it.

## User Stories

1. As a Vendor sharing my list, I want a **"Show my list as codes"** view, so that a teammate can pull my Leads onto their phone.
2. As a Vendor, I want my Leads split into **as many QR codes as needed**, so that a full day's list isn't limited by what fits in one code.
3. As a Vendor, I want each code **clearly labelled** ("code 3 of 5"), so that my teammate and I can tell what's been scanned and what's left.
4. As a Vendor, I want the codes in a **scrollable stack** I can page through at my own pace, so that my teammate can scan each one deliberately.
5. As a receiving Vendor, I want an **"Import a list"** view that uses my camera, so that I can scan a teammate's codes.
6. As a receiving Vendor, I want a **live "imported N of M" progress** count, so that I know how far along the transfer is.
7. As a receiving Vendor, I want to see **which codes I still need**, so that I can finish a partial transfer instead of starting over.
8. As a receiving Vendor, I want scanning the **same code twice to be harmless**, so that I don't double-import anyone.
9. As a receiving Vendor, I want codes from a **different transfer ignored**, so that two teammates sharing nearby don't corrupt my import.
10. As a receiving Vendor, I want the import to **merge into my existing Leads**, so that I end with one combined list, not a replacement.
11. As a receiving Vendor, I want incoming Leads **de-duplicated by email** against my list, so that people we both scanned don't show up twice.
12. As a receiving Vendor, I want a newly-imported Lead to keep **its original scan time**, so that the record reflects when they were actually met, not when I imported them.
13. As a receiving Vendor, I want import to be **non-destructive** — it only ever adds — so that nothing I already collected is lost or changed.
14. As a receiving Vendor, I want a **summary when it's done** ("12 new, 8 already had"), so that I know the merge worked and by how much.
15. As a Vendor, I want the import scan to **only accept list codes** and not mistake them for a Badge (and the Badge Scanner to ignore list codes), so that the two scan modes never cross wires.
16. As a Vendor, I want the whole exchange to stay **on our two phones — no server, no account, no upload**, so that we don't create a central store of attendee contacts.
17. As a Vendor, I want the share to be **frictionless** (no consent gate), since it's our own booth's staff sharing the Leads we collected.
18. As a Vendor, after merging I want to **Export or Raffle the combined list**, so that the whole point — one list, one fair draw — actually pays off.
19. As a Vendor at a booth with **one phone**, I want this feature to simply not get in my way, so that the single-phone flow is unchanged.

## Implementation Decisions

- **Transport: chunked QR, peer-to-peer (ADR-0004).** Chosen over a central database (declined, §10.3 — server + PII), a single QR (caps at ~30–50 Leads), and a file/AirDrop import (lower-effort but off-brand and clunky cross-device); we pay for the in-app QR experience deliberately.
- **The protocol is pure logic.** A small set of pure functions carries the real work:
  - **`encodeListChunks(leads, transferId, chunkSize)`** → an ordered list of payload strings, one per QR code. Each payload carries a **distinct format marker**, the **transfer id**, the **chunk index and total**, and that chunk's slice of Leads. `chunkSize` ≈ 20–25 Leads per code (tunable).
  - **`decodeChunk(text)`** → a chunk, or **null** if the scanned text isn't a list payload (so a vCard Badge or any other QR is cleanly rejected).
  - **`reassembleChunks(chunks)`** → progress `{ have, total, missing, complete }` and, when complete, the assembled Leads. Idempotent by index; the transfer id guards against mixing two transfers.
  - **`mergeLeads(existing, incoming)`** → folds each incoming Lead through the existing **`addLead`** (ADR-0002): de-dupe by normalized email (existing wins), append genuinely-new Leads **with their original `scannedAt`**, non-destructive; returns counts `{ added, skipped }` for the summary.
- **`transferId` is passed in.** Generated from an injected capability (default random), the same injection style as the RNG/clock seams, so transfers are deterministic under test.
- **Marker keeps the two scan modes apart (ADR-0001).** Badges stay vCard-only; the import payload's format marker is distinct, so the Badge Scanner's `parseVCard` rejects import codes and `decodeChunk` rejects vCards. No tolerant cross-parsing.
- **Reused capabilities, minimal new surface.** The **sender** renders the chunk strings as QR images via the existing **`makeQrDataUrl`**; the **receiver** uses the existing **`createScanner`**, routing decodes to `decodeChunk`/`reassemble` instead of `handleScan` — that routing *is* the "second scan mode." Only one genuinely new injected capability (`makeTransferId`).
- **Two views, toggled by state.** A sender view (scrollable QR stack + "code i of M" labels) and a receiver view (camera + "imported i of M" progress + missing-codes hint + completion summary), shown/hidden via App state like the other overlays — no router. Entry points sit with the list-sharing actions (near Export).
- **Frictionless & local.** No consent gate; no server, account, upload, or central store. The privacy rationale lives in ADR-0004, not the UI.

## Testing Decisions

- **Test behavior through public interfaces.** Assert what the pure protocol functions return for given inputs and what the views do for given decodes — never internal chunk structure beyond the public contract.
- **The pure protocol is the primary unit under test (new).** Cases:
  - `encodeListChunks` → splits N Leads into ⌈N/chunkSize⌉ codes, each carrying the marker, transfer id, correct index/total, and its Leads; round-trips: decode+reassemble of all emitted chunks reproduces the original Leads in order.
  - `decodeChunk` → a valid payload yields its chunk; a **vCard string** and arbitrary junk yield **null** (the badge/non-badge boundary).
  - `reassembleChunks` → partial input reports the right `have`/`total`/`missing`; **out-of-order** chunks reassemble correctly; a **duplicate index** is idempotent; a **foreign transfer id** is ignored; the complete set yields the assembled Leads.
  - `mergeLeads` → de-dupes by normalized email (existing wins), preserves incoming `scannedAt` for new Leads, is non-destructive, and reports correct `{ added, skipped }`. Prior art: `src/lib/exportCsv.test.ts` (pure assembly), `src/lib/scan.test.ts` / `src/lib/leads.test.ts` (dedup), `src/lib/vcard.test.ts` (encode/decode round-trip).
- **Views via the existing injected seams.** Sender: with a fake `makeQrDataUrl` + fixed `makeTransferId`, N Leads render the expected number of codes with correct labels. Receiver: with a fake `createScanner` feeding chunk strings, progress advances, a duplicate/foreign code is handled, completion merges and shows the summary; feeding a **vCard** in import mode is rejected (not a chunk). Prior art: `src/App.scan.test.tsx`, `src/App.export.test.tsx`, `src/BadgeGenerator.test.tsx`.
- **Live QA.** Playwright MCP injects chunk payloads via a DEV scan seam (like `__scanBadge`) to drive the receiver end-to-end (progress → merge → summary), and confirms the sender renders a real scrollable QR stack. The **true camera-to-camera transfer is verified on a real second phone** over the `npm run share` tunnel — the one thing a headless browser can't prove (mirrors the Badge round-trip + the Export real-phone checks).

## Out of Scope

- **A central database / server-synced shared list** — explicitly declined (§10.3, ADR-0004); peer-to-peer is the chosen alternative.
- **File / AirDrop import and single-QR transport** — considered and rejected in ADR-0004.
- **Two-way sync** — import is **one-way** (the receiver pulls a copy); the sender's list is unaffected.
- **Selecting a subset to share** — the whole current list is shared.
- **Compression or large-scale optimization** beyond chunking — chunk size is tuned, not engineered for thousands.
- **A merge-conflict UI** — "existing wins" is automatic (reusing `addLead`); there's no per-conflict prompt.
- **Editing or de-duping across phones after the fact on a server** — everything stays on-device.

## Further Notes

- This PRD is intentionally local (`docs/prd/`), matching the other PRDs and the ADRs — no issue tracker is used for this project.
- This is a **round-two** feature (added after the first build shipped, from organizer feedback — `spec_sheet.md` §10.2/§10.3); its story is told in `docs/walkthrough/07-round-two-evolving-the-app.md`.
- The one hard-to-reverse decision (chunked-QR, peer-to-peer, no central store) is recorded as **ADR-0004**; it reuses **ADR-0002** (email dedup) and respects **ADR-0001** (Badges stay vCard-only, so the import payload must be a distinct, clearly-marked format).
- Build order suggestion: TDD the pure protocol first (`encodeListChunks` → `decodeChunk` → `reassembleChunks` → `mergeLeads`, with the round-trip as the anchor test), then the sender view (reuse `makeQrDataUrl`), then the receiver view (reuse `createScanner` in import mode, with progress + summary), each on the existing injected seams. Verify live with Playwright MCP and a real second phone.
- Pairs with **Raffle**: merge the table's lists into one, then raffle the combined pool for a single fair draw.
