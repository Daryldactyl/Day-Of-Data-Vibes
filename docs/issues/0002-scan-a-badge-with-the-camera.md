# Slice 2 — Scan a Badge with the camera

**Type:** AFK
**PRD:** `docs/prd/scan-and-collect-leads.md`

## What to build

The full scan spine on top of Slice 1's logic. Tapping **Scan** on Home opens a full-screen camera overlay (toggled by a `scanning` state flag — no router, per the URL-first constraint). `qr-scanner` runs on the rear camera (`preferredCamera: 'environment'`). On a successful decode, the raw QR string is parsed by the existing `parseVCard`; a valid Badge is passed to `addLead`, persisted, and confirmed with a non-blocking toast — green **"Saved: <name>"** for a new Lead, a visually distinct **"Already saved: <name>"** for a dedup hit. The camera stays open across many scans. A **Done** button calls `qr-scanner.stop()` and returns to the Leads list.

Because of email dedup, a Badge held in frame (~25 decodes/sec) only ever produces one Lead — no separate in-frame guard is needed for correctness.

## Acceptance criteria

- [ ] Tapping Scan opens a full-screen camera overlay using the rear camera
- [ ] Scanning a `sample-badges/` Badge adds a Lead and shows "Saved: <name>"
- [ ] Re-scanning an already-saved Attendee shows "Already saved: <name>" and adds no row
- [ ] A Badge lingering in frame produces exactly one Lead
- [ ] Tapping Done stops the camera and returns to the Leads list, which shows the new Lead
- [ ] Verified live by scanning a sample Badge over the `npm run share` tunnel (HTTPS)
- [ ] A Playwright MCP QA pass exercises the Scan → list flow (camera input stubbed where a real camera isn't available)

## Blocked by

- Slice 1 — Lead collection core
