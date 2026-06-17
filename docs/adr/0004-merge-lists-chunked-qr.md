# Teammates merge Lead lists peer-to-peer via chunked QR — no central store

Multiple staff often work one sponsor booth, each scanning Attendees on their own phone, and want to finish with
one combined, de-duplicated list (and one fair Raffle over it). We let one phone **import another's Leads by
scanning a short series of QR codes**: the sender splits its Leads into chunks (~20–25 Leads per code), renders
**M codes** each stamped with a transfer id + "chunk *i* of *M*" in a scrollable stack; the receiver scans them
(receiver-paced, with an "imported *i* of *M*" progress readout), reassembles when all M are in, and **merges
via the existing email dedup** (ADR-0002 — existing Leads win; new ones are added with their original
`scannedAt`; non-destructive). It stays **peer-to-peer and on-device — no server, no central database.**

Why this, over the alternatives:

- **vs a central database (rejected, spec §10.3).** A shared server-synced list would mean storing Attendee PII
  centrally and the responsibilities that come with it — exactly what the URL-first, local-only design exists to
  avoid. The peer-to-peer merge solves the same multi-phone need without a central store.
- **vs a single QR (rejected).** One QR caps at ~30–50 Leads; it only works for tiny lists. Chunking removes the
  size ceiling.
- **vs file / share-sheet import (rejected, and the honest trade-off).** Exporting the CSV and AirDropping it
  was genuinely the *lower-effort* path and handles any size in one transfer — but cross-device file hand-off is
  clunky (iPhone↔Android especially), drags in OS file pickers, and feels off-brand for a QR-native app. We
  chose the in-app QR experience **deliberately**, accepting more work for a transfer that never leaves the app.
- **Chunked stack, not an auto-cycling carousel.** A receiver-paced scrollable stack is deterministic; an
  auto-advancing carousel drops frames at a loud booth and turns into loop-and-hope.

Trade-offs accepted: a **second scan mode** distinct from vCard-badge scanning (the import payload is clearly
marked so the badge Scanner and the import scanner can never confuse it — ADR-0001 keeps badges vCard-only), and
a **scan count that scales with list size** (~1 code per 20–25 Leads). Sharing is **frictionless** — no consent
gate — since it's the booth's own staff sharing the Leads they collected; the privacy rationale lives here, in
the record, rather than as a tap-through.

Recorded because a future reader will reasonably ask *"why a multi-QR dance instead of just a shared database or
a dropped file?"* — and because reversing it is costly: it shapes two new views (a sender and a receiver), a
chunked-payload protocol, and the scanner's second mode. It also gives spec §10.3's "no central DB" stance a
permanent home.
