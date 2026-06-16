# PRD — Export Leads to CSV

**Status:** ready to build
**Scope:** The Vendor's Export feature — tap a button → build a CSV of all collected Leads → hand it off (native share sheet on a phone, file download on desktop) so the Vendor can email it to their sales/recruiting team.
**Sources:** `spec_sheet.md` (§4.5, §5, §6, §9), `CONTEXT.md`, `docs/adr/0003-export-csv-web-share.md`, `docs/qa-sessions/export-feature-grilling.md`
**Vocabulary:** Uses the project glossary in `CONTEXT.md` — Attendee, Vendor, Badge, Scan, Lead, Export.

---

## Problem Statement

A Vendor has spent the day at their booth scanning Attendee Badges, and now has a list of Leads sitting in their phone's browser. That list is useless until it reaches their sales/recruiting team. The Vendor needs to get those Leads off the phone and into an email — as a real file their team can open in Excel or Google Sheets and import into a CRM — with one deliberate action, no account, no copy-pasting, and without the file being mangled (accented names turning to gibberish) or silently emailed on their behalf. Today the app can collect Leads but offers no way out of them.

## Solution

The Home screen gains an **Export** button next to **Scan**. When the Vendor has at least one Lead, tapping Export builds a CSV of every Lead — `Name`, `Email`, `Scanned At` — in the phone's memory, and hands it off the best way the device allows: on a phone, the native **share sheet** opens with the CSV attached as a real file, so the Vendor taps **Mail**, the file is already attached, and they send it to their team; on a desktop (or any browser without file-sharing), the CSV simply **downloads**. The file is encoded so Excel opens accented names correctly. Nothing is emailed automatically and no Lead is altered or cleared by exporting — the Vendor can keep scanning and export again later. With zero Leads, Export is disabled, because there is nothing to send.

## User Stories

1. As a Vendor, I want an **Export** button on the Home screen, so that I can get my collected Leads out of the app at the end of the day.
2. As a Vendor, I want Export to live **next to Scan on Home**, so that the two things I do — collect and send — are both one tap away.
3. As a Vendor, I want tapping Export to produce a **CSV of all my Leads**, so that my sales team gets a structured file they can open and import.
4. As a Vendor, I want each row to contain the Attendee's **name, email, and the time I scanned them**, so that my team has the contact plus when it was captured.
5. As a Vendor, I want a **header row** (`Name, Email, Scanned At`) on the CSV, so that whoever opens it knows what each column is.
6. As a Vendor, I want the CSV rows in the **order I scanned them**, so that the file reflects how my day actually went.
7. As a Vendor scanning Attendees whose names contain **commas or quotes**, I want those names to stay intact in the CSV, so that one Attendee never spills into the wrong columns.
8. As a Vendor collecting Attendees with **accented names** (José, Nguyễn, Müller), I want them to display correctly when my team opens the file in **Excel**, so that I'm not handing over a list full of gibberish.
9. As a Vendor on my **phone**, I want Export to open the **native share sheet with the CSV already attached**, so that I can tap Mail and send the file to my team in one gesture.
10. As a Vendor on a **desktop browser**, I want Export to **download the CSV file**, so that the feature still works where the share sheet isn't available (including local testing).
11. As a Vendor, I want the file to have a **clear, dated name** (`day-of-data-leads-YYYY-MM-DD.csv`), so that my team can tell what it is and when it was collected.
12. As a Vendor, I want exporting to **never send anything automatically** — only ever a file I hand off myself — so that no email leaves without my deliberate action.
13. As a Vendor, I want exporting to **not change or delete my Leads**, so that I can export, keep scanning, and export again without losing anything.
14. As a Vendor who **hasn't scanned anyone yet**, I want the Export button to be **disabled**, so that I'm not handed an empty or confusing file.
15. As a Vendor who **cancels the share sheet** (changes my mind), I want the app to quietly return to my list with no error, so that backing out feels normal, not like something broke.
16. As a Vendor, I want my **whole day's Leads** exported — hundreds of them — in one file, so that nothing is left behind or truncated.
17. As a Vendor, I want the export to reflect my **de-duplicated** list (one row per Attendee, per ADR-0002), so that the file I hand over is already clean.
18. As a member of the **sales/recruiting team**, I want the CSV to import cleanly into a **CRM or spreadsheet**, so that I can act on the Leads without hand-cleaning the file.

## Implementation Decisions

- **CSV file, not `mailto:` (ADR-0003).** `mailto:` cannot attach a file — only prefill body text, which is length-limited and useless for hundreds of Leads — so it is rejected. Export always produces a real CSV file built in browser memory (spec §6: no filesystem writes, no server).
- **Hand-off via Web Share API, falling back to download (ADR-0003).** Feature-detect `navigator.canShare({ files: [file] })`. If supported, call `navigator.share({ files: [file] })` to open the native share sheet with the CSV attached. Otherwise, trigger a Blob `<a download>`. On mobile the share sheet is used, which also sidesteps iOS Safari's unreliable Blob-download-to-Files behavior (same URL-first/iOS constraint behind ADR-0001). Web Share requires HTTPS + a user gesture — both satisfied (tunnel/prod is HTTPS; Export is a button).
- **Anonymous export.** The CSV contains Lead rows only — no Vendor name/company, no profile concept. The app captures no Vendor identity (spec §6: no accounts/login); the file is identified by the inbox it's emailed from. This resolves the spec §9 open question with a deliberate "no."
- **CSV shape.** Columns in order: `Name`, `Email`, `Scanned At`, preceded by a header row. `Scanned At` is the `Lead`'s stored `scannedAt` ISO 8601 string. Rows preserve scan (storage) order. Built from the same de-duplicated Leads the app already holds (ADR-0002), so the file inherits dedup for free.
- **RFC-4180 quoting.** Fields containing a comma, double-quote, or newline are wrapped in double-quotes, with inner double-quotes doubled. This is the core logic and the primary unit under test (Attendee names are the realistic source of commas/quotes).
- **Encoding: UTF-8 BOM + CRLF.** The file is emitted with CRLF line endings (RFC-4180) and a leading UTF-8 BOM so Excel on Windows decodes accented names correctly (Google Sheets ignores the BOM). The BOM is applied at the file/Blob boundary, not baked into the pure CSV text.
- **Filename.** `day-of-data-leads-YYYY-MM-DD.csv`, where the date is the export date. Repeated same-day exports are de-duplicated by the browser/OS (`(1)`, `(2)`).
- **Empty state.** Export is disabled when the Vendor has 0 Leads.
- **Non-destructive.** Export reads the current Leads; it never mutates, clears, or persists anything.
- **Modules (new/changed):**
  - **New pure module** in `src/lib/` — `toCsv(leads): string` (header + RFC-4180-quoted rows, CRLF) and `exportFilename(date): string`. Pure, no DOM, no clock passed-in like `addLead`'s `scannedAt`.
  - **New thin effect adapter** — assembles the `File`/`Blob` (BOM + CSV text, `text/csv` MIME) and performs the share-or-download decision behind injectable `canShare`/`share`/`download` capabilities (defaulting to the real `navigator`/anchor implementations), mirroring how `App` already injects `createScanner` for tests.
  - **`App` / Home** — renders the Export button beside Scan, disabled at 0 Leads, wired to the adapter; accepts the export capabilities as optional injected props (default real), exactly like the existing `createScanner` seam.
- **Reuse, don't duplicate.** Export consumes the existing `Lead[]` (`src/lib/leads.ts`) already loaded/persisted by the app; it does not re-read storage or re-derive Leads.

## Testing Decisions

- **Test external behavior, not implementation.** Assert what `toCsv` returns for given Leads, and which hand-off effect fires for a given capability — never internal structure. Keep all real logic pure so tests need no DOM, no share sheet, no real download.
- **`toCsv` is the primary unit under test (new).** Cases to cover:
  - a single Lead → header row + one correctly-ordered data row;
  - multiple Leads → rows in scan order, CRLF-terminated;
  - a name containing a comma → the field is quoted;
  - a name containing a double-quote → quoted with the inner quote doubled;
  - a name containing a newline → quoted (defensive);
  - zero Leads → header row only (the adapter is what disables the button; `toCsv([])` is still well-defined);
  - `Scanned At` column carries the Lead's `scannedAt` verbatim.
- **`exportFilename` (new).** Given a date, returns `day-of-data-leads-YYYY-MM-DD.csv`. The date is passed in (no hidden clock), mirroring `scannedAt`.
- **File assembly (new).** The assembled `File`/`Blob` starts with the UTF-8 BOM and carries a `text/csv` type; the filename matches `exportFilename`.
- **Hand-off adapter (new, injected).** With `canShare` returning true, `share` is called with a `File` whose name + type are correct and `download` is not; with `canShare` false, `download` is called with the file and `share` is not; a `share` that rejects with an abort/cancel resolves quietly (no thrown error, no toast of failure).
- **Home wiring (existing seam).** Through `App` render tests (prior art: `App.test.tsx`, `App.scan.test.tsx`): the Export button is **disabled with 0 Leads** and **enabled with ≥1**; clicking it invokes the injected hand-off with the current Leads. Uses the same injected-capability pattern as `createScanner` in the scan tests.
- **Prior art.** `src/lib/vcard.test.ts` and `src/lib/scan.test.ts` (pure in/out, explicit edge/empty cases) are the model for `toCsv`. `src/App.scan.test.tsx` (inject a fake capability, drive the public path, assert behavior) is the model for the adapter + Home wiring.

## Out of Scope

- **`mailto:` / inline-body email** — rejected (ADR-0003); a CSV file is the deliverable.
- **Vendor identity / profile** — no name/company field, no settings screen, no "Collected By" column; deliberately anonymous.
- **Choosing columns, date ranges, or filtering which Leads export** — v1 exports all Leads, all three columns.
- **Other formats** (XLSX, vCard, JSON) — CSV only.
- **Server upload, cloud sync, or a central store** — everything stays local (spec §6).
- **Editing/deleting Leads before export, or clearing Leads after export** — Export is read-only; delete/edit remains deferred (spec §5).
- **Per-export history or re-download of a past export** — each Export regenerates from current Leads.
- **A success confirmation/toast** — optional polish; the OS share sheet / browser download is itself the feedback. Not required for v1.

## Further Notes

- This PRD is intentionally local (`docs/prd/`), matching the README, the scan PRD, and the ADRs — no issue tracker is used for this project.
- The one hard-to-reverse decision (Web Share with download fallback, and the rejection of `mailto:`) is recorded as **ADR-0003**; the full grilling transcript, including the conventional choices adopted without live debate (empty-state, filename, ordering, encoding), is in `docs/qa-sessions/export-feature-grilling.md`.
- Build order suggestion: TDD the pure `toCsv` first (RFC-4180 quoting is the heart), then `exportFilename`, then the BOM/`File` assembly + injectable share/download adapter, then the Home Export button (disabled at 0 Leads) on top. Verify live with Playwright MCP (download path on desktop; assert the share path via an injected/stubbed `navigator.share`) and, on real hardware, the share sheet → Mail attachment over the `npm run share` tunnel.
