# Slice 8 — Badge Generator: form + Generate + on-screen QR

**Type:** AFK
**PRD:** `docs/prd/badge-generator.md`
**ADR:** `docs/adr/0001-vcard-badge-payload.md` (vCard 3.0 payload — reused)

## What to build

The Badge Generator tracer bullet. A quiet **"Make a badge"** link in the Home **footer** opens a full-screen
Badge Generator view (a `useState` toggle in `App`, like the `scanning` flag that drives `ScanOverlay` — **no
router**). The view has a **Name** field, an **Email** field, and a **Generate** button. The user types an
Attendee's name + email, taps **Generate**, and a **Badge** — a QR code carrying that contact as a vCard 3.0
string — renders on screen, large and high-contrast, with the **name shown beneath** it. A way back to Home.

The Badge payload is built with the existing tested **`encodeVCard({ name, email })`** (`src/lib/vcard.ts`) —
the same encoder the Scanner parses with, so a generated Badge is guaranteed to read back (ADR-0001). The QR
image is produced by the existing **`qrcode`** dependency (`QRCode.toDataURL(vcard)` → data URL → `<img>`),
behind an **injected capability** (`makeQrDataUrl`, default `QRCode.toDataURL`) so the view is testable without
a real canvas — mirroring how `ScanOverlay` injects `createScanner` and `App` injects `exportLeads`.

Validation is **minimal and forgiving**: inputs are trimmed and newlines stripped before encoding (`encodeVCard`
does no escaping, so a newline would corrupt the vCard; commas/quotes are safe). **Generate** is gated by a pure
`isValidBadgeInput(name, email)` — non-empty name + an email-ish value (`@` with text either side and a dot in
the domain; **not** a strict RFC regex). The empty/invalid state shows a friendly hint
("Enter a name and email to make a badge"). The Badge encodes the **Attendee's** data only — no Vendor identity.

## Acceptance criteria

- [x] A pure `isValidBadgeInput(name, email)` (built test-first) returns true for a non-empty name + email-ish
      address, and false for empty name, empty email, `@`-less email, or domain-without-a-dot — with surrounding
      whitespace trimmed and embedded newlines stripped before the check
- [x] A **"Make a badge"** link in the Home footer opens a **full-screen** Badge Generator view; the view offers
      a way back to Home, and Home's Leads/Scan/Export are unchanged underneath
- [x] The view has **Name** + **Email** inputs and a **Generate** button; Generate is **disabled** until
      `isValidBadgeInput` passes and **enabled** once it does; the empty/invalid state shows the hint
- [x] Tapping **Generate** encodes the trimmed/cleaned inputs via `encodeVCard` and renders the resulting QR as
      an `<img>`, large and high-contrast, with the **name shown beneath** it
- [x] The QR generation is an **injected capability** (`makeQrDataUrl`, default `QRCode.toDataURL`); a test
      asserts Generate calls it with the **correct vCard string** for the typed name + email
- [x] Generating again with new inputs replaces the Badge (can make several in a row)
- [x] Durable Vitest/RTL tests cover `isValidBadgeInput` (pure, edge cases) and the view (disabled/enabled
      Generate, encode-and-render on Generate, name label) — inject a fake `makeQrDataUrl`, like the scan/export tests
- [x] A Playwright MCP QA pass opens the generator, types a name + email, Generates, confirms a real QR renders,
      and **round-trips** the encoded payload back through `parseVCard` to the same contact (the demo's whole point)
- [x] `npm test` all green, `tsc -b` + `npm run lint` clean

## Implementation notes (Slice 8)

- **New pure logic** `src/lib/badge.ts` — `cleanBadgeField(s)` (strips `\r`/`\n`, trims) and
  `isValidBadgeInput(name, email)` (cleaned name non-empty + email matches the loose `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`).
  TDD'd in `badge.test.ts`.
- **Effect seam** `src/badgeQr.ts` — `MakeQrDataUrl` type + `defaultMakeQrDataUrl` wrapping
  `QRCode.toDataURL(text, { width: 320, margin: 2 })` (same `qrcode` idiom as `scripts/generate-badges.ts`),
  injected like `createScanner`/`exportLeads` so the view is testable without a canvas.
- **Component** `src/BadgeGenerator.tsx` — full-screen `.badge-overlay`, Name/Email inputs, Generate gated on
  `isValidBadgeInput`, hint while invalid; on Generate encodes via `encodeVCard` and renders the data URL as
  `<img class="badge-qr">` with the cleaned name beneath; Done calls `onDone`. `App` gained a `makeQrDataUrl?`
  prop (default real) + a `makingBadge` toggle + a footer "Make a badge" button.
- **Verified:** 70 tests green (was 60; +10), `tsc -b` + `npm run lint` clean. **Live Playwright QA**: footer
  link opens the view; Generate disabled→enabled; a **real** `qrcode` PNG renders (`data:image/png`, ~7.8 KB);
  name beneath shows "Ada Lovelace" (typed with surrounding spaces — cleaning confirmed). **End-to-end
  round-trip proven on real pixels** — decoding the rendered QR (jsQR) returned exactly
  `BEGIN:VCARD … FN:Ada Lovelace … EMAIL:ada@dayofdata.example … END:VCARD`, the same vCard the app's scanner
  parses. Done returns to Home with Leads intact.
- Implemented by a subagent from `docs/handoffs/2026-06-16-slice-8-badge-generator-on-screen-qr.md`;
  independently inspected (re-read code, re-ran suite/tsc/lint, drove the live QA + QR-decode round-trip).

## Blocked by

- None — can start immediately (`encodeVCard` and the `qrcode` dep are already in place)

## Disciplines

Build via **`/tdd`** (red → green → refactor, one test at a time; vertical tracer-bullet, never horizontal).
Follow `docs/working-agreements.md` **verbatim**: test behavior through public interfaces (prior art —
`src/lib/vcard.test.ts`, `src/lib/scan.test.ts` for the pure predicate; `src/App.scan.test.tsx`,
`src/App.export.test.tsx` for the injected-capability component tests); durable tests **plus** live Playwright
MCP QA (non-headless). Use the `CONTEXT.md` glossary (Attendee, Badge, Badge Generator, Scan) in code, tests,
and UI. Respect **ADR-0001** (vCard 3.0 — reuse `encodeVCard`, do not invent a new payload). Implement from a
dedicated slice **`/handoff`** so it can be picked up in fresh context by an independent agent. **Never assume;
chase bugs to root cause.**
