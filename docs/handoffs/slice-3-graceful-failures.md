# Handoff — Slice 3: Graceful failures

**Read first:** `docs/working-agreements.md` (disciplines — follow verbatim), `docs/issues/0003-graceful-failures.md` (the slice), `docs/prd/scan-and-collect-leads.md` (user stories 17–18), `CONTEXT.md`, `docs/adr/0001` + `0002`.

This handoff lets Slice 3 be implemented in a **fresh context** after `/clear`.

---

## Where things stand (Slices 1 & 2 = DONE)

- **`src/lib/scan.ts`** — `handleScan(leads, rawQrText, scannedAt) → { leads, notification: 'saved'|'duplicate'|'not-a-badge', contact }`. Pure, TDD'd (`src/lib/scan.test.ts`).
- **`src/ScanOverlay.tsx`** — full-screen camera overlay: `<video>`, HUD (live count + Done), toasts, and **a generic** camera-error block with Retry. Camera lifecycle in a mount-once effect; `stop()`+`destroy()` on teardown.
- **`src/scanner.ts`** — injectable `CreateScanner` factory (real `qr-scanner` by default; a fake in tests). DEV-only `window.__scanBadge(text)` decode seam for live Playwright injection.
- **Tests: 20 passing** (`npm test`); `tsc -b` + `npm run lint` clean.

## What Slice 3 already inherits from Slice 2

- **Not-a-badge is DONE** — `parseVCard` → null → neutral "Not a badge" toast, no save, camera keeps running. Verified live. **No new work** beyond keeping a durable test for it.
- A **generic** start()-failure path exists (one catch-all message + Retry). Slice 3 must **replace it with classified, case-specific messaging**.

## The genuine gap (this slice)

1. **Permission denied** must show a permission-specific calm message + how-to-enable + Retry.
2. **No camera** (`QrScanner.hasCamera()` false) must show a distinct "no camera found" message — ideally without even triggering a permission prompt.
3. **QA** the denied path (and keep the not-a-badge QA).

## Plan (approach: classify the failure as pure logic, then wire)

### Step 1 — TDD a pure error classifier (the real logic)
New module **`src/lib/cameraError.ts`**:
```
type CameraErrorKind = 'denied' | 'no-camera' | 'other'
describeCameraError(error: unknown) → { kind: CameraErrorKind; message: string }
```
Classification (getUserMedia / qr-scanner failure shapes):
- **denied** — `DOMException.name` ∈ {`NotAllowedError`, `SecurityError`} or message ~ /permission denied/i.
- **no-camera** — `DOMException.name` ∈ {`NotFoundError`, `OverconstrainedError`, `DevicesNotFoundError`} or qr-scanner's string `'Camera not found.'` / message ~ /no camera|camera not found/i.
- **other** — everything else (e.g. `NotReadableError` = camera busy, unknown).
Export the per-kind messages (e.g. `CAMERA_MESSAGES`) so the no-camera pre-check and the catch share one source of truth.

TDD cycles (one test → one impl, `src/lib/cameraError.test.ts`), mirroring `vcard.test.ts` style:
1. `NotAllowedError` DOMException → `kind: 'denied'`.
2. `NotFoundError` DOMException → `kind: 'no-camera'`.
3. qr-scanner string `'Camera not found.'` → `kind: 'no-camera'`.
4. an unknown error → `kind: 'other'`.
5. each kind carries a non-empty, calm `message`.

### Step 2 — Wire into the overlay (thin)
- Add an injectable `checkHasCamera?: () => Promise<boolean>` (default `QrScanner.hasCamera` via `scanner.ts`) so the no-camera path is testable without a device.
- On mount: `await checkHasCamera()`; if false → set the `no-camera` error and **don't** start (no permission prompt). Else `start()`; on rejection → `setError(describeCameraError(e))`.
- Store `CameraErrorInfo | null` in state; render its message. Retry re-runs the check+start.

### Step 3 — QA (durable + live, per working agreements)
- **Durable RTL** (`src/ScanOverlay.error.test.tsx` or extend the scan-flow test): inject a `createScanner` whose `start()` rejects with a `NotAllowedError` → assert the denied message renders (role="alert"); inject `checkHasCamera: async () => false` → assert the no-camera message and that `start()` was **not** called; keep a not-a-badge assertion.
- **Live Playwright MCP (non-headless)**: drive the denied path through the injected failing scanner (or via the `createScanner` seam exposed for QA) and screenshot the calm message; re-confirm not-a-badge. (Real permission-deny on a phone is the bypassed hardware check.)

## Acceptance criteria (from issue 0003)
Denying permission → calm message + retry/how-to (no crash/blank); no-camera device → clear "no camera found"; non-Badge QR → brief "Not a badge", no Lead, keeps scanning; Playwright QA covers not-a-badge + permission-denied messaging.

## Exact next action
1. `npm test` to confirm 20 green.
2. Step 1 cycle 1: failing test in `src/lib/cameraError.test.ts` for `NotAllowedError → 'denied'`. Red → green → repeat.
3. Then Step 2 wire, Step 3 QA. **Never assume; chase bugs to root cause.**
