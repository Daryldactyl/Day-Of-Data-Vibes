# Slice 7 — Fix Export on desktop (download instead of the broken share path)

**Type:** AFK
**PRD:** `docs/prd/export-leads-to-csv.md`
**ADR:** `docs/adr/0003-export-csv-web-share.md` (Revision 2026-06-16)
**Investigation:** `docs/qa-sessions/2026-06-16-export-download-bug-investigation.md`

## What to build

Fix the reported Export bug: on a **desktop** browser, tapping **Export** downloads a file named like a
**UUID with no extension** instead of `day-of-data-leads-YYYY-MM-DD.csv` — unopenable in Excel. Root cause:
the share-vs-download decision gates on `navigator.canShare({ files })`, which is **`true` on desktop
macOS and Windows Chrome/Edge/Safari**, so a desktop Vendor is wrongly routed into the mobile
`navigator.share` flow (which writes the UUID temp file). `canShare` is a *capability*, not a *device*.

Change the rule so Export uses the share sheet **only on a confirmed mobile device**, and **downloads on
desktop and as the universal fallback** (ADR-0003 Revision). Add a conservative, pure `isMobile` predicate
and gate share on `isMobile() && canShare(file)`. Bias every uncertain case toward **download** (it yields
a correct `.csv` on every platform; a wrong "mobile" guess re-enters the broken desktop-share path). Also
harden `downloadFile` by deferring `URL.revokeObjectURL` past the click (an immediate revoke can truncate
the download on Safari/Firefox — and download is now the **primary** desktop path).

The cancel (AbortError → quiet) and non-abort-share-failure (→ download) behaviors are unchanged.

## Acceptance criteria

- [x] A pure, tested `isMobile` predicate returns **true** for iPhone (UA) and Android Chromium
      (`navigator.userAgentData.mobile === true`), and **false** for macOS, Windows, Linux, iPad, and
      Android-tablet user agents — tested directly against real UA-string / UA-CH fixtures
- [x] The Export decision shares **only** when `isMobile() && canShare(file)` is true; **all** other
      combinations (desktop+canShare, desktop+no-canShare, mobile+no-canShare) **download** — covered by a
      durable unit matrix
- [x] A cancelled share (AbortError) still resolves quietly (no download, no error); a non-abort share
      failure still falls back to download — unchanged, still tested
- [x] `downloadFile` defers `URL.revokeObjectURL` past the anchor click (no synchronous revoke); the
      download still produces the BOM-prefixed `text/csv` named `day-of-data-leads-YYYY-MM-DD.csv`
- [x] **Real desktop proof (the actual bug):** a Playwright MCP pass on this macOS machine — where
      `canShare({ files })` is `true` — drives the **real Export button** and asserts it **downloads**
      `day-of-data-leads-….csv` (correct name, BOM bytes) and does **not** call `navigator.share`
- [x] **Mobile-branch proof:** a Playwright pass that overrides the UA to an iPhone and **stubs**
      `navigator.share` asserts the **share** branch fires with the right `File`; a desktop-UA run downloads
- [x] `npm test` all green, `tsc -b` + `npm run lint` clean
- [x] Verified on real hardware: a phone over `npm run share` → Export → share sheet → Mail attaches the
      CSV. **Confirmed by the Vendor on a real phone (2026-06-16)** over the Cloudflare tunnel.

## Implementation notes (Slice 7)

- **New pure logic** `isMobileDevice(nav)` in `src/lib/exportCsv.ts` — `nav.userAgentData?.mobile === true ||
  /iPhone|iPod/i.test(nav.userAgent)`. Navigator injected so it's unit-tested against real UA fixtures
  (iPhone, Android-UA-CH, macOS, Windows, Linux, iPad, Android-tablet). `NavLike.userAgentData` widened to
  `{ mobile?: boolean } & Record<string, unknown>` so the real `navigator` stays structurally assignable
  (the DOM `NavigatorUAData` type doesn't declare `mobile`).
- **Decision seam** — `ShareCaps` gained an injected `isMobile: () => boolean`; `shareOrDownload` now shares
  **only if** `caps.isMobile() && caps.canShare(file)`, else downloads. AbortError-quiet and non-abort→download
  preserved. `defaultExportLeads` wires `isMobile: () => isMobileDevice(navigator)`.
- **Hardened** `downloadFile`: `URL.revokeObjectURL` deferred via `setTimeout(…, 0)` (an immediate revoke can
  truncate the download on Safari/Firefox; download is now the primary desktop path).
- **Verified:** 60 tests green (was 55; +5), `tsc -b` + `npm run lint` clean. **Live Playwright QA on this
  macOS machine** — where `navigator.canShare({ files })` is genuinely `true`: the real Export button
  **downloaded** `day-of-data-leads-2026-06-16.csv` with BOM bytes `EF BB BF`, comma-name quoted, accented
  name intact, and `navigator.share` was called **0×** (the bug fix). A UA-spoofed iPhone run took the
  **share** branch — `navigator.share` called 1× with the correct `text/csv` `File`, no download.
- Implemented by a subagent from `docs/handoffs/2026-06-16-slice-7-export-desktop-download-fix.md`;
  independently inspected (re-read the code, re-ran the suite/tsc/lint, drove both live Playwright branches).
- Root cause + evidence: `docs/qa-sessions/2026-06-16-export-download-bug-investigation.md`. Rule recorded in
  `docs/adr/0003-export-csv-web-share.md` (Revision 2026-06-16).

## Blocked by

- None — Slices 5 & 6 (the Export spine + Web Share hand-off this corrects) are already merged

## Disciplines

Build via **`/tdd`** (red → green → refactor, one test at a time). Follow `docs/working-agreements.md`
**verbatim**: behavior through public interfaces; durable Vitest tests for the `isMobile` predicate + the
full share/download decision matrix (inject `isMobile`/`canShare`/`share`/`download` — extend the existing
`ShareCaps` seam in `src/lib/exportCsv.ts`), **plus** live Playwright MCP QA (real desktop download proof +
UA-simulated mobile share). Use the `CONTEXT.md` glossary (Lead, Export, Vendor). Respect **ADR-0003 (as
revised 2026-06-16)** — share only on confirmed mobile, download on desktop + as universal fallback.
Implement from a dedicated slice **`/handoff`** in fresh context. **Never assume; chase bugs to root cause.**
