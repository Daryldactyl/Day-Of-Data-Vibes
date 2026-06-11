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

- [ ] The camera screen shows a live count that increments as new Leads are saved
- [ ] After Done (and on unmount), the camera stream is stopped — no lingering camera indicator
- [ ] Toasts auto-dismiss within ~2s and never block scanning
- [ ] The rear camera is used on a phone
- [ ] Playwright MCP QA confirms the counter increments and the overlay tears the camera down on close

## Blocked by

- Slice 2 — Scan a Badge with the camera
