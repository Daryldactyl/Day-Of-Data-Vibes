# Grill session — Badge Generator

> `/grill-with-docs` over the **Badge Generator** stretch feature (spec_sheet.md §5/§7, CLAUDE.md).
> Resolved against `CONTEXT.md` and the ADRs; one decision at a time, each with a recommendation.
> Outcome feeds `docs/prd/badge-generator.md` → `docs/issues/0008`, `0009`.

## Feature in one line

An in-app view where you type an Attendee's **name + email** and get a **Badge** (QR, vCard 3.0) rendered
on screen to **display or print**, so Attendees can self-serve and the demo is self-contained. Reuses the
already-tested `encodeVCard()` in `src/lib/vcard.ts` (the inverse of the scanner's `parseVCard`).

## Q1 — Who is it for, and where do you enter it?

**Resolved:** A **secondary entry**, not a primary Home action. The Vendor's Home stays focused on the core
loop (Scan → Leads → Export). The Badge Generator serves a *different* actor (an Attendee minting their own
Badge, or us demoing), so it's a quiet **"Make a badge"** link opening a **full-screen toggled view** — the
same pattern as `ScanOverlay` (a `useState` toggle in `App`), **no router** (zero new deps, consistent with
the existing architecture). Default link location: the **footer**.

## Q2 — Fields & validation

**Resolved:** **Minimal and forgiving.** Two fields only — **Name** + **Email** (exactly what a Badge encodes,
ADR-0001 vCard `FN` + `EMAIL`). Inputs are **trimmed** and **newlines stripped** (because `encodeVCard` does
no escaping — a stray newline would corrupt the vCard line structure; commas/quotes in a name are fine, the
scanner reads the whole `FN` value). **Generate** is gated on a non-empty name + an *email-ish* value
(contains `@` with something either side and a dot in the domain — **not** a strict RFC regex, which risks
rejecting valid addresses). Empty/invalid state shows a friendly hint ("Enter a name and email to make a
badge"). No duplicate/uniqueness/real-inbox checks — this mints a demo/self-serve Badge, not a Lead.

## Q3 — Output: on-screen QR, PNG, or both? + Generate trigger

**Resolved:** **On-screen QR render**, produced on an **explicit Generate button** press (the user finishes
typing, then taps Generate — *not* live-as-you-type, by the user's preference). Pipeline:
`encodeVCard({name,email})` → `QRCode.toDataURL(vcard)` (the `qrcode` dep, already present) → `<img>`,
large/high-contrast, with the **name shown beneath** the QR so it's eyeball-verifiable. This satisfies both
real needs: the demo is **self-contained** (display the QR on one device, scan it with the app on another)
and Attendees **self-serve** (show their screen to a Vendor).

## Q4 — Download / Print

**Resolved:** **Two buttons** under the generated Badge — **Download** (save a PNG, e.g.
`day-of-data-badge-<slug>.png`) and **Print** (open the print dialog showing only the badge). **Desktop-simple:**
the QR is a **data URL**, which honors `<a download>` cleanly, so Download is a plain anchor — **none** of the
blob/Web-Share complexity that ADR-0003 deals with for Export, and deliberately **no** mobile share-sheet path
(printing a physical badge is inherently a desktop/printer activity). On a phone, the natural "save" gesture
(long-press → Save to Photos) still works without us building it.

## Cross-cutting resolutions

- **Vendor identity is NOT involved.** The Badge encodes the **Attendee's** name + email only — no Vendor
  name/company. This resolves the old spec §9 ambiguity ("does the Vendor label things?") with a deliberate
  **no**, consistent with the anonymous-Export decision.
- **Reuse, don't duplicate.** The Badge Generator and the Scanner share the single tested `encodeVCard` /
  `parseVCard` module (ADR-0001), so a generated Badge is guaranteed to parse — they can't drift. The
  `scripts/generate-badges.ts` CLI already round-trips through both; this feature brings the same encoder
  in-app.
- **No new ADR.** Nothing here is hard-to-reverse *and* surprising *and* a real trade-off: the vCard payload
  is already ADR-0001; Generate-button vs live-render and desktop-simple download are reversible UX calls.
- **No `CONTEXT.md` change.** The existing "Badge Generator" glossary entry ("a view that mints a Badge QR
  from a typed name + email, so Attendees can self-serve and the demo is self-contained") still holds.

## Slicing (for `/to-issues`)

- **Slice A — 0008:** the tracer bullet — footer link, full-screen view, Name/Email form, Generate button,
  on-screen QR render (+ name label). Demoable on its own.
- **Slice B — 0009:** Download (PNG) + Print buttons layered onto the generated Badge.
