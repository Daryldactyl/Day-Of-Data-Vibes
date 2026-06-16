# Slice 6 — Web Share hand-off (share sheet → Mail attach)

**Type:** AFK
**PRD:** `docs/prd/export-leads-to-csv.md`

## What to build

Layer the phone-native hand-off onto Slice 5's Export so a Vendor can email the CSV in one gesture. On a device that supports it (`navigator.canShare({ files: [csv] })` is true), tapping **Export** opens the **native share sheet** with the CSV attached as a real file — the Vendor taps **Mail** and the file is already attached, ready to send to their sales/recruiting team. The very thing `mailto:` couldn't do (ADR-0003).

Where Web Share for files isn't available (desktop, older browsers, local dev), Export **falls back** to Slice 5's download — no regression. A **cancelled** share sheet (the Vendor changes their mind) returns quietly to the Leads list: no error, no failure toast. On mobile this path also sidesteps iOS Safari's unreliable Blob-download behavior.

## Acceptance criteria

- [x] When `canShare({ files })` is true, Export calls `navigator.share` with a `File` carrying the correct name (`day-of-data-leads-YYYY-MM-DD.csv`) and `text/csv` type — the CSV is **attached**, not inlined as text
- [x] When `canShare({ files })` is false, Export uses the download fallback (Slice 5 behavior unchanged)
- [x] A cancelled/aborted share resolves quietly — no thrown error, no failure message, Leads unchanged
- [x] Durable tests cover the share-vs-download decision (inject `canShare` / `share` / `download`) and the cancel path
- [x] A Playwright MCP QA pass asserts the share path via a **stubbed** `navigator.share` (the OS share sheet can't be driven headlessly) and confirms the download fallback still fires when `canShare` is false
- [ ] Verified on real hardware: on a phone over the `npm run share` tunnel, Export → share sheet → Mail attaches the CSV — **pending hardware** (bypassed, like the Slice 2/4 phone checks)

## Decisions taken (implementation)

- **Cancelled share (AbortError):** resolves quietly — no error, no download fallback. The Vendor deliberately backed out of the share sheet; re-triggering a download would be surprising and unwanted. Leads unchanged.
- **Non-abort share failure:** falls back to `download(file)` (the handoff's recommendation) so the Vendor still walks away with the CSV (ADR-0003).

## Implementation notes (Slice 6)

- Added `shareOrDownload(file, caps)` to `src/lib/exportCsv.ts` with injectable `canShare`/`share`/`download` (the test seam); `defaultExportLeads` now `async` and wires the real `navigator.canShare`/`navigator.share`/`downloadFile`. No App change — the `exportLeads?` seam already accepted a Promise.
- **Verified:** 55 tests green, `tsc -b` + `npm run lint` clean. **Live Playwright QA** (stubbed Web Share) confirmed: `canShare` true → `navigator.share` called with a `File` named `day-of-data-leads-…csv`, `text/csv`, attached (not inlined); `canShare` false → download fallback fires. Cancel/non-abort paths covered by durable tests.
- Implemented by a subagent from `docs/handoffs/2026-06-16-slice-6-web-share-handoff.md`; independently inspected (re-ran suite, reviewed the decision code, drove both live branches).

## Blocked by

- Slice 5 — Export Leads to a CSV file (the hand-off adapter + download fallback this extends)

## Disciplines

Build via **`/tdd`** (red → green → refactor, one test at a time). Follow `docs/working-agreements.md` **verbatim**: behavior through public interfaces; durable tests for the share/download decision + cancel handling (inject capabilities, prior art — the `createScanner` fake in `src/App.scan.test.tsx`); **plus** live Playwright MCP QA (stub `navigator.share`). Use the `CONTEXT.md` glossary (Lead, Export, Vendor). Respect **ADR-0003** (Web Share with download fallback; no `mailto:`). Implement from a dedicated slice **`/handoff`** in fresh context. **Never assume; chase bugs to root cause.**
