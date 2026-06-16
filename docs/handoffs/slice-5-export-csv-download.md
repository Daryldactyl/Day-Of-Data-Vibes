# Handoff — Slice 5: Export Leads to a CSV file (download)

**Read first (verbatim):** `docs/working-agreements.md` (disciplines), `docs/issues/0005-export-leads-to-csv.md` (this slice), `docs/prd/export-leads-to-csv.md`, `CONTEXT.md` (glossary), `docs/adr/0003-export-csv-web-share.md`.

This handoff lets Slice 5 be implemented in a **fresh context** via `/tdd`. Everything needed is below.

---

## Where things stand (Slices 1–4 = DONE)

- **`src/lib/leads.ts`** — `Lead = { name, email, scannedAt }` (`scannedAt` = ISO 8601). `addLead` dedupes by normalized email (ADR-0002).
- **`src/lib/leadsStorage.ts`** — `loadLeads()` / `saveLeads()` over `localStorage` (key `dayofdata.leads`).
- **`src/App.tsx`** — loads Leads via `useState(() => loadLeads())`; renders the empty state or a count (`data-testid="lead-count"`) + `.lead-list`; has a **Scan** button that opens the camera overlay. **App accepts an injected `createScanner?` prop (defaults to the real scanner) — this is the established test-seam pattern; mirror it for Export.**
- **Tests: 39 passing** (`npm test`); `tsc -b` + `npm run lint` clean. Pure-logic tests live beside modules in `src/lib/` (model: `src/lib/vcard.test.ts`, `src/lib/scan.test.ts`). Injected-effect integration tests model: `src/App.scan.test.tsx` (a fake `createScanner` drives the public path).
- Dev: `npm run dev` (re-check the printed port; 5173/5174/5175 have all been used). Live QA = **non-headless** Playwright MCP. **NOTE:** Playwright MCP writes artifacts into the project root which makes Vite hot-reload mid-run — screenshot to `/tmp` and drive a whole scenario in one `browser_run_code_unsafe` call (see prior slice QA).

## What to build (this slice)

A Vendor with ≥1 Lead taps **Export** on Home → a CSV of all Leads (`Name,Email,Scanned At` + header) is built in memory and **downloaded**. Read-only (Leads unchanged). Button **disabled at 0 Leads**. RFC-4180 quoting, UTF-8 BOM + CRLF, scan order. Filename `day-of-data-leads-YYYY-MM-DD.csv`.

## The seams (build the pure logic test-first; keep effects thin)

1. **`toCsv(leads: Lead[]): string`** — PURE, the real logic. Header `Name,Email,Scanned At`, then one record per Lead in array (scan) order, fields in order name/email/scannedAt. **RFC-4180 quoting:** a field containing `,` `"` `\r` or `\n` is wrapped in double-quotes with inner `"` doubled (`"` → `""`). Records separated by **CRLF** (`\r\n`). `scannedAt` emitted verbatim (stored ISO string). `toCsv([])` → header row only. **Do NOT put the BOM in here** — keep it pure CSV text.
2. **`exportFilename(date: Date): string`** — PURE. Returns `day-of-data-leads-YYYY-MM-DD.csv` (date passed in — no hidden clock, like `scannedAt`). Test with a fixed `Date`.
3. **`buildCsvFile(leads, date): File`** — thin boundary. `new File(['﻿' + toCsv(leads)], exportFilename(date), { type: 'text/csv' })` — BOM prepended **here**, at the boundary. Testable: assert `file.name`, `file.type`, and that the text content starts with `﻿`.
4. **Download adapter + App wiring** — mirror the `createScanner` seam. App gains an injected `exportLeads?: (leads: Lead[]) => void | Promise<void>` prop, defaulting to a real `defaultExportLeads(leads)` that does `downloadFile(buildCsvFile(leads, new Date()))` (the clock lives here, at the boundary). `downloadFile(file)` = object-URL + anchor click (keep minimal; the actual download is QA'd live, not unit-asserted). Home renders an **Export** button beside Scan: `disabled` when `leads.length === 0`, `onClick` calls `exportLeads(leads)`.
   - **Shape for Slice 6:** `defaultExportLeads` is the single extension point — Slice 6 will add the `navigator.canShare`/`navigator.share` branch (share sheet) with `downloadFile` as the fallback. Don't build that now, but keep `defaultExportLeads` the one place the hand-off decision lives.

## TDD cycle list (one test → one impl each; never write all tests first)

`src/lib/exportCsv.test.ts` (mirror `vcard.test.ts` style):
1. one Lead → `Name,Email,Scanned At\r\n` + the data row (assert exact string).
2. multiple Leads → rows in array order, CRLF-separated.
3. a name with a comma → that field quoted.
4. a name with a `"` → quoted, inner quote doubled (`Ada "Ace" Lovelace` → `"Ada ""Ace"" Lovelace"`).
5. a name with a newline → quoted.
6. `toCsv([])` → header row only.
7. `exportFilename(new Date('2026-07-18T09:00:00'))` → `day-of-data-leads-2026-07-18.csv`.
8. `buildCsvFile(...)` → `file.name` matches `exportFilename`, `file.type === 'text/csv'`, content starts with `﻿`.

`src/App.export.test.tsx` (mirror `App.scan.test.tsx` — inject a fake `exportLeads`):
9. Export button **disabled** when there are 0 Leads.
10. Export button **enabled** with ≥1 Lead; clicking it calls the injected `exportLeads` with the current Leads.
11. Exporting does not change the Leads list (count/rows unchanged after click).

## Acceptance criteria
See `docs/issues/0005-export-leads-to-csv.md` — all boxes. Plus: `npm test` all green, `tsc -b` + `npm run lint` clean, and a **live Playwright MCP** pass showing Export → a `.csv` file download on the desktop dev build (drive in one `browser_run_code_unsafe` call; capture the download event / assert the suggested filename).

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time, vertical. Test behavior through public interfaces. Build durable tests **and** QA live with Playwright MCP. Use the glossary (Lead, Export, Vendor). Respect ADR-0003 (CSV file; no `mailto:`). **Never assume; chase bugs to root cause.** Report outcomes faithfully (show real test output).

## Exact next action
1. `npm test` → confirm 39 green baseline.
2. Cycle 1: write the first failing test in `src/lib/exportCsv.test.ts` for `toCsv` (one Lead). Red → green → continue down the list.
3. Then the App Export button + injected `exportLeads`, then live QA. Restart `npm run dev` if needed.
