# Handoff — Slice 4: Scanning ergonomics & polish

**Read first:** `docs/working-agreements.md` (disciplines — verbatim), `docs/issues/0004-scanning-ergonomics-and-polish.md`, `docs/prd/scan-and-collect-leads.md` (stories 11, 13), `CONTEXT.md`.

## Where things stand (Slices 1–3 = DONE)

Much of Slice 4 was **already delivered** by Slice 2's overlay and hardened in Slice 3. This slice is mostly **verification + durable tests**, not new features.

- ✅ **Live "N leads" counter** on the camera screen (`data-testid="scan-lead-count"` in the HUD) — increments as Leads save. Already QA'd (1→2 live).
- ✅ **Camera release** — the overlay's mount-once effect cleanup calls `scanner.stop()` + `scanner.destroy()` on Done and on unmount (`ScanOverlay.tsx`).
- ✅ **Toast timing** — `TOAST_MS = 1800`, auto-dismiss, camera never pauses.
- ✅ **Rear camera** — `defaultCreateScanner` sets `preferredCamera: 'environment'`; the failure probe also requests `{ facingMode: 'environment' }` (tested in `scanner.test.ts`).
- **Tests: 36 passing**; `tsc -b` + `npm run lint` clean.

## The genuine gap (this slice)

Lock the above with durable tests and confirm release actually happens:

1. **Teardown test** — tapping **Done** calls both `stop()` and `destroy()` (camera + indicator/battery actually stop). Currently only `stop()` is asserted on Done; add `destroy()`.
2. **Toast auto-dismiss test** — with fake timers, a toast clears after ~`TOAST_MS`, and the camera/overlay stays mounted (never blocks scanning).
3. **Counter increment test** — already covered in `App.scan.test.tsx` (1 lead → 2 leads); confirm it stays.
4. **Live Playwright QA** — counter increments across distinct scans, and on **Done** the camera `MediaStreamTrack`s end (`readyState === 'ended'`) — proving the stream is released, not just hidden.
5. **Rear camera on a phone** — bypassed (hardware); `preferredCamera: 'environment'` is set in code.

## Acceptance criteria (issue 0004)
Live count increments; camera stream stops after Done/unmount (no lingering indicator); toasts auto-dismiss ~2s without blocking; rear camera on a phone; Playwright QA confirms counter increments + teardown on close.

## Disciplines
TDD any real logic (red→green→one test at a time). Test behavior through the public interface. Build durable tests for what we verify; also QA live with Playwright MCP. **Never assume; chase to root cause.** Glossary: Vendor/Attendee/Badge/Scan/Lead.
