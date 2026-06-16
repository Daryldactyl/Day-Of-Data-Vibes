# Slice 5 — Export Leads to a CSV file (download)

**Type:** AFK
**PRD:** `docs/prd/export-leads-to-csv.md`

## What to build

The Export spine, download path — the tracer bullet that holds all the real logic. A Vendor with at least one Lead taps an **Export** button on Home and receives a CSV file of all their Leads (`Name`, `Email`, `Scanned At`, with a header row), downloaded to their device.

The CSV is built in browser memory (spec §6 — no filesystem writes, no server): **RFC-4180 quoting** so an Attendee name containing a comma or quote stays in its own field, a **UTF-8 BOM + CRLF** line endings so Excel opens accented names (José, Nguyễn) correctly, and rows in **scan order** (already de-duplicated per ADR-0002). Filename `day-of-data-leads-YYYY-MM-DD.csv` (export date). Export is **read-only** — it never alters or clears Leads — and the button is **disabled at 0 Leads**.

The hand-off is a thin adapter with injectable capabilities (`canShare` / `share` / `download`, defaulting to the real implementations, mirroring App's existing `createScanner` seam). This slice implements the **download** path; the adapter is shaped so Slice 6 can add the Web Share branch without reworking it.

## Acceptance criteria

- [x] A pure `toCsv(leads)` (the real logic, built test-first) emits a header row + RFC-4180-quoted rows, CRLF-terminated, in scan order; covers comma-, quote-, and newline-in-name, plus the empty-leads (header-only) case
- [x] `exportFilename(date)` returns `day-of-data-leads-YYYY-MM-DD.csv` (date passed in — no hidden clock, like `scannedAt`)
- [x] The assembled file starts with a UTF-8 BOM and has a `text/csv` type; accented names open correctly in Excel
- [x] An **Export** button on Home (beside Scan) is disabled at 0 Leads and enabled at ≥1 Lead
- [x] Tapping Export downloads the CSV of the current Leads; the Leads list is unchanged afterward (non-destructive)
- [x] Durable tests cover `toCsv`, `exportFilename`, file assembly (BOM + MIME), and the Home button states + download trigger (inject a fake `exportLeads`, like the scan tests)
- [x] A Playwright MCP QA pass exercises Export → CSV file download on the desktop dev build

## Implementation notes (Slice 5)

- **Pure logic** in `src/lib/exportCsv.ts` — `toCsv(leads)` (RFC-4180 quoting via `/[",\r\n]/`, CRLF, scan order, header-only for `[]`) and `exportFilename(date)`. TDD'd in `exportCsv.test.ts` (8 cycles).
- **Boundary** — `buildCsvFile` prepends the UTF-8 BOM (`﻿`) here, not in `toCsv`, and types the `File` `text/csv`. `defaultExportLeads(leads)` is the single hand-off extension point (clock lives here; Slice 6 adds the share branch).
- **App** — injected `exportLeads?` prop (default `defaultExportLeads`), mirroring the `createScanner` seam; Export button beside Scan, disabled at 0 Leads. Integration tests in `App.export.test.tsx`.
- **Verified:** 50 tests green, `tsc -b` + `npm run lint` clean. **Live Playwright QA** confirmed a real download of `day-of-data-leads-2026-06-16.csv` whose bytes start with `EF BB BF` and contain a comma-name correctly quoted, CRLF separators, and an accented name intact; Leads unchanged after export.
- Implemented by a subagent from `docs/handoffs/slice-5-export-csv-download.md`; independently inspected (re-ran suite, reviewed code, read the downloaded bytes).

## Blocked by

- None — can start immediately (the Lead core from Slice 1 is in place; Leads already load/persist)

## Disciplines

Build via **`/tdd`** (red → green → refactor, one test at a time; vertical tracer-bullet, never horizontal). Follow `docs/working-agreements.md` **verbatim**: test behavior through public interfaces (prior art — `src/lib/vcard.test.ts`, `src/lib/scan.test.ts`); durable Vitest/RTL tests for everything we verify, **plus** live Playwright MCP QA (non-headless). Use the `CONTEXT.md` glossary (Lead, Export, Vendor) in code, tests, and UI. Respect **ADR-0003** (CSV file; no `mailto:`). Implement from a dedicated slice **`/handoff`** so it can be picked up in fresh context by an independent agent. **Never assume; chase bugs to root cause.**
