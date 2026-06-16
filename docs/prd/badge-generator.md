# PRD — Badge Generator

**Status:** ready to build
**Date:** 2026-06-16
**Scope:** The Badge Generator stretch feature — a secondary in-app view where you type an Attendee's name + email, tap **Generate**, and get a **Badge** (QR, vCard 3.0) rendered on screen to display or print. Lets Attendees self-serve a Badge and makes the demo self-contained (generate on one device, Scan with another).
**Sources:** `spec_sheet.md` (§5 should-have, §7, §9), `CLAUDE.md`, `CONTEXT.md`, `docs/adr/0001-vcard-badge-payload.md`, `docs/qa-sessions/2026-06-16-badge-generator-grilling.md`
**Vocabulary:** Uses the project glossary in `CONTEXT.md` — Attendee, Vendor, Badge, Scan, Lead, Badge Generator.

---

## Problem Statement

The app can Scan Badges and collect Leads, but at a real event there are only as many Badges as the organizers printed — and during a demo (or for an Attendee who never got one), there's no Badge to point the camera at. Without a way to **mint a Badge on the spot**, the Scan flow can't be shown end-to-end on a single device or pair of phones, and an Attendee who wants to be scanned has nothing to present. The one piece of real logic the app already owns — turning a name + email into a vCard the scanner reads (`encodeVCard`) — is currently only reachable from a build-time CLI script, not from the running app.

## Solution

A quiet **"Make a badge"** link (in the footer, off the Vendor's core path) opens a full-screen **Badge Generator** view. The user types an Attendee's **Name** and **Email**, taps **Generate**, and a **Badge** — a QR code carrying that contact as a vCard — appears on screen, large and high-contrast, with the name shown beneath it. Someone can hold the screen up to be scanned, or the user can **Download** the Badge as a PNG or **Print** it. Because the Badge is built with the *same* `encodeVCard` the Scanner parses with, a generated Badge is guaranteed to read back correctly — generator and scanner can't drift. The Vendor's Home stays focused on Scan and Export; the generator is a self-serve / demo utility, not part of the day-long Vendor loop.

## User Stories

1. As an **Attendee** without a printed Badge, I want to type my name + email and get a QR Badge on screen, so that a Vendor can Scan me anyway.
2. As a **presenter** demoing the app, I want to generate a Badge on one device and Scan it with another, so that I can show the whole Scan → Lead flow without pre-printed Badges.
3. As a user, I want a **"Make a badge"** entry that's **out of the Vendor's main way**, so that Home stays focused on Scan and Export.
4. As a user, I want the generator to open as its **own full-screen view** and let me return to Home, so that making a Badge doesn't disturb my Leads.
5. As a user, I want to type a **Name** and an **Email**, so that the Badge carries exactly what a Scan reads back.
6. As a user, I want a **Generate** button I press when I'm done typing, so that the Badge is built when I'm ready — not flickering on every keystroke.
7. As a user, I want **Generate disabled until** I've entered a name and an email-ish address, so that I don't mint an empty or obviously-broken Badge.
8. As a user who hasn't filled the form, I want a **gentle hint** ("Enter a name and email to make a badge"), so that I know what to do.
9. As a user, I want the generated **QR rendered large and high-contrast**, so that another phone's camera can read it easily.
10. As a user, I want the **name shown beneath the QR**, so that I can eyeball that the Badge is for the right person.
11. As a user, I want to **Download** the Badge as a **PNG image**, so that I can save, print, or share it later.
12. As a user, I want to **Print** the Badge directly, so that I can produce a physical Badge to wear.
13. As a user printing, I want the print view to show **only the Badge** (not the whole app), so that I get a clean printout.
14. As a **Vendor**, I want a Badge I generate to **Scan correctly in this same app**, so that the generator and scanner agree on the format.
15. As a user, I want a name containing **commas, accents, or punctuation** to round-trip through the Badge, so that "José Núñez" or "O'Brien, Pat" scans back intact.
16. As a user, I want to generate **another** Badge after one (change the name/email and Generate again), so that I can make several in a row.
17. As a privacy-minded user, I want the generator to keep everything **on my device** (no upload, no account), so that typing a contact mints a Badge and nothing else.

## Implementation Decisions

- **Reuse `encodeVCard` (ADR-0001).** The Badge payload is a vCard 3.0 string from the existing tested `encodeVCard({ name, email })` in `src/lib/vcard.ts` — the exact inverse of the scanner's `parseVCard`. Generator and Scanner share one module, so a generated Badge always parses. (The `scripts/generate-badges.ts` CLI already round-trips through both; this brings the encoder in-app.)
- **QR rendering via `qrcode` (already a dependency).** `QRCode.toDataURL(vcard)` returns a PNG **data URL** rendered into an `<img>`. The QR generation is an **effect**, injected behind a capability (`makeQrDataUrl: (text) => Promise<string>`, defaulting to `QRCode.toDataURL`), mirroring how `App` injects `createScanner` / `exportLeads` for tests.
- **Secondary entry, toggled view, no router.** A footer "Make a badge" link toggles a full-screen Badge Generator view via `App` state (like the `scanning` flag that drives `ScanOverlay`). No routing library is added.
- **Explicit Generate (not live render).** The QR is produced on a **Generate** button press, enabled only when inputs are valid — not re-rendered on each keystroke.
- **Minimal, forgiving validation.** Name + Email are **trimmed** and **newlines stripped** before encoding (`encodeVCard` does no escaping, so a newline would corrupt the vCard; commas/quotes are safe). A pure `isValidBadgeInput(name, email)` predicate gates Generate: non-empty name + an email-ish value (`@` with text either side and a dot in the domain) — deliberately loose, no strict RFC regex.
- **Attendee data only — no Vendor identity.** The Badge encodes the Attendee's name + email; there is no Vendor name/company anywhere (resolves spec §9 with a deliberate "no", consistent with anonymous Export).
- **Download = simple data-URL anchor.** Download saves the QR PNG via a plain `<a download="day-of-data-badge-<slug>.png" href="<dataUrl>">` click. Data URLs honor the `download` attribute cleanly, so this needs **none** of the Blob/Web-Share machinery in ADR-0003 — and there is deliberately **no** mobile share-sheet path (printing a Badge is a desktop/printer activity; long-press → Save to Photos already covers phones).
- **Print = badge-only print view.** Print opens the browser print dialog rendering only the Badge (e.g. a print-targeted container / print CSS), not the full app chrome.
- **Modules (new/changed):**
  - **New pure helper** in `src/lib/` — `isValidBadgeInput(name, email): boolean` and an input-normalizer (trim + strip newlines). Pure, no DOM.
  - **New component** — the Badge Generator view (form, Generate, rendered QR, Download, Print), taking an injected `makeQrDataUrl` capability (default real), like `ScanOverlay` takes `createScanner`.
  - **`App` / Home** — a footer "Make a badge" link toggling the view; passes the injected capability through (default real).
- **Reuse, don't duplicate.** No new encoder, no second QR path — `encodeVCard` + `qrcode`, the same pieces the CLI badge script and scanner already use.

## Testing Decisions

- **Test external behavior, not implementation.** Assert what the pure helpers return and what the component renders/does through its public surface — never internal structure. Keep the real logic pure so tests need no camera, no printer, no real QR canvas.
- **`isValidBadgeInput` + normalizer are the primary pure units (new).** Cases: name + email present → valid; empty name → invalid; empty/`@`-less/`domain`-less email → invalid; surrounding whitespace trimmed; embedded newline stripped; accented/comma/apostrophe names accepted. Model: `src/lib/vcard.test.ts`, `src/lib/scan.test.ts` (pure in/out, explicit edge cases).
- **vCard reuse is already covered.** `encodeVCard`/`parseVCard` round-trip is tested in `vcard.test.ts`; the generator depends on it rather than re-testing encoding. A focused test asserts the component feeds `encodeVCard({name,email})` (the correct vCard string) to the injected `makeQrDataUrl`.
- **Component behavior via React Testing Library (existing seam).** Prior art: `App.scan.test.tsx`, `App.export.test.tsx` (inject a fake capability, drive the public path, assert behavior). Cover: Generate **disabled** until inputs valid and **enabled** when valid; pressing Generate calls the injected `makeQrDataUrl` with the encoded vCard and renders the resulting image; the name appears beneath; (Slice B) Download produces an anchor with the data URL + a `…-badge-….png` filename, and Print triggers the print path (injected/stubbed).
- **Live Playwright MCP QA (non-headless).** Open the generator, type a name + email, Generate, confirm a real QR renders; **round-trip proof** — the generated Badge's encoded payload parses back via `parseVCard` to the same contact (the demo's whole point). Slice B: confirm Download yields a PNG and Print opens a badge-only dialog.

## Out of Scope

- **Editing or storing generated Badges** — the generator mints on demand; it doesn't keep a list or history.
- **Generating a Lead** — making a Badge does not add a Lead; only a Scan does. The generator never touches the Vendor's Leads.
- **Vendor identity / "Collected By" / branding on the Badge** — Attendee name + email only.
- **Bulk generation in-app** — one Badge at a time; the `scripts/generate-badges.ts` CLI already covers batch sample Badges.
- **Mobile share-sheet for the Badge image** — Download/Print are desktop-simple; no Web-Share path (unlike Export's ADR-0003).
- **Strict email validation / verifying the inbox exists** — loose email-ish check only.
- **Custom QR styling, logos, colors, error-correction tuning** — default `qrcode` rendering.
- **Other payload formats** (plain text, JSON) — vCard 3.0 only (ADR-0001).

## Further Notes

- This PRD is intentionally local (`docs/prd/`), matching the README, the scan and export PRDs, and the ADRs — no issue tracker is used for this project.
- **No new ADR** — the one hard-to-reverse decision in this area (vCard 3.0 Badge payload) is already **ADR-0001**, which this feature reuses; the rest are reversible UX calls captured in `docs/qa-sessions/2026-06-16-badge-generator-grilling.md`.
- **Slicing for `/to-issues`:** **0008** = footer link + view + form + Generate + on-screen QR (the tracer bullet, demoable alone); **0009** = Download (PNG) + Print layered on.
- Build order suggestion: TDD the pure `isValidBadgeInput` + normalizer first, then the view that encodes via `encodeVCard` and renders through an injected `makeQrDataUrl`, then (Slice B) Download/Print. Verify live with Playwright MCP, including the generate → `parseVCard` round-trip.
