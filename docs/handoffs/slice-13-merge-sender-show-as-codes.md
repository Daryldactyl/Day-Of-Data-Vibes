# Handoff — Slice 13: Merge sender "Show my list as codes"

**Read first (verbatim):** `docs/working-agreements.md` (disciplines), `docs/issues/0013-merge-sender-show-as-codes.md` (this slice), `docs/prd/merge-teammate-lists.md`, `docs/adr/0004-merge-lists-chunked-qr.md`, `CONTEXT.md` (glossary — **Merge**).

Implement in a **fresh context** via `/tdd`. This is the **sender** half of Merge. Slice 12 (the chunk protocol) is **DONE and merged** — you build on its real, shipped API (below). The receiver/import scan is a separate later slice (0014) — **do not build scanning here.**

## Where things stand — Slice 12's real API (already in `src/lib/listTransfer.ts`)

```
export const DEFAULT_CHUNK_SIZE = 20
export interface ListChunk { transferId: string; index: number; total: number; leads: Lead[] }
export function encodeListChunks(leads: Lead[], transferId: string, chunkSize: number): string[]
export function decodeChunk(text: string): ListChunk | null
export function reassembleChunks(chunks: ListChunk[]): { have, total, missing, complete, leads }
export function mergeLeads(existing, incoming): { merged, added, skipped }
```
- `encodeListChunks` returns one **payload string per QR code**, in order: `JSON.stringify({"dod":"leads","v":1,"id":<transferId>,"i":<index>,"m":<total>,"leads":[…]})`.
- **`index` (`i`) is 0-based** (0..total-1). **For humans, label codes `i+1 of m`** (e.g. "Code 1 of 5").
- You only need `encodeListChunks` + `DEFAULT_CHUNK_SIZE` for this slice. (Read `src/lib/listTransfer.test.ts` for examples.)

## What this slice delivers

A full-screen **"Show my list as codes"** view: turn the Vendor's current Leads into a **scrollable stack of QR
codes** (one per chunk) so a teammate can scan them. Each card shows the QR image + a human label **"Code *i+1*
of *M*."** Read-only — sharing alters no Leads. A way back to Home.

## Architecture & seams (match existing patterns exactly)

`App` toggles full-screen overlays via `useState` and injects effects as optional props with real defaults. The
**`BadgeGenerator`** + **`badgeQr.ts`** pair is your closest model — it already turns a string into a QR image
via the injected **`makeQrDataUrl`**. **Reuse `makeQrDataUrl`.**

### 1. New injected seam — `makeTransferId` (the only new capability)

A small module (e.g. `src/transferId.ts`):
```
export type MakeTransferId = () => string
export const defaultMakeTransferId: MakeTransferId = () => /* a random id string */
```
`App` gains an optional `makeTransferId?: MakeTransferId` prop (default `defaultMakeTransferId`), injected the
same way as `makeQrDataUrl` — so a transfer is deterministic under test. **Do not call `Math.random()`/`Date.now()`
inline in render** — generate the id **once** through the capability (a lazy `useState` initializer), so all
chunks share one id and it doesn't regenerate per render (avoids the `react-hooks/purity` lint).

### 2. New component — the sender view (e.g. `src/ShareListView.tsx`)

Props: `{ leads: Lead[]; onDone: () => void; makeQrDataUrl?: MakeQrDataUrl; makeTransferId?: MakeTransferId }`
(defaults to the real impls).
- Compute the transfer id **once** (lazy initializer). Build `encodeListChunks(leads, transferId, DEFAULT_CHUNK_SIZE)`.
- For each payload string, call `makeQrDataUrl(payload)` (async) and render the resulting data URL as
  `<img className="share-qr">` in a **scrollable** column, each card labelled **"Code {i+1} of {M}"** (M =
  the chunk count). Generate the images in an effect (await all; store data URLs in state) — mirror how
  `BadgeGenerator` awaits `makeQrDataUrl`.
- Full-screen container; mirror `.badge-overlay` styling in `src/App.css`. A **Done** button → `onDone`.
- Glossary copy: it's the Vendor's list of **Leads** being shared for a **Merge**.

### 3. `src/App.tsx` wiring

- Add optional `makeTransferId?: MakeTransferId` to `AppProps` (default `defaultMakeTransferId`).
- Add a `useState` toggle (e.g. `sharingList`) and render the sender view when true.
- Add an **entry point** — a secondary control (a footer-style link like the existing **"Make a badge"** link is
  a good model, to avoid crowding the Scan · Export · Raffle action row), labelled e.g. **"Show my list as
  codes."** Sensible behavior at 0 Leads (disabled / "nothing to share").

## TDD cycle list (one test → minimal code each)

`src/transferId.test.ts`:
1. `defaultMakeTransferId()` returns a non-empty string (and two calls aren't trivially equal — best-effort).

`src/ShareListView.test.tsx` (RTL; inject a **fake `makeQrDataUrl`** returning a recognizable data URL + a **fixed `makeTransferId`**; prior art `src/BadgeGenerator.test.tsx`):
2. N Leads (with a small injected/known chunk size, or DEFAULT_CHUNK_SIZE) → renders ⌈N/chunkSize⌉ QR `<img>`s.
3. Each card is labelled **"Code i+1 of M"** (1-based for humans; assert e.g. "Code 1 of 3" … "Code 3 of 3").
4. `makeQrDataUrl` is called with **exactly the `encodeListChunks(leads, fixedId, chunkSize)` payload strings**
   (assert the calls match the encoder's output — proves the QR encodes the real chunks).
5. The view is **read-only** — rendering it does not change Leads/storage.

`src/App.share.test.tsx` (prior art `src/App.scan.test.tsx`):
6. The footer entry opens the sender view; **Done** returns to Home; the entry is disabled/empty at 0 Leads.

Refactor with green.

## Do NOT
- Do **not** build the receiver / import scan (that's slice 0014). No `createScanner`, no `decodeChunk`/
  `reassembleChunks`/`mergeLeads` here.
- Do not call `Math.random()`/`Date.now()` inline in render — use the injected `makeTransferId` once.
- Do not modify `listTransfer.ts`, the scanner, badge, or their tests. No new dependency, no router.

## Live QA (the ORCHESTRATOR runs this on inspection — note what it asserts)
Playwright MCP, non-headless, screenshots to `/tmp`: seed Leads, open "Show my list as codes", confirm a
**scrollable stack of real QR images** renders with "Code i of M" labels; **decode one rendered QR** (jsQR) and
confirm `decodeChunk` of it returns a valid `ListChunk` for the seeded Leads — i.e. the codes a teammate would
scan are genuinely the chunk protocol's output (round-trip on real pixels).

## Acceptance criteria
See `docs/issues/0013-merge-sender-show-as-codes.md`. Plus `npm test` all green, `tsc -b` + `npm run lint` clean.

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time; vertical tracer-bullet. Behavior through public interfaces. Reuse
the injected `makeQrDataUrl` seam; the new `makeTransferId` is injected the same way. Glossary: Merge / Lead.
Respect **ADR-0004**. **Never assume; chase bugs to ROOT CAUSE — no jumping to conclusions.** The orchestrator
will **independently and adversarially review** (re-run, re-read, decode a real QR, try to break it) and will
not trust this report alone. Report faithfully (real test output), including any mis-step.

## Exact next action
1. `npm test` → confirm the current baseline is green.
2. Cycle 1: a failing test for `defaultMakeTransferId` (non-empty string). Red → green → continue.
3. Land the `makeTransferId` seam, then the sender view (reuse `makeQrDataUrl`, label "Code i+1 of M"), then the
   App entry point. Hand back to the orchestrator for live QA.
