# Export delivers a CSV via the Web Share API, falling back to download

The spec left Export's delivery open (CSV download vs `mailto:` vs both). We build the CSV in browser memory and hand it off with the **Web Share API** — `navigator.share({ files: [csv] })` when `navigator.canShare({ files: [csv] })` is true, which opens the phone's native share sheet with the CSV as a real attachment — and **fall back to a Blob `<a download>`** when it isn't (desktop, older browsers, local dev).

Why: the goal is for a Vendor to email their collected Leads to their sales team, and the app is phone-first. **`mailto:` was rejected** because it cannot attach a file — it can only prefill body text, which is length-limited and useless for hundreds of Leads. The Web Share path lets the Vendor tap **Mail** in the share sheet and get the CSV attached in a single gesture — the very thing `mailto:` couldn't do. It also **sidesteps iOS Safari's unreliable Blob-download-to-Files behavior** (the same URL-first / iOS-camera constraint that drove ADR-0001's no-PWA call), since on mobile the share sheet is used, not a download. The download fallback keeps desktop and local dev working. Web Share requires HTTPS and a user gesture — both already satisfied (the field URL is HTTPS via the `npm run share` tunnel; Export is a deliberate button tap, per `CONTEXT.md`).

Recorded because a future reader will see two code paths and wonder why we didn't "just download" or "just `mailto:`"; the choice is a real trade-off driven by an iOS constraint not visible in the code.

## Revision (2026-06-16) — share only on mobile; desktop must download

The original rule above — *"share when `navigator.canShare({ files })` is true, else download"* —
was **wrong on desktop**, and it shipped a real bug. A Vendor on a **macOS desktop browser** tapped
Export and received a file named like a **UUID with no extension** instead of `day-of-data-leads-….csv`
— unopenable in Excel. (See `docs/qa-sessions/2026-06-16-export-download-bug-investigation.md`.)

Root cause: **`canShare` reports a _capability_, not a _device_.** Desktop macOS and Windows
Chrome/Edge (and Safari) all answer `canShare({ files }) === true`, so a **desktop** Vendor was routed
into the **mobile** share flow (`navigator.share`), whose desktop implementation writes a UUID-named,
extension-less temp file. The share sheet is only the right experience on an actual **phone** (where it
attaches the CSV to Mail in one gesture, and where iOS Blob-download is unreliable — the reason share
exists at all). On desktop, a plain download is correct, expected, and Excel-openable on every OS.

**Corrected rule:** Export uses the share sheet **only on a confirmed mobile device**, and **downloads
on desktop and as the universal fallback**:

- `share` **only if** `isMobile() && canShare(file)` — where `isMobile` is a conservative predicate:
  `navigator.userAgentData?.mobile === true` (Android Chromium) **or** an iPhone/iPod UA. Mac, Windows,
  Linux, iPad, and Android tablets are all treated as desktop → **download**.
- Everything else → `downloadFile`. **Uncertainty fails toward download**, because a download yields a
  correct `.csv` on every platform, whereas a wrong "mobile" guess re-enters the broken desktop-share path.
- A **cancelled** share (AbortError) still resolves quietly; a **non-abort** share failure still falls
  back to download — both unchanged.

This is why, even though `canShare` returns `true` on a desktop, we deliberately **do not** share there.
The download path is also hardened (deferred `URL.revokeObjectURL`, since an immediate revoke can truncate
the download on Safari/Firefox — and download is now the primary desktop path, not just a fallback).
