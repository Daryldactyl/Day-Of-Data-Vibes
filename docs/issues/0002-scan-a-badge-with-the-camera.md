# Slice 2 — Scan a Badge with the camera

**Type:** AFK
**PRD:** `docs/prd/scan-and-collect-leads.md`

## What to build

The full scan spine on top of Slice 1's logic. Tapping **Scan** on Home opens a full-screen camera overlay (toggled by a `scanning` state flag — no router, per the URL-first constraint). `qr-scanner` runs on the rear camera (`preferredCamera: 'environment'`). On a successful decode, the raw QR string is parsed by the existing `parseVCard`; a valid Badge is passed to `addLead`, persisted, and confirmed with a non-blocking toast — green **"Saved: <name>"** for a new Lead, a visually distinct **"Already saved: <name>"** for a dedup hit. The camera stays open across many scans. A **Done** button calls `qr-scanner.stop()` and returns to the Leads list.

Because of email dedup, a Badge held in frame (~25 decodes/sec) only ever produces one Lead — no separate in-frame guard is needed for correctness.

## Acceptance criteria

- [x] Tapping Scan opens a full-screen camera overlay using the rear camera (`preferredCamera: 'environment'`)
- [x] Scanning a `sample-badges/` Badge adds a Lead and shows "Saved: <name>"
- [x] Re-scanning an already-saved Attendee shows "Already saved: <name>" and adds no row
- [x] A Badge lingering in frame produces exactly one Lead (dedup by normalized email — ADR-0002)
- [x] Tapping Done stops the camera (`stop()`/`destroy()`) and returns to the Leads list, which shows the new Lead
- [ ] Verified live by scanning a sample Badge over the `npm run share` tunnel (HTTPS) — **pending: requires the user's phone + a real camera; `npm run share` then scan a `sample-badges/` PNG in a Safari tab**
- [x] A Playwright MCP QA pass exercises the Scan → list flow (camera input injected via a DEV-only `window.__scanBadge` seam where a real camera isn't available)

## Implementation notes (Slice 2)

- **Pure scan reducer** `src/lib/scan.ts` — `handleScan(leads, rawQrText, scannedAt) → { leads, notification: 'saved' | 'duplicate' | 'not-a-badge', contact }`. Runs `parseVCard`, delegates dedup to `addLead`. Returns the parsed `contact` so the UI can name the toast without re-parsing. Fully TDD'd (`src/lib/scan.test.ts`, 4 cases).
- **Overlay** `src/ScanOverlay.tsx` — full-screen `<video>` + HUD (live count, Done) + non-blocking toast. Camera lifecycle in a mount-once effect; `leads`/`onLeadsChange` mirrored into refs (synced in an effect) so the long-lived `onDecode` closure always reads the current list.
- **Scanner seam** `src/scanner.ts` — `CreateScanner` factory injected into `App`/`ScanOverlay`; defaults to the real `qr-scanner`, replaced by a fake in the durable RTL test (`src/App.scan.test.tsx`). DEV-only `window.__scanBadge(text)` exposes the same decode handler for live Playwright injection (stripped from prod builds).
- **Tests:** 20 passing (`npm test`); `tsc -b` and `npm run lint` clean.

## Blocked by

- Slice 1 — Lead collection core
