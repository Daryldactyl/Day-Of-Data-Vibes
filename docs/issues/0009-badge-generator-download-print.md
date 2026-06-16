# Slice 9 — Badge Generator: Download (PNG) + Print

**Type:** AFK
**PRD:** `docs/prd/badge-generator.md`

## What to build

Layer **Download** and **Print** onto Slice 8's generated Badge. Once a Badge is on screen, two small buttons
sit beneath it:

- **Download** — saves the Badge as a **PNG image** named `day-of-data-badge-<slug>.png` (slug from the
  Attendee's name). Because the QR is a **data URL**, this is a plain `<a download href="<dataUrl>">` click —
  data URLs honor the `download` attribute cleanly, so it needs **none** of the Blob/Web-Share machinery from
  ADR-0003, and there is deliberately **no** mobile share-sheet path (printing a Badge is a desktop/printer
  activity; long-press → Save to Photos already covers phones).
- **Print** — opens the browser print dialog rendering **only the Badge** (a print-targeted container / print
  CSS), not the full app chrome, so the printout is a clean Badge.

Both buttons appear only when a Badge has been generated (Slice 8). No change to the generation/validation logic.

## Acceptance criteria

- [x] After a Badge is generated, a **Download** and a **Print** button appear beneath it; before generation
      they are absent (nothing to download/print)
- [x] **Download** triggers a save of the QR **PNG** via a data-URL `<a download>`; the filename is
      `day-of-data-badge-<slug>.png` derived from the Attendee's name (slugified, lowercased)
- [x] **Print** opens the print dialog showing **only the Badge** (badge-only print view / print CSS), not the
      Home screen or app chrome
- [x] The download/print actions are behind testable seams (a declarative data-URL anchor; an injected
      `print` capability defaulting to `window.print`), so durable tests assert Download builds an anchor with
      the data URL + correct `.png` filename and Print invokes the print path — without a real OS download/print
- [x] Durable Vitest/RTL tests cover button presence (only after generate), the Download anchor/filename, and
      the Print trigger
- [x] A Playwright MCP QA pass confirms **Download** yields a real PNG file and **Print** fires the print path
      (badge-only `@media print` layout) on the desktop dev build
- [x] `npm test` all green, `tsc -b` + `npm run lint` clean

## Implementation notes (Slice 9)

- **New pure helper** `badgeFilename(name)` in `src/lib/badge.ts` → `day-of-data-badge-<slug>.png`
  (`name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')`, mirroring `scripts/generate-badges.ts`).
- **Component** `src/BadgeGenerator.tsx` — inside the existing `.badge-result` (rendered only when a Badge
  exists), a `.badge-actions` row: a declarative `<a className="badge-download" href={badge.url}
  download={badgeFilename(badge.name)}>` (data-URL anchor — **no** Blob/`createObjectURL`/`shareOrDownload`/Web
  Share) and a `<button className="badge-print" onClick={print}>` where `print?: () => void` defaults to
  `() => window.print()` (injected seam). `@media print` CSS in `src/App.css` hides app chrome + the action
  buttons, printing only the Badge (QR + name).
- **Verified:** 75 tests green (was 70; +5), `tsc -b` + `npm run lint` clean. **Live Playwright QA**: after
  Generate, Download + Print appear; **Download fired a real PNG** named `day-of-data-badge-o-brien-pat.png`
  (typed `"O'Brien, Pat"` — apostrophe/comma/space slugified correctly); **Print** fired the spied `window.print`
  once. Buttons absent before generation.
- Implemented by a subagent from `docs/handoffs/2026-06-16-slice-9-badge-generator-download-print.md`;
  independently inspected (re-read code + `@media print` CSS, re-ran suite/tsc/lint, drove live PNG-download +
  print-spy QA).

## Blocked by

- Slice 8 — Badge Generator: form + Generate + on-screen QR (the rendered Badge these buttons act on)

## Disciplines

Build via **`/tdd`** (red → green → refactor, one test at a time). Follow `docs/working-agreements.md`
**verbatim**: behavior through public interfaces; durable tests for the Download anchor/filename + the Print
trigger (inject/stub the effects, prior art — the injected `exportLeads`/`createScanner` seams), **plus** live
Playwright MCP QA (non-headless). Use the `CONTEXT.md` glossary (Attendee, Badge, Badge Generator). **No** Web
Share / `shareOrDownload` reuse — Download is a desktop-simple data-URL anchor (PRD decision; ADR-0003 governs
Export, not Badges). Implement from a dedicated slice **`/handoff`** in fresh context. **Never assume; chase
bugs to root cause.**
