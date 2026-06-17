# Slice 12 — Merge: chunk protocol + merge (pure logic)

**Type:** AFK
**PRD:** `docs/prd/merge-teammate-lists.md`
**ADR:** `docs/adr/0004-merge-lists-chunked-qr.md` (reuses `docs/adr/0002-dedupe-leads-by-email.md`; respects `docs/adr/0001-vcard-badge-payload.md`)

## What to build

The pure, UI-less heart of **Merge**: the chunk transfer protocol + the merge, as pure functions, so the whole
thing is provable by tests before any camera or view exists. Four functions:

- **`encodeListChunks(leads, transferId, chunkSize)`** → an ordered list of payload strings, one per QR code.
  Each payload carries a **distinct format marker** (so it can never be mistaken for a vCard Badge), the
  **transfer id**, the **chunk index and total**, and that chunk's slice of Leads.
- **`decodeChunk(text)`** → a chunk, or **`null`** if the text isn't a list payload (a vCard Badge or arbitrary
  QR → `null` — the badge/non-badge boundary).
- **`reassembleChunks(chunks)`** → `{ have, total, missing, complete, leads }`; idempotent by index; ignores
  chunks from a different transfer id; tolerates out-of-order arrival; yields the assembled Leads when complete.
- **`mergeLeads(existing, incoming)`** → folds each incoming Lead through the existing **`addLead`** (ADR-0002:
  de-dupe by normalized email, existing wins, append new Leads **with their original `scannedAt`**,
  non-destructive); returns counts `{ added, skipped }`.

`transferId` and `chunkSize` are **passed in** (no hidden id/clock). No UI, no camera in this slice.

## Acceptance criteria

- [x] `encodeListChunks` splits N Leads into ⌈N/chunkSize⌉ codes, each carrying the marker, the transfer id, the
      correct index/total, and its slice of Leads.
- [x] **Round-trip anchor test:** decoding + reassembling all emitted chunks reproduces the original Leads in order.
- [x] `decodeChunk`: a valid payload yields its chunk; a **vCard string** and arbitrary junk yield **`null`**.
- [x] `reassembleChunks`: partial input reports correct `have`/`total`/`missing`; **out-of-order** chunks
      reassemble correctly; a **duplicate index** is idempotent; a **foreign transfer id** is ignored; the
      complete set yields the assembled Leads.
- [x] `mergeLeads`: de-dupes by normalized email (existing wins), preserves incoming `scannedAt` for new Leads,
      is non-destructive, and reports correct `{ added, skipped }`.
- [x] Durable pure Vitest tests for all four (prior art: `src/lib/exportCsv.test.ts`, `src/lib/scan.test.ts`,
      `src/lib/vcard.test.ts` round-trip). No UI/camera.
- [x] `npm test` all green, `tsc -b` + `npm run lint` clean.

## Implementation notes (Slice 12) — the contract slices 0013/0014 build on

- **Module** `src/lib/listTransfer.ts`, TDD'd in `listTransfer.test.ts`. Final exported API:
  - `DEFAULT_CHUNK_SIZE = 20` (tunable; not auto-applied — `chunkSize` is always passed in).
  - `interface ListChunk { transferId: string; index: number; total: number; leads: Lead[] }`
  - `encodeListChunks(leads, transferId, chunkSize): string[]`
  - `decodeChunk(text): ListChunk | null`
  - `reassembleChunks(chunks): { have, total, missing, complete, leads }`
  - `mergeLeads(existing, incoming): { merged, added, skipped }`
- **Payload string** (one per QR code) — `JSON.stringify` of:
  `{"dod":"leads","v":1,"id":"<transferId>","i":<index>,"m":<total>,"leads":[ <Lead> ]}`.
  Marker `"dod":"leads"` distinguishes it from a vCard (which isn't JSON → `JSON.parse` throws → `null`).
  **`index` (`i`) is 0-based** (0..total-1); `m` is the chunk count; `missing` uses 0-based indices. **For
  humans, label codes `i+1 of m`.** `decodeChunk` also rejects marked-but-structurally-malformed payloads → `null`.
- **`reassembleChunks`** treats the **first** chunk's `transferId` as active and ignores foreign-id chunks;
  idempotent by index (first-seen wins); tolerates out-of-order; concatenates Leads in index order.
- **`mergeLeads`** reuses `addLead` as-is (ADR-0002: dedupe by normalized email, existing wins, new Leads keep
  their own `scannedAt`, non-destructive); counts `added` (status `saved`) vs `skipped` (`duplicate`).
- **Verified + a bug fixed in review:** built by a subagent via TDD (11 tests). On **adversarial inspection** the
  orchestrator found `reassembleChunks([])` **threw** (`chunks[0]` undefined) — and that a naïve guard would
  wrongly report `complete: true` for `total: 0`. Fixed test-first: empty input now returns
  `{ have: 0, total: 0, missing: [], complete: false, leads: [] }` (+1 test). Re-ran: **101 green**, `tsc` + lint
  clean. The subagent and a parallel Raffle subagent honestly reported the transient cross-file churn from
  running concurrently.

## Blocked by

- None — can start immediately (reuses `addLead` / the Lead core, already in place).

## Disciplines

Build via **`/tdd`** (red → green → refactor, **one test at a time**; vertical tracer-bullet, never horizontal).
Follow `docs/working-agreements.md` **verbatim**, and these in full — a subagent MUST NOT skip them:

- **Never assume. Chase every bug to its ROOT CAUSE** — no band-aids, no "probably," no jumping to conclusions;
  reproduce → minimize → fix the actual cause; never blame the network or the model.
- **Test behavior through public interfaces, not implementation** (tests survive refactors). Pure logic in
  `src/lib/` tested directly (prior art: `src/lib/exportCsv.test.ts`, `src/lib/scan.test.ts`,
  `src/lib/vcard.test.ts`).
- **Durable Vitest tests for everything verified** (this slice is pure; the live/camera QA happens in the
  receiver slice).
- Use the **`CONTEXT.md` glossary** verbatim (Lead, **Merge**, Scan, Badge) in code and tests. Respect **ADR-0004**
  (chunked-QR, peer-to-peer), **ADR-0002** (email dedup — reuse `addLead`), and **ADR-0001** (Badges stay
  vCard-only → the import payload must be a distinct, clearly-marked format).
- Implement from a dedicated slice **`/handoff`** in **fresh context**.
- **The orchestrator will independently and adversarially review** the result and its proof — re-running the
  suite, re-reading the code, and trying to break the claims (malformed payloads, mixed transfers, dup indices)
  — and will **never** trust the subagent's report alone. Report faithfully, including any mis-step.
