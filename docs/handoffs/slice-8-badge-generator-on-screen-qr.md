# Handoff — Slice 8: Badge Generator (form + Generate + on-screen QR)

**Read first (verbatim):** `docs/working-agreements.md` (disciplines), `docs/issues/0008-badge-generator-on-screen-qr.md` (this slice), `docs/prd/badge-generator.md`, `docs/adr/0001-vcard-badge-payload.md`, `docs/qa-sessions/badge-generator-grilling.md`, `CONTEXT.md` (glossary).

Implement in a **fresh context** via `/tdd`. This is the **tracer bullet** for a new feature — a thin vertical slice through form → encode → QR render. Slice 9 (Download/Print) layers on later; do **not** build it here.

---

## What this slice delivers

A quiet **"Make a badge"** link in the Home **footer** opens a full-screen **Badge Generator** view: Name +
Email inputs, a **Generate** button, and — on Generate — a QR **Badge** rendered on screen (large, high-contrast)
with the **name beneath** it, plus a way back to Home. The Badge is a vCard 3.0 string from the existing tested
`encodeVCard` (so it Scans back), turned into a QR by the existing `qrcode` dep behind an injected capability.

## Architecture & seams (match existing patterns exactly)

The app is a single-screen `App` (`src/App.tsx`) that toggles a full-screen overlay via `useState` (the
`scanning` flag → `<ScanOverlay>`), and injects effects as optional props with real defaults
(`createScanner`, `exportLeads`). **Mirror this.**

### 1. New pure logic — `src/lib/badge.ts` (TDD this first)

```
export function cleanBadgeField(s: string): string   // trim + remove \r and \n (encodeVCard does no escaping)
export function isValidBadgeInput(name: string, email: string): boolean
//   true iff cleanBadgeField(name) is non-empty AND cleanBadgeField(email) is "email-ish":
//   matches /^[^@\s]+@[^@\s]+\.[^@\s]+$/  (text @ text . text — loose, NOT strict RFC)
```

Pure, no DOM. Test directly (model: `src/lib/vcard.test.ts`, `src/lib/scan.test.ts`).

### 2. New effect seam — `src/badgeQr.ts` (mirror `src/scanner.ts`'s `defaultCreateScanner`)

```
export type MakeQrDataUrl = (text: string) => Promise<string>
export const defaultMakeQrDataUrl: MakeQrDataUrl = (text) =>
  QRCode.toDataURL(text, { width: 320, margin: 2 })   // import QRCode from 'qrcode'
```

Keeps the real `qrcode` call injectable so the view is testable without a canvas.

### 3. New component — `src/BadgeGenerator.tsx`

Props: `{ onDone: () => void; makeQrDataUrl?: MakeQrDataUrl }` (default `defaultMakeQrDataUrl`).
- Controlled `name` / `email` inputs; a **Generate** button `disabled={!isValidBadgeInput(name, email)}`.
- When invalid/empty, show a hint: "Enter a name and email to make a badge".
- On **Generate**: `const vcard = encodeVCard({ name: cleanBadgeField(name), email: cleanBadgeField(email) })`,
  then `makeQrDataUrl(vcard)` → store the data URL in state and render `<img className="badge-qr" src={url} … />`
  with the cleaned **name shown beneath**. Generating again replaces the Badge.
- A **Done/Back** button calls `onDone`. Full-screen container (mirror `.scan-overlay` styling in `App.css`).
- Glossary in UI copy: it's a **Badge** (not "QR code" in prose where Badge fits), for an **Attendee**.

### 4. `src/App.tsx` wiring

- Add optional prop `makeQrDataUrl?: MakeQrDataUrl` to `AppProps` (default `defaultMakeQrDataUrl`), exactly
  like `createScanner` / `exportLeads`.
- Add `const [makingBadge, setMakingBadge] = useState(false)`.
- In the footer, add a **"Make a badge"** link/button that sets `makingBadge` true.
- Render `<BadgeGenerator onDone={() => setMakingBadge(false)} makeQrDataUrl={makeQrDataUrl} />` when `makingBadge`.
- Home's Leads / Scan / Export are untouched underneath.

## TDD cycle list (one test → minimal code each)

`src/lib/badge.test.ts`:
1. `cleanBadgeField` trims surrounding whitespace.
2. `cleanBadgeField` removes embedded `\r`/`\n`.
3. `isValidBadgeInput` → true for a non-empty name + `ada@dayofdata.example`.
4. → false for empty/whitespace-only name.
5. → false for `@`-less email, and for a domain with no dot (`ada@example`).

`src/BadgeGenerator.test.tsx` (RTL; inject a fake `makeQrDataUrl`, prior art `App.scan.test.tsx` / `App.export.test.tsx`):
6. Generate is **disabled** with empty/invalid inputs and **enabled** once name + email-ish are entered.
7. Clicking Generate calls the injected `makeQrDataUrl` **once with `encodeVCard({name,email})`** (the correct
   vCard string for the cleaned inputs); the returned data URL is rendered as an `<img>`.
8. The cleaned **name** appears beneath the rendered Badge.
9. Generating again (new inputs) replaces the Badge (calls `makeQrDataUrl` again with the new vCard).

`src/App.badge.test.tsx` (new; prior art `App.scan.test.tsx`):
10. A footer **"Make a badge"** control opens the Badge Generator view; its **Done/Back** returns to Home with
    Leads intact (inject a fake `makeQrDataUrl` through `App`).

Refactor with green.

## Do NOT change / do NOT build
- Do not modify `encodeVCard`/`parseVCard`, the scan or export logic, or their tests.
- Do not build Download or Print (Slice 9). No `shareOrDownload` / Web Share anywhere.
- Do not add a router or any new dependency (`qrcode` is already present).
- Generating a Badge must **not** add a Lead or touch storage.

## Live QA (the ORCHESTRATOR runs this on inspection — note what it asserts)
Playwright MCP, non-headless, screenshots to `/tmp`: open the generator from the footer, type a name + email,
click Generate, confirm a real QR `<img>` renders with the name beneath; **round-trip proof** — pull the encoded
payload and assert `parseVCard(payload)` returns the same `{ name, email }` (the demo's whole point). Then Done → Home.

## Acceptance criteria
See `docs/issues/0008-badge-generator-on-screen-qr.md`. Plus `npm test` all green, `tsc -b` + `npm run lint` clean.

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time; vertical tracer-bullet. Behavior through public interfaces.
Glossary: Attendee / Badge / Badge Generator / Scan. Respect **ADR-0001** (reuse `encodeVCard`; no new payload).
**Never assume; chase bugs to root cause.** Report faithfully (real test output).

## Exact next action
1. `npm test` → confirm 60 green baseline.
2. Cycle 1: failing test for `cleanBadgeField` (trims whitespace). Red → green → continue down the list.
3. Land the pure helpers, then the component (inject `makeQrDataUrl`), then the `App` footer toggle. Hand back
   to the orchestrator for live QA.
