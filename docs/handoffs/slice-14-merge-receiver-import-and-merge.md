# Handoff — Slice 14: Merge receiver "Import a list" + merge + summary

**Read first (verbatim):** `docs/working-agreements.md`, `docs/issues/0014-merge-receiver-import-and-merge.md` (this slice — note the density decision), `docs/prd/merge-teammate-lists.md`, `docs/adr/0004-merge-lists-chunked-qr.md`, `docs/adr/0002-dedupe-leads-by-email.md`, `docs/adr/0001-vcard-badge-payload.md`, `CONTEXT.md` (**Merge**).

Implement in a **fresh context** via `/tdd`. This is the **receiver** — the last slice that makes Merge work end-to-end. Slices 0012 (protocol) and 0013 (sender) are **DONE and merged**; you build on their real, shipped APIs.

## Where things stand — the real APIs you build on

`src/lib/listTransfer.ts` (Slice 12, shipped):
```
export interface ListChunk { transferId: string; index: number; total: number; leads: Lead[] }
export function decodeChunk(text: string): ListChunk | null      // null for a vCard/junk (the badge boundary)
export function reassembleChunks(chunks: ListChunk[]): { have, total, missing, complete, leads }  // empty-safe; first chunk's id is active; foreign ids ignored; idempotent by index
export function mergeLeads(existing: Lead[], incoming: Lead[]): { merged, added, skipped }  // reuses addLead (ADR-0002)
export const DEFAULT_CHUNK_SIZE = 20   // ← you will change this (see "Tuning" below)
```
Camera + scanner patterns to mirror — **read these**: `src/ScanOverlay.tsx` (the `createScanner` lifecycle:
start/stop/destroy, `diagnoseCamera` on failure, error UI, and the **`window.__scanBadge` DEV seam**),
`src/scanner.ts` (`defaultCreateScanner`, the `CreateScanner` type), `src/lib/leadsStorage.ts`
(`loadLeads`/`saveLeads`), `src/App.tsx` (overlay toggles, `leads` state, and the **"Show my list as codes"**
footer entry — the receiver entry sits beside it).

## What this slice delivers

An **"Import a list"** view that scans a teammate's QR codes and merges them into the receiver's own Leads:
- Uses the existing **`createScanner`** in **import mode** — each decode is routed to `decodeChunk` /
  `reassembleChunks` (NOT the Badge `handleScan`). That routing *is* the second scan mode.
- Live progress **"imported *i* of *M*"** and which chunk indices are still **missing**; a duplicate or
  foreign-transfer code is handled per Slice 12; **a vCard Badge scanned here is ignored** (`decodeChunk` → null).
- On completion: `mergeLeads` into the receiver's Leads, **persist** (`saveLeads`), Home reflects the combined,
  email-de-duplicated list, and a summary shows **"Imported N new Leads (P already had)."**
- Non-destructive; one-way (the sender's list is unaffected). Camera lifecycle + graceful failures like `ScanOverlay`.

## The receiver seam + DEV hook

- New component `src/ImportListView.tsx`, props `{ leads, onLeadsChange, onDone, createScanner? }` (default
  `defaultCreateScanner`), mirroring `ScanOverlay`'s shape. Hold accumulated chunks in a ref; on each decode:
  `const chunk = decodeChunk(text); if (!chunk) return;` else push (idempotent), then `reassembleChunks(...)` →
  update progress; when `complete`, `mergeLeads(leadsRef.current, leads)` → `onLeadsChange(merged)` +
  `saveLeads(merged)` + show the summary.
- **DEV seam:** expose `window.__importChunk = onDecodedText` under `import.meta.env.DEV` (same pattern as
  `__scanBadge`) so Playwright can inject payload strings without a camera.
- `App`: a **"Import a list"** footer entry (beside "Show my list as codes"); a toggle state; render the view;
  pass `leads`/`onLeadsChange={setLeads}` so the merge updates Home.

## Tuning (the density decision — implement these defaults; final values confirmed on real phones)
Per issue 0014's decision (8–10 Leads/chunk + maximize QR size):
1. **`DEFAULT_CHUNK_SIZE`: 20 → 9** in `listTransfer.ts`. (The 0012 tests pass `chunkSize` explicitly, so they
   shouldn't break — but run them; fix any that relied on the default.)
2. **Enlarge the sender's QR render.** The sender (`ShareListView`) currently reuses the 320px badge
   `makeQrDataUrl`, which is too small for dense list chunks. Add a **list-specific higher-resolution** QR
   generator (e.g. in `badgeQr.ts`, `defaultMakeListQrDataUrl` at width ~640–720px, `margin: 2`) and have
   `ShareListView` use it (as its `makeQrDataUrl` default), displayed at full card width. Don't change the badge
   generator's 320px QR.

## TDD cycle list (one test → minimal code each; inject a fake `createScanner` feeding chunk strings, prior art `src/App.scan.test.tsx`)
1. A non-list QR (a real `encodeVCard(...)`) fed to import mode is **ignored** — no progress, no merge.
2. Feeding chunk 0 of M → progress shows **"imported 1 of M"** and the remaining indices as missing.
3. Feeding all chunks (include **out-of-order** + a **duplicate**) → completes → merges → summary
   **"Imported N new (P already had)"**; Home/`loadLeads` reflect the combined deduped list.
4. A **foreign-transfer** chunk mid-import is ignored (doesn't corrupt the active transfer).
5. Merge **dedups against existing** Leads (existing wins; incoming `scannedAt` preserved for new); **persisted**.
6. `App`: the "Import a list" entry opens the view; **Done** returns to Home (camera stop/destroy on unmount,
   like `ScanOverlay`).
7. Sender QR enlargement: `defaultMakeListQrDataUrl` produces a larger data URL than the 320px badge one (or
   assert `ShareListView` uses the list generator) — keep it simple.

Refactor with green.

## Do NOT
- Do not route import decodes through `handleScan` (badge path) — they're separate. Badges stay vCard-only (ADR-0001).
- Do not modify `decodeChunk`/`reassembleChunks`/`mergeLeads` (Slice 12 — use as-is). Don't break the badge scan path.
- Do not finalize chunk size / QR size from headless tests — set the 9 + larger-QR defaults; the **real-phone QA
  confirms** them. No new dependency, no router.

## Live QA (the ORCHESTRATOR + the Vendor run this)
- **Orchestrator, autonomous (full loop in one browser):** open the **sender** with seeded Leads, **decode its
  rendered QR pixels** (jsQR) to get the real payload strings, feed them to the **receiver** via `__importChunk`,
  and assert progress advances → completes → `mergeLeads` updates Home with the deduped combined list + the
  summary. Also: inject a vCard → ignored; a foreign-id chunk → ignored.
- **Vendor, real hardware (the deferred step):** two phones over `npm run share` — Phone A shows the codes,
  Phone B scans them with "Import a list" → confirm the codes **scan reliably** at 9/chunk + the enlarged QR and
  the list merges. Tune chunk size within 8–10 / QR size if real cameras struggle.

## Acceptance criteria
See `docs/issues/0014-merge-receiver-import-and-merge.md`. Plus `npm test` all green, `tsc -b` + `npm run lint` clean.

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time. Behavior through public interfaces; reuse the injected
`createScanner` seam. Glossary: Merge / Lead / Scan / Badge. Respect **ADR-0004 / ADR-0002 / ADR-0001**.
**Never assume; chase bugs to ROOT CAUSE — no jumping to conclusions** (the camera path is where this bites —
recall the `qr-scanner` masking bug found only by live QA). The orchestrator will **independently and
adversarially review** (re-run, re-read, drive the full sender→decode→receiver loop, feed malformed/foreign/vCard
inputs) and will not trust this report alone. Report faithfully, including any mis-step.

## Exact next action
1. `npm test` → confirm the 114-green baseline.
2. Cycle 1: a failing test — a vCard fed to import mode is ignored. Red → green → continue the list.
3. Build the receiver (createScanner import mode → decode/reassemble → progress → merge/summary + DEV seam),
   apply the tuning (DEFAULT_CHUNK_SIZE 9 + the enlarged sender list-QR), wire the App entry. Hand back to the
   orchestrator for the full-loop live QA (and the Vendor for the real two-phone test).
