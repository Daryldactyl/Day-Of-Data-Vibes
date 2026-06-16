# Handoff — Slice 7: Fix Export on desktop (download, not the broken share path)

**Read first (verbatim):** `docs/working-agreements.md` (disciplines), `docs/issues/0007-export-desktop-download-fix.md` (this slice), `docs/adr/0003-export-csv-web-share.md` **(read the "Revision (2026-06-16)" section — it is the rule)**, `docs/qa-sessions/2026-06-16-export-download-bug-investigation.md` (the root-cause evidence), `CONTEXT.md` (glossary).

Implement in a **fresh context** via `/tdd`. This is a **fix** layered on the already-merged Slices 5 & 6 — you are correcting one decision, not rebuilding Export.

---

## The bug (root cause — already established, do not re-litigate)

A Vendor on a **desktop** browser taps **Export** and gets a file named like a **UUID with no extension**
instead of `day-of-data-leads-YYYY-MM-DD.csv`. Measured fact: on macOS desktop, `navigator.canShare({ files })`
returns **`true`**, so the current code takes the **share** branch (`navigator.share`), whose desktop
implementation writes the UUID temp file. **`canShare` is a capability, not a device.** Windows Chrome/Edge
have the same problem. The download path itself is fine (it names files correctly — verified).

## The fix (ADR-0003 Revision rule)

Share **only on a confirmed mobile device**; **download on desktop and as the universal fallback**.
Bias every uncertain case toward download (download yields a correct `.csv` everywhere; a wrong "mobile"
guess re-enters the broken desktop-share path).

All changes are in **`src/lib/exportCsv.ts`** + its test **`src/lib/exportCsv.test.ts`**. **No App change**
(the `exportLeads?` seam already accepts a Promise and is unchanged).

### 1. New pure predicate `isMobileDevice` (the real new logic — TDD it first)

A pure function, navigator injected so it's unit-testable against UA fixtures:

```
interface NavLike { userAgent: string; userAgentData?: { mobile?: boolean } }
export function isMobileDevice(nav: NavLike): boolean
//   true  when nav.userAgentData?.mobile === true   (Android Chromium)
//      OR  /iPhone|iPod/i.test(nav.userAgent)        (iPhone Safari)
//   false otherwise — macOS, Windows, Linux, iPad, Android tablets all → false (→ download)
```

Conservative on purpose: iPad (reports as "Mac") and Android tablets fall through to **false → download**
(tablet downloads work; not worth a fragile `MacIntel + maxTouchPoints` hack).

### 2. Extend the decision seam `ShareCaps` + `shareOrDownload`

Add an injected `isMobile` capability and gate share on it:

```
interface ShareCaps {
  isMobile: () => boolean          // NEW
  canShare: (file: File) => boolean
  share: (file: File) => Promise<void>
  download: (file: File) => void
}
// decision: share ONLY if caps.isMobile() && caps.canShare(file); else download.
// AbortError → quiet (unchanged). Non-abort share failure → download (unchanged).
```

### 3. Wire real caps in `defaultExportLeads`

```
isMobile: () => isMobileDevice(navigator),
canShare: (f) => !!navigator.canShare && navigator.canShare({ files: [f] }),
share:    (f) => navigator.share({ files: [f] }),
download: downloadFile,
```

### 4. Harden `downloadFile` (download is now the PRIMARY desktop path)

Defer the object-URL revoke past the click — an **immediate** `URL.revokeObjectURL` can truncate the
download on Safari/Firefox. Schedule it (e.g. `setTimeout(() => URL.revokeObjectURL(url), 0)` or longer),
do **not** revoke synchronously. (Still QA'd live, not unit-asserted, like before.)

## TDD cycle list (one test → minimal code each; mirror `vcard.test.ts` style)

In `src/lib/exportCsv.test.ts`:
1. `isMobileDevice` → **true** for an iPhone UA fixture.
2. → **true** for Android (`{ userAgentData: { mobile: true } }`, desktop-ish UA).
3. → **false** for a macOS UA (no `userAgentData.mobile`, not iPhone). ← the reported bug's platform.
4. → **false** for Windows UA, Linux UA, iPad UA, and an Android **tablet** (`userAgentData.mobile === false`).
5. `shareOrDownload` → **shares** when `isMobile() && canShare()` are both true (assert `share` called with the File, `download` not).
6. → **downloads** when `canShare()` true but `isMobile()` **false** (assert `download` called, `share` NOT). ← **this is the fix; it must fail before the change and pass after.**
7. → **downloads** when `isMobile()` true but `canShare()` false.
8. AbortError on share → resolves quietly, no download (unchanged — keep passing).
9. Non-abort share failure → download fallback (unchanged — keep passing).
10. Refactor with green.

**Migration note (do this or the suite breaks):** the existing `shareOrDownload` tests in
`exportCsv.test.ts` construct caps as `{ canShare, share, download }` with no `isMobile`. Under the new gate,
the share-path tests must add **`isMobile: () => true`** to still exercise share. Update them as part of the
relevant cycle — don't leave them asserting the old rule.

## Do NOT change
- `toCsv`, `exportFilename`, `buildCsvFile`, the BOM/CRLF/RFC-4180 logic (all correct, all tested).
- The `App` `exportLeads?` seam and `App.export.test.tsx` (untouched — still passes).
- The AbortError-quiet and non-abort→download semantics (preserve exactly).

## Live QA (the ORCHESTRATOR runs this on inspection — note what it will assert)
- **Real desktop proof (the actual bug):** on this macOS machine (`canShare` true), drive the **real Export
  button** in Playwright and assert it **downloads** `day-of-data-leads-….csv` (correct name + BOM bytes) and
  does **not** call `navigator.share`. Stub `navigator.share` to a spy to prove it's never invoked on desktop.
- **Mobile-branch proof:** override the page UA to an iPhone + stub `navigator.share`; assert Export takes the
  **share** branch with the right File; a desktop-UA run downloads.
- Real-hardware phone check is optional/user-run (over `npm run share`).

## Acceptance criteria
See `docs/issues/0007-export-desktop-download-fix.md`. Plus `npm test` all green, `tsc -b` + `npm run lint` clean.

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time. Behavior through public interfaces. **Make no assumptions; the
root cause is already proven — implement the corrected rule.** Glossary: Lead/Export/Vendor. Respect **ADR-0003
as revised (2026-06-16)**. Report faithfully (real test output).

## Exact next action
1. `npm test` → confirm 55 green baseline.
2. Cycle 1: failing test for `isMobileDevice` (iPhone UA → true). Red → green → continue down the list.
3. Land cycle 6 (desktop + canShare → download) — the regression that fixes the bug. Then wire
   `defaultExportLeads` + harden `downloadFile`. Hand back to the orchestrator for live QA.
