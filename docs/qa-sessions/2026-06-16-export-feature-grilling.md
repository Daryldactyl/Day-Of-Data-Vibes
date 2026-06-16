# Q&A Session — Export Feature Grilling

**Date:** 2026-06-16
**Skill:** `/grill-with-docs`
**Scope:** The Vendor Export feature — a deliberate button press that builds a CSV of all collected Leads and hands it off so the Vendor can email it to their sales/recruiting team.
**Outcome docs:** `CONTEXT.md` (Export entry sharpened), `docs/adr/0003-export-csv-web-share.md`. PRD to follow via `/to-prd`.

This file is the raw record of the grilling: the questions asked, the recommendations given, and the answers chosen. Nothing here is lost even though the decisions also live (summarized) in CONTEXT.md, the ADR, and the forthcoming PRD.

---

## Questions asked & answered live

### Q1 — Delivery: CSV download vs `mailto:` vs both
**Asked:** How should Export deliver the CSV? Key constraint surfaced: a `mailto:` link can only prefill recipient/subject/body — it **physically cannot attach a file**. So the only thing that actually hands the Vendor a usable Leads file is an in-memory CSV; `mailto:` body text is length-limited and breaks past ~50–100 Leads (URL length cap).

**Recommendation given:** CSV file only; defer `mailto:`.

**Answer:** **"CSV download only"** — produce a real CSV file; no `mailto:`. (Mechanism refined in Q4.)

---

### Q2 — CSV columns & header row
**Asked:** Which `Lead` fields land in the CSV (`name`, `email`, `scannedAt` are all captured), and is there a header row? The consumer is a sales/recruiting team importing into a CRM/spreadsheet. RFC-4180 quoting of names containing commas/quotes is a given.

**Recommendation given:** All three fields — `Name, Email, Scanned At` — with a friendly header row; `scannedAt` as ISO 8601 (sorts correctly, unambiguous; gives provenance and is trivial to ignore).

**Answer:** **"Name, Email, Scanned At + header"** — adopted, ISO 8601 timestamp.

---

### Q3 — Vendor identity on the export
**Asked:** Should the export be labeled with the Vendor's own name/company, or stay anonymous? Context: ~10 Vendors each scan on their own phone and email their own list, so the file is already identified by the inbox it's sent from. The app captures **no** Vendor identity today (no accounts/login — spec §6).

**Recommendation given:** Anonymous — the CSV holds only Lead rows; introducing a Vendor name/company would add a persisted "Vendor identity" concept + settings UI that v1 deliberately avoids.

**Answer:** **"Anonymous — just the Leads"** — no Vendor-profile concept; exports distinguished by a date-stamped filename. (Resolves the spec §9 open question with an explicit "no.")

---

### Q4 — Hand-off mechanism: share sheet vs download
**Asked:** How does the CSV get from the app into an email? The **Web Share API** (`navigator.share({ files })`) opens the phone's native share sheet with the CSV as a real attachment — tap Mail → attached, ready to send — which directly serves the "email it to the sales team" goal that `mailto:` couldn't. It isn't supported on most desktops, so it needs a download fallback.

**Recommendation given:** Feature-detect `navigator.canShare({ files })`: share sheet on mobile, **fall back** to a Blob download on desktop/unsupported. Best phone UX, robust everywhere.

**Answer:** **"Share sheet, fall back to download"** — adopted. Recorded as **ADR-0003**. This refines Q1: the CSV file is handed off via the share sheet on mobile / a download on desktop, and natively solves "email it" (share sheet → Mail attaches the CSV). It also sidesteps iOS Safari's flaky Blob-download behavior.

---

### Q5 — Encoding for Excel compatibility
**Asked:** Attendee names may contain accents (José, Nguyễn, Müller). Excel on Windows mis-decodes a plain UTF-8 CSV ("José" → "JosÃ©") unless the file starts with a UTF-8 BOM. The sales team will very likely open these in Excel/Sheets.

**Recommendation given:** Prepend a UTF-8 **BOM** and use **CRLF** line endings (RFC-4180). Excel reads accents correctly; Sheets ignores the BOM. Trade-off: a few naive parsers choke on a leading BOM — rare for this audience.

**Answer:** **"UTF-8 BOM + CRLF"** — adopted.

---

## Decided by default — conventional choices, not grilled

These were taken as the obvious default and stated rather than debated; all are cheap to reverse, so none warranted an ADR.

- **Empty state:** Export is **disabled at 0 Leads** — nothing to generate.
- **Filename:** `day-of-data-leads-YYYY-MM-DD.csv` using the **export date**. (Multiple same-day exports → the browser de-dupes with `(1)`, `(2)`.)
- **UI placement:** an **Export** button on **Home, beside Scan**.
- **Order:** the CSV **preserves scan order**; Export is **read-only / non-destructive** (does not clear or alter Leads).
- **Timestamp:** `scannedAt` exported as the **stored ISO 8601 string**.
- **Real logic to TDD:** a pure `toCsv(leads): string` (header + RFC-4180-quoted rows, CRLF). The BOM, `Blob`/`File`, share-vs-download, and filename live at the I/O boundary on top of it — mirroring how `vcard.ts` (pure) sits under the camera glue.

---

## Net decisions (summary)

| # | Decision | Where recorded |
|---|----------|----------------|
| 1 | CSV **file**, not `mailto:` (can't attach) | ADR-0003, this file |
| 2 | Columns `Name, Email, Scanned At` + header; ISO 8601 | PRD, this file |
| 3 | **Anonymous** export — Leads only, no Vendor identity | PRD, this file |
| 4 | Hand-off via **Web Share** (share sheet) → **download** fallback | ADR-0003 |
| 5 | **UTF-8 BOM + CRLF**, RFC-4180 quoting | PRD, this file |
| 6 | Export disabled at 0 Leads; on Home beside Scan; preserves scan order; non-destructive | PRD, this file |

**Next step:** `/to-prd` (save locally under `docs/prd/`, like the scan PRD), then build test-first via `/tdd` — start with the pure `toCsv(leads)` enforcing RFC-4180 quoting, BOM/CRLF at the I/O boundary, then the Web-Share/download hand-off + the Home Export button.
