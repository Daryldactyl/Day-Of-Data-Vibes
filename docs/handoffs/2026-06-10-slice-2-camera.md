# Handoff — Slice 2: Scan a Badge with the camera

**Read first:** `docs/working-agreements.md` (disciplines — follow verbatim), `docs/issues/0002-scan-a-badge-with-the-camera.md` (the slice), `docs/prd/scan-and-collect-leads.md`, `CONTEXT.md`, `docs/adr/0001` + `0002`.

This handoff exists so Slice 2 can be implemented in a **fresh context** after `/clear`. Everything needed is below.

---

## Where things stand (Slice 1 = DONE)

- **`src/lib/leads.ts`** — `Lead = Contact & { scannedAt: string }`; `addLead(leads, contact, scannedAt) → { leads, status: 'saved' | 'duplicate' }`; dedup by normalized (trim+lowercase) email (`normalizeEmail` helper). Pure.
- **`src/lib/leadsStorage.ts`** — `loadLeads(): Lead[]`, `saveLeads(leads): void`. localStorage key **`dayofdata.leads`**. Thin, logic-free.
- **`src/App.tsx`** — loads leads via `useState(() => loadLeads())`; renders the empty state, or a count (`data-testid="lead-count"`, e.g. "2 leads"/"1 lead") + `.lead-list` of name/email. **No Scan button or camera yet — that's this slice.**
- **Tests: 14 passing** (`npm test`): `vcard.test.ts` (5), `leads.test.ts` (4), `leadsStorage.test.ts` (2), `App.test.tsx` (3). `tsc -b` clean.
- Dev server: `npm run dev` (5173 was busy last time → Vite picked **5174**). Re-check the printed port. QA is **non-headless** Playwright MCP.
- `Contact` type lives in `src/lib/vcard.ts`; `parseVCard(string) → Contact | null` is tested and tolerant (CRLF/LF, params, whitespace). `encodeVCard(contact)` exists too.

## qr-scanner API facts (v1.4.2, already a dependency)

- `new QrScanner(videoEl, onDecode, options)` where `onDecode: (result) => void` and `result.data` is the decoded string (pass `returnDetailedScanResult: true`).
- Options used: `{ preferredCamera: 'environment', returnDetailedScanResult: true, onDecodeError, highlightScanRegion: true, maxScansPerSecond }`.
- Methods: `.start()` (prompts camera permission), `.stop()`, `.destroy()`. Static: `QrScanner.hasCamera()`. `onDecodeError` fires with the string `"No QR code found"` on empty frames (constant `QrScanner.NO_QR_CODE_FOUND`).
- Worker loads via dynamic import; Vite handles it. If the worker 404s in the tunnel build, that's the bug to chase to root cause (do not hand-wave it).
- Camera requires **HTTPS or localhost**. Field testing = `npm run share` (Cloudflare tunnel), open on iPhone in the **Safari tab** (not home-screen).

---

## Slice 2 plan (approved: approach A)

### Step 1 — TDD the pure scan reducer first (this is the real logic)

New module **`src/lib/scan.ts`**:
```
handleScan(leads: Lead[], rawQrText: string, scannedAt: string)
  → { leads: Lead[]; notification: 'saved' | 'duplicate' | 'not-a-badge' }
```
It runs `parseVCard(rawQrText)`; if null → `{ leads, notification: 'not-a-badge' }`. Otherwise delegates to `addLead`, mapping its `status` ('saved'/'duplicate') to the notification and returning the new leads. Keep it pure — `scannedAt` passed in, no clock, no localStorage.

**TDD cycles (one test → one impl each, `src/lib/scan.test.ts`):**
1. a valid Badge vCard string for a new email → `notification: 'saved'`, the Lead appended (with `scannedAt`).
2. a valid Badge vCard whose email is already in `leads` → `notification: 'duplicate'`, leads unchanged.
3. a string that isn't a Badge (e.g. `'https://example.com'` or `'just text'`) → `notification: 'not-a-badge'`, leads unchanged.

(Optionally reuse `encodeVCard({name,email})` in tests to build valid input.)

### Step 2 — Build the camera overlay on top (integration; thin)

- Add a **Scan** button on Home; App holds `scanning` boolean state (no router — full-screen overlay toggled by state, per the URL-first ADR/PRD).
- Overlay: full-screen `<video>`, start `QrScanner` on mount with `preferredCamera: 'environment'`; on decode call `handleScan` with current leads + `new Date().toISOString()`; update leads state, `saveLeads`, and show a toast. **Done** button calls `qrScanner.stop()`/`destroy()` and closes (also clean up on unmount).
- Toasts (non-blocking, ~1.5–2s auto-dismiss, camera keeps running): green **"Saved: <name>"** (saved), distinct **"Already saved: <name>"** (duplicate), brief neutral **"Not a badge"** (not-a-badge).
- Live **"N leads"** counter visible on the overlay (Slice 4 polishes it, but a basic count here is fine).
- Dedup means a Badge held in frame yields exactly one Lead (no extra guard needed for correctness).

### Step 3 — QA (both, per working agreements)

- **Build a durable test**: RTL component test that opens the overlay and drives a decode through the public path, asserting Saved → Already-saved (dedup) → Not-a-badge, plus the list/count update. (To make the decode injectable without a real camera, route qr-scanner's `onDecode` through a single handler the test/dev can call — e.g. a `DEV`-gated `window.__scanBadge(text)` hook, or pass an injectable `onDecode` into the overlay. Pick the cleanest; keep it out of prod behavior.)
- **Live Playwright MCP (non-headless)**: click Scan → overlay opens → inject a `sample-badges` vCard string (`BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ada Lovelace\r\nEMAIL:ada@dayofdata.example\r\nEND:VCARD`) → assert "Saved: Ada Lovelace" + list; inject again → "Already saved", no new row; inject junk → "Not a badge". Screenshot.
- **Phone test (required by the user)**: `npm run share`, open the tunnel URL on the phone in Safari tab, scan a real badge PNG from `sample-badges/` → a Lead appears. The user wants to prove the camera works on real hardware.

### Acceptance criteria (from issue 0002)
Scan opens a rear-camera full-screen overlay; scanning a sample Badge adds a Lead + "Saved"; re-scan shows "Already saved" and adds no row; a lingering Badge yields one Lead; Done stops the camera and returns to the list; verified over the tunnel on a phone; Playwright QA covers the Scan→list flow with the camera input injected.

---

## Exact next action for the fresh context
1. `npm test` to confirm 14 green baseline.
2. Start Step 1 cycle 1: write the first failing test in `src/lib/scan.test.ts` for `handleScan` → 'saved'. Red → green → repeat for 'duplicate' and 'not-a-badge'.
3. Then Step 2 overlay, Step 3 QA. Restart `npm run dev` if the server isn't running.
