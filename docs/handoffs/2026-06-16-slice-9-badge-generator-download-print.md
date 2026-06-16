# Handoff — Slice 9: Badge Generator Download (PNG) + Print

**Read first (verbatim):** `docs/working-agreements.md`, `docs/issues/0009-badge-generator-download-print.md` (this slice), `docs/prd/badge-generator.md`, `docs/qa-sessions/2026-06-16-badge-generator-grilling.md`, `CONTEXT.md`.

Implement in a **fresh context** via `/tdd`. Slice 8 is DONE and verified — you are layering **Download** and **Print** onto the already-rendered Badge.

---

## Where things stand (Slice 8 = DONE)

`src/BadgeGenerator.tsx` renders a full-screen `.badge-overlay` with Name/Email inputs, a Generate button, and —
after Generate — a Badge: `<img className="badge-qr" src={badge.url} …>` plus `<p className="badge-name">` inside
a `<div className="badge-result">`. Component state holds `badge: { url: string; name: string } | null`. Pure
helpers live in `src/lib/badge.ts` (`cleanBadgeField`, `isValidBadgeInput`); the QR seam is `src/badgeQr.ts`.
70 tests green, tsc/lint clean. **Read `src/BadgeGenerator.tsx`, `src/lib/badge.ts`, `src/BadgeGenerator.test.tsx`,
and `src/App.css` before starting.**

## What to build (this slice)

When a Badge is on screen, show two controls under it inside `.badge-result`:

1. **Download** — saves the Badge PNG. The QR is a **data URL**, which honors `<a download>` cleanly, so render
   a real anchor (declarative — no click-effect to inject):
   `<a className="badge-download" href={badge.url} download={badgeFilename(badge.name)}>Download</a>`.
   **No Blob, no `URL.createObjectURL`, no `shareOrDownload`, no Web Share.** (ADR-0003 governs Export, not Badges.)
2. **Print** — `<button className="badge-print" onClick={print}>Print</button>`, where `print` is an **injected**
   prop `print?: () => void` defaulting to `() => window.print()` (so tests assert it without a real print dialog).
   Add `@media print` CSS in `src/App.css` so only the Badge prints (hide app chrome / show just `.badge-result`
   or `.badge-qr` + `.badge-name`) — a clean badge-only printout.

Both controls appear **only when `badge` is set** (after Generate); before generation they are absent.

## New pure logic — add to `src/lib/badge.ts` (TDD first)

```
export function badgeFilename(name: string): string
//   `day-of-data-badge-<slug>.png`, slug = name.toLowerCase, non-alphanumerics → single '-', trimmed of
//   leading/trailing '-'. Mirror the slug in scripts/generate-badges.ts:
//   name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
```

## Component & App changes
- `BadgeGenerator` gains `print?: () => void` (default `() => window.print()`); render the Download anchor +
  Print button inside the existing `.badge-result` block (only when `badge` is set).
- No `App.tsx` logic change needed (it already injects nothing for this); you MAY thread a `print` default
  through if convenient, but the component default is sufficient. Do **not** add Web Share or change Slice 8 behavior.

## TDD cycle list (one test → minimal code each)

`src/lib/badge.test.ts` (extend):
1. `badgeFilename('Ada Lovelace')` → `day-of-data-badge-ada-lovelace.png`.
2. `badgeFilename` collapses punctuation/multiple spaces and trims dashes (e.g. `"O'Brien,  Pat"` →
   `day-of-data-badge-o-brien-pat.png`).

`src/BadgeGenerator.test.tsx` (extend; inject a fake `makeQrDataUrl` to get a Badge on screen, prior art already in file):
3. Before Generate, **no** Download anchor and **no** Print button are present.
4. After Generate, a **Download** anchor exists with `href` = the data URL and `download` = `badgeFilename(name)`.
5. After Generate, a **Print** button exists; clicking it calls the injected `print` once.

Refactor with green.

## Do NOT
- Do not use Blob/`URL.createObjectURL`/`shareOrDownload`/Web Share — Download is a plain data-URL `<a download>`.
- Do not change Slice 8's generation/validation logic or its passing tests (extend, don't rewrite).
- Do not add a dependency or a router. Do not touch Leads/storage.

## Live QA (the ORCHESTRATOR runs this on inspection — note what it asserts)
Playwright MCP, non-headless: generate a Badge, then assert the **Download** anchor downloads a **PNG**
(`page.waitForEvent('download')` → suggestedFilename ends `.png`, name slugified) and that **Print** triggers the
print path with a **badge-only** layout (stub `window.print` to a spy via `addInitScript`, assert it fired;
visually confirm the print CSS hides app chrome).

## Acceptance criteria
See `docs/issues/0009-badge-generator-download-print.md`. Plus `npm test` all green, `tsc -b` + `npm run lint` clean.

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time. Behavior through public interfaces. Glossary: Attendee / Badge /
Badge Generator. Desktop-simple Download (data-URL anchor) — **no** Web Share. **Never assume; chase bugs to root
cause.** Report faithfully (real test output).

## Exact next action
1. `npm test` → confirm 70 green baseline.
2. Cycle 1: failing test for `badgeFilename('Ada Lovelace')`. Red → green → continue.
3. Add the Download anchor + Print button (with injected `print`) inside `.badge-result`, and the `@media print`
   CSS. Hand back to the orchestrator for live QA.
