# Slice 3 — Graceful failures

**Type:** AFK
**PRD:** `docs/prd/scan-and-collect-leads.md`

## What to build

Calm, non-crashing handling for the three things that go wrong on the camera screen:

- **Permission denied** — a clear message explaining the camera was blocked, with a retry / how-to-enable hint.
- **No camera available** (`QrScanner.hasCamera()` is false) — a clear "no camera found" message instead of a blank or frozen overlay.
- **QR that isn't a Badge** (`parseVCard` returns `null`) — a brief neutral "Not a badge" hint; do not save anything, do not stop the camera, keep scanning.

## Acceptance criteria

- [x] Denying camera permission shows a calm explanatory message with a retry/how-to path, not a crash or blank screen
- [x] A device with no usable camera shows a clear "no camera found" message
- [x] Scanning a non-Badge QR shows a brief "Not a badge" hint, adds no Lead, and keeps scanning
- [x] Playwright MCP QA covers the not-a-badge path and the permission-denied messaging (denied + no-camera + not-a-badge all driven live against the real overlay)

## Blocked by

- Slice 2 — Scan a Badge with the camera

## Implementation notes (Slice 3)

- **Pure classifier** `src/lib/cameraError.ts` — `describeCameraError(error) → { kind: 'denied'|'no-camera'|'other', message }`. Maps getUserMedia DOMExceptions (`NotAllowedError`/`SecurityError` → denied; `NotFoundError` → no-camera) and qr-scanner's `'Camera not found.'` string. TDD'd (`cameraError.test.ts`, 6 cases). `CAMERA_MESSAGES` is the single source of calm copy.
- **⚠️ Root-cause finding (verified live, not assumed):** qr-scanner's `start()` swallows **every** `getUserMedia` rejection in an empty `catch{}` and unconditionally throws the string `"Camera not found."` (see `_getCameraStream` in `node_modules/qr-scanner/qr-scanner.min.js`). So a real **permission denial** is indistinguishable from a missing camera at the `start()` layer — classifying `start()`'s error would wrongly show "No camera found" on a denied phone. **Fix:** on `start()` failure, re-probe `getUserMedia` directly via `diagnoseCamera()` (`src/scanner.ts`) to recover the true DOMException, then classify. Probe only runs on failure (happy path has zero overhead) and releases its stream immediately. Caught by the live Playwright QA; the original unit test gave false confidence because it fed a synthetic `NotAllowedError` the real library never emits.
- **Overlay** `src/ScanOverlay.tsx` — `startCamera()` tries `start()`, diagnoses on failure, renders the classified message + Retry. Re-entrancy guard prevents a double-tapped Retry from running concurrent `start()` calls on one scanner; `cancelled` flag prevents setState after Done/unmount.
- **Tests:** 36 passing (`npm test`); `tsc -b` + `npm run lint` clean. Durable coverage: classifier cases, the probe (`scanner.test.ts`, incl. the rear-`environment` constraint), the masking-bug reproduction, Retry re-entrancy, and unmount-mid-diagnosis.
- **Independent review** flagged the Retry re-entrancy race (fixed) and two test gaps (added); other findings triaged as non-issues.
