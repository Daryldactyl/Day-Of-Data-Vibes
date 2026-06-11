# Slice 3 — Graceful failures

**Type:** AFK
**PRD:** `docs/prd/scan-and-collect-leads.md`

## What to build

Calm, non-crashing handling for the three things that go wrong on the camera screen:

- **Permission denied** — a clear message explaining the camera was blocked, with a retry / how-to-enable hint.
- **No camera available** (`QrScanner.hasCamera()` is false) — a clear "no camera found" message instead of a blank or frozen overlay.
- **QR that isn't a Badge** (`parseVCard` returns `null`) — a brief neutral "Not a badge" hint; do not save anything, do not stop the camera, keep scanning.

## Acceptance criteria

- [ ] Denying camera permission shows a calm explanatory message with a retry/how-to path, not a crash or blank screen
- [ ] A device with no usable camera shows a clear "no camera found" message
- [ ] Scanning a non-Badge QR shows a brief "Not a badge" hint, adds no Lead, and keeps scanning
- [ ] Playwright MCP QA covers the not-a-badge path and the permission-denied messaging

## Blocked by

- Slice 2 — Scan a Badge with the camera
