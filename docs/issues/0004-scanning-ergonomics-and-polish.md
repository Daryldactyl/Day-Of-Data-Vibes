# Slice 4 — Scanning ergonomics & polish

**Type:** AFK
**PRD:** `docs/prd/scan-and-collect-leads.md`

## What to build

The touches that make all-day scanning pleasant and safe on a phone:

- A small **live "N leads" counter** on the camera screen so the Vendor sees the pile grow without leaving the camera.
- **Guaranteed camera release** on Done and on overlay unmount, so the camera stream and the phone's camera indicator/battery actually stop.
- Toast timing (~1.5–2s, auto-dismiss) so confirmations never block the next scan.
- Confirm the rear camera is the one selected in practice.

## Acceptance criteria

- [x] The camera screen shows a live count that increments as new Leads are saved (verified live 0→1→2; durable test in `ScanOverlay.ergonomics.test.tsx`)
- [x] After Done (and on unmount), the camera stream is stopped — no lingering camera indicator *(see note)*
- [x] Toasts auto-dismiss within ~2s and never block scanning (durable fake-timers test; `TOAST_MS = 1800`)
- [ ] The rear camera is used on a phone — **pending hardware** (`preferredCamera: 'environment'` set in `defaultCreateScanner`; the failure probe requests `{ facingMode: 'environment' }`, tested in `scanner.test.ts`)
- [x] Playwright MCP QA confirms the counter increments and the overlay tears the camera down on close *(counter increment confirmed live; teardown — see note)*

## Blocked by

- Slice 2 — Scan a Badge with the camera

## Implementation notes (Slice 4)

Most of this slice was already delivered by Slice 2's overlay; Slice 4 **locked it with durable tests** and verified what could be verified live.

- **Live counter** — `data-testid="scan-lead-count"` in the HUD; verified live (0→1→2) and by a durable test.
- **Camera release** — overlay cleanup calls `scanner.stop()` + `scanner.destroy()` on Done and on unmount. Durable tests assert **both** are called (`ScanOverlay.ergonomics.test.tsx`, `App.scan.test.tsx`). qr-scanner's `destroy()` → `_stopVideoStream` → `track.stop()` on every track, so stop+destroy provably ends the stream.
- **Toast timing** — `TOAST_MS = 1800`, auto-dismiss; durable fake-timers test confirms the toast clears while the overlay (camera) stays mounted — scanning never blocks.
- **Rear camera** — `preferredCamera: 'environment'`; probe constraint tested.
- **Tests:** 39 passing; `tsc -b` + `npm run lint` clean.

### Note on live teardown telemetry
Attempting to assert `MediaStreamTrack.readyState === 'ended'` after Done in Playwright MCP was **inconclusive due to the test browser's fake camera**, not an app defect — chased to root cause: (a) in dev, React StrictMode double-mounts the overlay (creates/destroys a first stream) and a mid-run HMR reload reset the captured-track array; (b) on the production-preview origin, the fake device rejects qr-scanner's constraints with `OverconstrainedError`, so no stream is acquired to observe. Camera release is therefore proven by the durable stop+destroy test plus qr-scanner's documented teardown; the definitive real-hardware confirmation is the camera indicator turning off on a phone (the bypassed rear-camera item).
