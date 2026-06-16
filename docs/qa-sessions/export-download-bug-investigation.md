# Export download bug — investigation notes

> Captured before grilling the fix. Discipline: **chase to root cause, never assume.**
> Source of report: the Vendor (user) — clicking **Export** produced an unusable file.

## The symptom (as reported)

Clicking **Export** on the running app downloads a file named like a **UUID with no extension**
(e.g. `a1b2c3d4-…`) instead of `day-of-data-leads-YYYY-MM-DD.csv`. A no-extension UUID file
**cannot be opened in Excel** by a non-technical Vendor — Export, a core v1 feature, is broken in
practice on the reporter's environment.

Reporter's environment: **macOS desktop browser** (exact browser TBD — first grill question).

## What the code does today

`defaultExportLeads(leads)` (src/lib/exportCsv.ts) builds the CSV `File` (correct name + BOM) and
calls `shareOrDownload(file, caps)` where the real caps are:

```
canShare: (f) => !!navigator.canShare && navigator.canShare({ files: [f] }),
share:    (f) => navigator.share({ files: [f] }),
download: downloadFile,
```

`shareOrDownload` branches **purely on `caps.canShare(file)`**:
- `canShare` true  → `navigator.share({ files: [file] })`  (the "mobile share sheet → Mail" path, ADR-0003)
- `canShare` false → `downloadFile(file)`                    (object-URL + `<a download>` anchor)

## Measured facts (Playwright, this macOS machine, Chromium)

1. **`navigator.canShare({ files: [csv] })` === `true`** on this desktop macOS machine.
   → Therefore Export takes the **share** branch (`navigator.share`), **not** the download branch.
2. The **download** branch, when forced, names the file **correctly**:
   Playwright captured `suggestedFilename = "day-of-data-leads-2026-06-16.csv"`. So `downloadFile`
   and the file's `name`/BOM are **not** the bug.
3. `navigator.share` is present (`typeof === 'function'`) and `canShare` is present too.

## Root-cause hypothesis (evidence-based, pending one confirmation)

**The share-vs-download decision gates on `canShare` _capability_, but capability ≠ "this is a phone."**
Desktop macOS browsers (Chrome/Edge/Safari) all report `canShare({ files }) === true`, so a **desktop**
Vendor is wrongly routed into the **mobile** Web Share flow instead of a clean download. ADR-0003's
*intent* was: share sheet for **mobile** (→ Mail attach), download for **desktop** — but the capability
check can't tell them apart, so desktop takes the share path. The desktop system-share flow writes a
temp copy named by an internal **UUID** and drops the `.csv` extension → the unusable file the Vendor sees.

### Why this slipped past Slice 5/6 QA (the test gap)

- Slice 5 QA exercised only the **download** path.
- Slice 6 QA exercised the share path with a **stubbed** `navigator.share` (it asserted we *call* share
  with the right File — it could not drive the real OS share sheet headlessly).
- **The real `navigator.share()` on desktop hardware was never exercised.** That is exactly the path
  the Vendor hits, and exactly where the bug lives. (This is the "bypassed real-hardware check" coming due.)

### Still to confirm before declaring root cause final (no assuming)

- The reporter's **exact browser**, and whether clicking Export popped a **system share sheet** (confirms
  the share branch ran) vs. a silent download (would point elsewhere).
- The exact bad filename pattern they saw (UUID vs. other), to pin the share implementation's behavior.
- Playwright's Chromium `navigator.share` is **non-interactive**, so the UUID file could not be reproduced
  headlessly — the UUID production is browser/OS-specific and must be confirmed against the real browser.

## Implication for the fix (to be resolved in the grill — likely revisits ADR-0003)

The decision rule "share when `canShare` is true" is too broad. Candidate directions to grill:
- Gate the share path on an actual **mobile/touch** signal, not bare `canShare` capability; desktop always downloads.
- Or prefer **download** as the default everywhere and only offer share on mobile.
- Either way: validate the **real** chosen path on **real hardware** (desktop download + a phone share) — close the gap that hid this.
