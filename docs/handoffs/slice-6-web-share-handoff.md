# Handoff — Slice 6: Web Share hand-off (share sheet → Mail attach)

**Read first (verbatim):** `docs/working-agreements.md` (disciplines), `docs/issues/0006-web-share-handoff.md` (this slice), `docs/prd/export-leads-to-csv.md`, `docs/adr/0003-export-csv-web-share.md`, `CONTEXT.md`.

Implement in a **fresh context** via `/tdd`. Slice 5 is DONE and verified — you are layering onto it.

---

## Where things stand (Slice 5 = DONE)

`src/lib/exportCsv.ts` already has, all tested (`exportCsv.test.ts`, `App.export.test.tsx`; 50 tests green, `tsc`/`lint` clean):
- `toCsv(leads)` (pure, RFC-4180), `exportFilename(date)` (pure), `buildCsvFile(leads, date): File` (BOM at the boundary, `text/csv`).
- `downloadFile(file: File): void` — object-URL + anchor click (the **fallback** path; keep it).
- **`defaultExportLeads(leads: Lead[]): void`** — currently `downloadFile(buildCsvFile(leads, new Date()))`. **This is the single hand-off extension point — change it here.**
- `App` injects `exportLeads?` (default `defaultExportLeads`); Export button on Home, disabled at 0 Leads. Test seam: inject a fake `exportLeads` (see `App.export.test.tsx`). **Don't change the App seam — it already works for this slice.**

## What to build (this slice)

When the device supports sharing a file (`navigator.canShare({ files: [file] })` true), Export opens the **native share sheet** with the CSV attached (`navigator.share({ files: [file] })`) — tap Mail → attached. Otherwise it **falls back** to `downloadFile` (ADR-0003). A **cancelled** share (the Vendor backs out) resolves **quietly** — no thrown error, no failure UI, Leads unchanged.

## The seam (make the decision unit-testable)

Add a function whose share/download capabilities are **injectable**, so the decision is tested without a real share sheet (mirrors the `createScanner`/`diagnoseCamera` injection pattern):

```
interface ShareCaps {
  canShare: (file: File) => boolean
  share: (file: File) => Promise<void>
  download: (file: File) => void
}
async function shareOrDownload(file: File, caps: ShareCaps): Promise<void>
```
- If `caps.canShare(file)` → `await caps.share(file)`; on a **cancel** (`DOMException` with `name === 'AbortError'`, or the user dismissing) resolve quietly. **Recommended:** on any *non-abort* share failure, fall back to `caps.download(file)` so the Vendor still gets the file (note this decision in the issue if you take it).
- Else → `caps.download(file)`.

Then `defaultExportLeads(leads)` becomes: build the file, call `shareOrDownload(file, realCaps)` where real caps are:
- `canShare: (file) => !!navigator.canShare && navigator.canShare({ files: [file] })`
- `share: (file) => navigator.share({ files: [file] })`
- `download: downloadFile`

Keep `defaultExportLeads` awaiting appropriately (it may become `async`). The App seam (`exportLeads?: (leads) => void | Promise<void>`) already allows a Promise — no App change needed.

## TDD cycle list (one test → one impl each)

`src/lib/exportCsv.test.ts` (extend it; `shareOrDownload` is the new unit under test — pass fake caps, never touch real `navigator`):
1. `canShare` true → `share` called once with the `File`; `download` NOT called.
2. `canShare` false → `download` called once with the `File`; `share` NOT called.
3. `share` rejects with `AbortError` (cancel) → `shareOrDownload` resolves, **does not throw**, and (per your chosen rule) does not surface an error. Assert it resolves; assert download is/isn't called per your rule (state it).
4. (If you adopt the recommendation) `share` rejects with a non-abort error → `download` called as fallback.
5. Assert the shared `File` carries the right `name` (`day-of-data-leads-…csv`) and `type` (`text/csv`) — reuse `buildCsvFile`.

Do **not** unit-test `defaultExportLeads`'s real-`navigator` wiring (that's the live QA's job, like `downloadFile` in Slice 5).

## Live QA (orchestrator will run; note what to assert)
Playwright MCP, in one `browser_run_code_unsafe` call, screenshots to `/tmp`:
- Stub `navigator.canShare = () => true` and `navigator.share = async (data) => { window.__shared = data }` via `addInitScript`; seed Leads; click Export; assert `window.__shared.files[0]` is a `File` named `day-of-data-leads-…csv`, `text/csv` — i.e. the **share** path fired with the CSV attached.
- Stub `navigator.canShare = () => false`; click Export; assert a **download** fires (fallback) — `page.waitForEvent('download')`.
- Real-hardware (bypassed): phone over `npm run share` tunnel → Export → share sheet → Mail attaches the CSV.

## Acceptance criteria
See `docs/issues/0006-web-share-handoff.md`. Plus `npm test` all green, `tsc -b` + `npm run lint` clean.

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time. Behavior through public interfaces. Durable tests for the share/download decision + cancel; live Playwright QA (stub `navigator.share`). Glossary: Lead/Export/Vendor. Respect ADR-0003. **Never assume; chase bugs to root cause.** Report faithfully (real test output).

## Exact next action
1. `npm test` → confirm 50 green baseline.
2. Cycle 1: failing test for `shareOrDownload` (canShare true → share called). Red → green → continue.
3. Wire `defaultExportLeads` to `shareOrDownload` with real `navigator` caps. Then the orchestrator runs live QA.
