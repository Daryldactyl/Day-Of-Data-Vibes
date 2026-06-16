# PRD — Scan & Collect Leads

**Status:** ready to build
**Scope:** The Vendor's Scan feature — tap a camera button → open the camera → scan Attendee Badges → collect de-duplicated Leads.
**Sources:** `spec_sheet.md`, `CONTEXT.md`, `docs/adr/0001-vcard-badge-payload.md`, `docs/adr/0002-dedupe-leads-by-email.md`, `docs/qa-sessions/scan-feature-grilling.md`
**Vocabulary:** Uses the project glossary in `CONTEXT.md` — Attendee, Vendor, Badge, Scan, Lead, Export.

---

## Problem Statement

A Vendor working a booth at Day of Data needs to collect attendee contact info all day long, from a line of people, on their own phone, with no install friction. Today that's done on paper raffle tickets, which is lossy and ends in hand-labeling. The Vendor needs to point their phone at an Attendee's Badge and have that Attendee's name and email land in a list they can rely on — without fumbling with a button between every person, without the same person showing up three times because their badge sat in front of the camera for two seconds, and without losing the whole day's collection if the browser reloads or the battery dies.

## Solution

From the Vendor's phone browser, the Home screen shows their running Leads (count + list) with a **Scan** button. Tapping **Scan** opens a full-screen camera. The Vendor points it down a line of Attendees: each Badge that comes into view is read, its Attendee saved as a Lead, and a brief **"Saved: Jane Doe"** confirmation flashes — the camera never stops, so they just keep moving to the next person. If an Attendee already in the list is scanned again, nothing is added but a distinct **"Already saved: Jane Doe"** confirms it registered. A small live counter shows the pile growing. Tapping **Done** closes the camera and returns to the Leads list. Every Lead is persisted the instant it's captured, so a reload or dead battery mid-day loses nothing.

## User Stories

1. As a Vendor, I want a **Scan** button on the Home screen, so that I can start capturing Attendees with one tap.
2. As a Vendor, I want tapping Scan to open a **full-screen camera**, so that the scan target is obvious and easy to aim on a phone.
3. As a Vendor, I want the camera to prefer the **rear-facing lens**, so that I can point the back of my phone at an Attendee's Badge naturally.
4. As a Vendor, I want a Badge to be read **automatically when it comes into view**, so that I don't have to press a shutter button for each person.
5. As a Vendor, I want the Attendee's name and email read off the Badge and **saved as a Lead** with the time I scanned them, so that I have a usable contact record.
6. As a Vendor, I want a brief **"Saved: <name>"** confirmation after each new Lead, so that I know the capture worked.
7. As a Vendor, I want the **camera to keep running** after each save, so that I can scan a whole line of people without reopening it.
8. As a Vendor, I want a badge that lingers in front of the camera to **only be counted once**, so that one person doesn't become forty identical rows.
9. As a Vendor, I want an Attendee I've **already scanned to be ignored** rather than added again, so that my final list is clean for my sales team.
10. As a Vendor, I want a distinct **"Already saved: <name>"** message when I re-scan someone, so that I know the scan registered and I'm not left jabbing at a seemingly-dead camera.
11. As a Vendor, I want a **live count of Leads** visible while I'm scanning, so that I get a sense of progress without leaving the camera.
12. As a Vendor, I want a **Done button** on the camera screen, so that I can stop scanning and get back to my list.
13. As a Vendor, I want the camera (and its battery/indicator) to **actually turn off** when I tap Done, so that my phone isn't holding the camera open in the background.
14. As a Vendor, I want my Leads to **survive a page reload or my phone dying**, so that I don't lose a day's collecting to an accidental refresh.
15. As a Vendor, I want de-duplication to **still hold after a reload**, so that re-scanning someone from before the refresh still doesn't double them.
16. As a Vendor, I want to **see my collected Leads (count + list) on Home**, so that I can confirm what I've gathered.
17. As a Vendor, when I point the camera at a **QR code that isn't a Badge**, I want a brief "Not a badge" hint and to keep scanning, so that a stray poster QR doesn't pollute my list or stop my flow.
18. As a Vendor, if I **deny camera permission** or my phone has no usable camera, I want a calm message telling me what happened and how to fix it, so that I'm not staring at a blank or broken screen.
19. As an Attendee, I want my Badge scanned to be **enough** to hand a Vendor my details, so that I don't have to print or carry a paper raffle ticket.

## Implementation Decisions

- **Payload format (ADR-0001):** Badges are vCard 3.0. The scanner passes the decoded QR string straight into the existing, tested `parseVCard`; any QR that isn't a vCard with both name and email is treated as "not a badge" and ignored. No JSON, no plain-text fallback.
- **Reuse `src/lib/vcard.ts` unchanged.** `parseVCard(string) → Contact | null` is the single seam between raw QR text and a structured contact. The Badge Generator (future) and the Scanner share it so they can't drift.
- **New module: lead collection logic.** A pure function, the heart of the feature:
  `addLead(leads, contact, scannedAt) → { leads, status: 'saved' | 'duplicate' }`.
  It appends a new Lead when the contact's email is unseen, or returns the list unchanged with `status: 'duplicate'` when it's already present. All de-dup correctness lives here, independent of the camera and the DOM.
- **Lead shape:** `Lead = { name: string, email: string, scannedAt: string }` where `scannedAt` is an ISO timestamp captured at scan time. The timestamp is passed *into* `addLead` (not read from a clock inside it) so the logic stays pure and testable.
- **De-duplication (ADR-0002):** Identity is the **normalized email** — lowercased and trimmed. A Vendor's list holds at most one Lead per email. This reverses the spec's original "duplicates are fine" stance; the reversal is recorded in ADR-0002. Dedup is scoped to the single Vendor device — two Vendors independently capturing the same Attendee is expected and fine.
- **Dedup subsumes the in-frame storm.** Because `qr-scanner` decodes ~25×/sec, a Badge held in view fires many times; since the email is already present after the first hit, every subsequent frame is a no-op `duplicate`. No separate "leaves-frame" or cooldown guard is needed for correctness. (A light touch may be used purely to avoid re-flashing the duplicate toast on every frame; it carries no data semantics.)
- **Storage seam:** thin `loadLeads()` / `saveLeads(leads)` helpers over `localStorage` that only serialize/deserialize. Leads are saved immediately on each successful capture. On app load, the Leads list — and therefore the dedup index, which is derived from it — is rehydrated from storage. No server, no central store (spec §6).
- **Screen topology:** a single-screen app. A `scanning` boolean toggles a **full-screen camera overlay** over Home — no router/route is introduced. This keeps the app URL-first (per the iOS-camera constraint) and avoids navigation complexity.
- **Camera lifecycle:** `qr-scanner` is started when the overlay mounts with `preferredCamera: 'environment'`; `qr-scanner.stop()` is called when the Vendor taps **Done** (and on unmount) to release the camera and stop the battery/indicator. The camera stays open across many scans within one session.
- **Feedback:** non-blocking toast, ~1.5–2s, auto-dismissing, rendered over the live video so scanning never pauses. Green **"Saved: <name>"** for `status: 'saved'`; visually distinct **"Already saved: <name>"** for `status: 'duplicate'`; a brief neutral "Not a badge" for unparseable QRs.
- **Error handling:** before/while starting the camera, handle (a) no camera available (`QrScanner.hasCamera()` false) and (b) permission denied — each surfaces a calm explanatory message with a retry/how-to-enable hint rather than a crash or blank screen.
- **HTTPS:** the camera requires HTTPS in the field; this is provided by the existing `npm run share` Cloudflare tunnel. `localhost` is exempt for dev.

## Testing Decisions

- **Test external behavior, not implementation.** Tests assert what a function returns for given inputs — not how it stores things internally. Keep all real logic in pure functions so tests need no camera, no DOM, no timers.
- **`addLead` is the primary unit under test (new).** Cases to cover:
  - appends a brand-new contact and reports `status: 'saved'`;
  - ignores a contact whose email is already present and reports `status: 'duplicate'`, leaving the list unchanged;
  - treats emails as equal **case-insensitively and ignoring surrounding whitespace** (e.g. `Jane@X.com ` == `jane@x.com`);
  - preserves the order and contents of existing Leads;
  - stamps the new Lead with the `scannedAt` value passed in (no hidden clock).
- **`parseVCard` is already covered** by `src/lib/vcard.test.ts` (8 passing cases: name+email extraction, parameter/whitespace tolerance, null on non-vCard, round-trip). No new tests required unless its contract changes — it won't.
- **Prior art:** `src/lib/vcard.test.ts` is the model — vitest, pure-function in/out assertions, a round-trip test, explicit null/empty cases. New tests for `addLead` live beside the module and follow the same style.
- **Storage helpers** may get a light test against a `localStorage` stub (round-trip save → load), but they stay deliberately logic-free so most coverage is unnecessary.
- **Camera/overlay/permission flows are verified by integration/manual QA** (Playwright MCP is wired in `.mcp.json`), not unit tests, because they require a real camera and DOM. Scanning a known sample Badge (`sample-badges/`) and seeing a Lead appear is the acceptance check.

## Out of Scope

- **Export to CSV / `mailto:`** — a separate feature (spec §4.5, §5); this PRD stops at collecting Leads. The `Lead` shape is chosen to feed it later.
- **Badge Generator** — the should-have view that mints Badges from a typed name + email.
- **Branding / PWA / offline install** — should-haves, not part of the scan path.
- **Central database, accounts, login** — explicitly out (spec §6); storage is local only.
- **A delete / edit Lead affordance** — deferred (spec §5, "too easy to fumble and wipe data").
- **Cross-device or cross-Vendor de-duplication** — dedup is per device by design.
- **Manual / typed Lead entry** as a fallback when a Badge won't scan — not in v1.

## Further Notes

- This PRD is intentionally local (`docs/prd/`), matching the README and ADRs — no issue tracker is used for this project.
- The two hard-to-reverse decisions behind it are recorded as ADR-0001 (vCard payload) and ADR-0002 (email dedup); the full grilling transcript, including questions adopted without live debate, is in `docs/qa-sessions/scan-feature-grilling.md`.
- Build order suggestion: TDD `addLead` first (red→green), add the thin storage seam, then wire the `qr-scanner` overlay + toasts on top and QA against `sample-badges/` via the tunnel.
