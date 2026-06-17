# Slice 16 — Consolidation: archive the active list + union dedup wired in

**Type:** AFK
**PRD:** `docs/prd/consolidate-active-archived.md`
**ADR:** `docs/adr/0005-active-archived-lead-lifecycle.md`

## What to build

Wire Slice 15's model into the running app — the **visible archive thread**. The app now holds both buckets:
**active** Leads (Home, Export, Raffle, and the Share handoff all act on these) and **archived** Leads (loaded on
start). Both **Scan** and **Merge import** now de-duplicate against **active ∪ archived**, so an Attendee already
handed off can never be re-captured. The sender (the "Show my list as codes" handoff view) gains a deliberate
**"archive these"** action that moves the **whole active list** into archived and persists both stores — an
explicit act the Vendor takes *after* confirming the handoff landed (chunked QR has no delivery confirmation), so
opening or closing the share view archives nothing on its own. Home, Export, Raffle, and Share continue to operate
on the active list only (no change to their logic — they simply never see archived Leads). The single-phone flow
(a Vendor who never archives) is unchanged.

## Acceptance criteria

- [ ] The app loads and holds **both** active and archived Leads; the archived set is threaded into the Scan and
      import paths.
- [ ] A **Scan** of an Attendee whose email is in **archived** is rejected (dedup hit, "Already saved", no new
      active row); a **Merge import** of an email in active **or** archived is likewise skipped (existing wins).
- [ ] The handoff view has a deliberate **"archive these"** action that moves the **whole active list** → archived
      and persists both stores; afterward Home shows no active Leads and Export/Raffle become empty/disabled.
      Archiving is **never automatic** — opening/closing the share view archives nothing.
- [ ] **Export, Raffle, Home, and the Share handoff operate on the active list only** (archived excluded) — verified;
      no logic change to them.
- [ ] Durable RTL tests (inject the archived state): a Scan/import of an archived email is rejected; "archive these"
      moves active→archived and persists both stores; Export/Raffle act on active only. A live Playwright MCP QA pass
      archives the list (Home clears) and confirms scanning an archived email is rejected.
- [ ] `npm test` all green, `tsc -b` + `npm run lint` clean.

## Blocked by

- **Slice 15 — Active/archived Lead model** (provides the widened dedup, `archiveAll`, and the archived store).

> **Handoff note (do NOT pre-write):** craft this slice's `/handoff` **after Slice 15 has landed and been
> inspected** — it needs the *real* widened add-a-Lead / `mergeLeads` signatures, `archiveAll`, and the
> archived-store load/save API the subagent produced.

## Disciplines

Build via **`/tdd`** (red → green → refactor, **one test at a time**; vertical tracer-bullet, never horizontal).
Follow `docs/working-agreements.md` **verbatim**, and these in full — a subagent MUST NOT skip them:

- **Never assume. Chase every bug to its ROOT CAUSE** — no band-aids, no "probably," no jumping to conclusions;
  reproduce → minimize → fix the actual cause; never blame the network or the model.
- **Test behavior through public interfaces, not implementation** (tests survive refactors). Use the existing
  injected-prop / seam patterns (prior art: `src/App.scan.test.tsx`, `src/App.export.test.tsx`,
  `src/App.import.test.tsx`, `src/App.share.test.tsx`).
- **Durable Vitest/RTL tests for everything verified, PLUS live Playwright MCP QA** (non-headless).
- Use the **`CONTEXT.md` glossary** verbatim (Lead, **Active Lead / Archived Lead**, Scan, Export, Raffle, Merge) in
  code, tests, and UI. Respect **ADR-0005** and the **ADR-0002 revision** (dedup spans active ∪ archived).
- Implement from a dedicated slice **`/handoff`** in **fresh context** (crafted per the handoff note above).
- **The orchestrator will independently and adversarially review** the result and its proof — re-running the
  suite, re-reading the code, and trying to break it (can an archived Attendee be re-scanned? does opening the
  share view archive anything? do Export/Raffle ever show archived?) — and will **never** trust the subagent's
  report alone. Report faithfully, including any mis-step.
