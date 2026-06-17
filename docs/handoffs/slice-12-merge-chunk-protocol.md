# Handoff — Slice 12: Merge chunk protocol + merge (pure logic)

**Read first (verbatim):** `docs/working-agreements.md` (disciplines), `docs/issues/0012-merge-chunk-protocol.md` (this slice), `docs/prd/merge-teammate-lists.md`, `docs/adr/0004-merge-lists-chunked-qr.md`, `docs/adr/0002-dedupe-leads-by-email.md`, `docs/adr/0001-vcard-badge-payload.md`, `CONTEXT.md` (glossary — note the **Merge** entry).

Implement in a **fresh context** via `/tdd`. This slice is **pure logic only — no UI, no camera.** It is the heart of the Merge feature; slices 0013 (sender) and 0014 (receiver) build on the exact functions you produce here, so keep the signatures clean and the payload shape stable.

---

## What this slice delivers

Four pure functions (one new module, e.g. `src/lib/listTransfer.ts`) that carry a Vendor's Leads from one phone
to another as QR-code chunks and merge them on arrival. **No DOM, no camera, no QR rendering** (that's the
existing `makeQrDataUrl`, used by slice 0013) and **no scanning** (existing `createScanner`, used by slice 0014)
— this slice is just the encode/decode/reassemble/merge logic.

## Reuse first
- **`addLead`** in `src/lib/leads.ts` already de-duplicates by normalized email (ADR-0002). **Read it for its
  exact signature/return** and build `mergeLeads` on top of it — do not re-implement dedup.
- `Lead` type from `src/lib/leads.ts`.

## The functions (the contract slices 0013/0014 depend on)

```
import type { Lead } from './leads'

// One scanned QR's decoded contents.
interface ListChunk { transferId: string; index: number; total: number; leads: Lead[] }

export function encodeListChunks(leads: Lead[], transferId: string, chunkSize: number): string[]
//   Split `leads` into ceil(N/chunkSize) chunks; return one payload STRING per QR code, in order.
//   transferId + chunkSize are passed in (no hidden id/clock). chunkSize default ~20–25 may live as a const.

export function decodeChunk(text: string): ListChunk | null
//   Parse one scanned QR string back into a ListChunk, or null if it isn't a list payload
//   (a vCard Badge — "BEGIN:VCARD..." — or arbitrary junk → null). This is the badge/non-badge boundary.

export function reassembleChunks(chunks: ListChunk[]): {
  have: number; total: number; missing: number[]; complete: boolean; leads: Lead[]
}
//   Treat the transferId of the FIRST chunk as the active transfer; IGNORE any chunk with a different
//   transferId. Dedupe by index (idempotent), tolerate out-of-order arrival. `missing` = the indices not yet
//   present. `complete` when all `total` indices are in. `leads` = chunks concatenated in index order
//   (only meaningful when complete).

export function mergeLeads(existing: Lead[], incoming: Lead[]): { merged: Lead[]; added: number; skipped: number }
//   Fold each incoming Lead through addLead (ADR-0002): dedupe by normalized email (existing wins), append
//   genuinely-new Leads WITH THEIR OWN scannedAt (not "now"), non-destructive. Count added vs skipped.
```

### Payload format (recommended — keep the marker so it can never be a vCard)
A compact JSON string per chunk with a distinct top-level marker, e.g.:
`{"dod":"leads","v":1,"id":"<transferId>","i":<index>,"m":<total>,"leads":[{"name":…,"email":…,"scannedAt":…}, …]}`
`decodeChunk` does a guarded `JSON.parse` (a vCard isn't JSON → throws → return null) and checks the `"dod":"leads"`
marker (any JSON lacking it → null). `index` 1-based or 0-based is your call — be consistent and reflect it in
`missing`/`total`. (This keeps badges vCard-only per ADR-0001; the Scanner's `parseVCard` rejects these and
`decodeChunk` rejects vCards.)

## TDD cycle list (one test → minimal code each; mirror `vcard.test.ts` / `exportCsv.test.ts` style)

`src/lib/listTransfer.test.ts`:
1. `encodeListChunks` splits N Leads into ⌈N/chunkSize⌉ strings (e.g. 5 Leads, chunkSize 2 → 3 codes).
2. **Round-trip anchor:** `reassembleChunks(emitted.map(decodeChunk))` (complete) reproduces the original Leads
   in order, with `complete: true`.
3. Each emitted chunk decodes to a `ListChunk` carrying the marker, the transferId, the right index/total, and
   its Leads slice.
4. `decodeChunk` → a **vCard string** (`encodeVCard({...})` from `src/lib/vcard.ts`) returns `null`; arbitrary
   junk returns `null`.
5. `reassembleChunks` partial: given some-but-not-all chunks → correct `have`/`total`/`missing`, `complete:false`.
6. `reassembleChunks` **out-of-order** chunks → still reassembles correctly when complete.
7. `reassembleChunks` **duplicate index** is idempotent (same result as without the dup).
8. `reassembleChunks` **foreign transferId** chunk is ignored (doesn't corrupt the active transfer's reassembly).
9. `mergeLeads`: incoming with a new email is **added** (with its own `scannedAt`); incoming whose email already
   exists is **skipped** (existing wins); counts `{ added, skipped }` correct; `existing` not mutated.

Refactor with green.

## Do NOT
- No UI, no camera, no QR image rendering, no scanning in this slice.
- Do not modify `addLead`, the scanner, or any existing tests. Reuse `addLead` as-is.
- No new dependency.

## Live QA
None for this slice — it's pure. The orchestrator verifies by **re-running the suite and adversarially probing
the edges** (malformed payloads, mixed transfers, duplicate/out-of-order indices, a vCard fed to `decodeChunk`).

## Acceptance criteria
See `docs/issues/0012-merge-chunk-protocol.md`. Plus `npm test` all green, `tsc -b` + `npm run lint` clean.

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time; vertical tracer-bullet. Behavior through public interfaces.
Glossary: Merge / Lead / Scan / Badge. Respect **ADR-0004** (chunked-QR), **ADR-0002** (reuse `addLead`),
**ADR-0001** (import payload is a distinct, marked format — never a vCard). **Never assume; chase bugs to ROOT
CAUSE — no jumping to conclusions.** The orchestrator will **independently and adversarially review** (re-run,
re-read, try to break it) and will not trust this report alone. Report faithfully (real test output).

## Exact next action
1. `npm test` → confirm the current baseline is green.
2. Cycle 1: a failing test for `encodeListChunks` (N Leads → expected code count). Red → green → continue.
3. Land all four functions with the round-trip as the anchor. Report the FINAL exported signatures + the exact
   payload string shape (slices 0013/0014's handoffs will be written from them).
