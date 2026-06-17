# Handoff — Slice 15: Active/archived Lead model (pure + persistence)

**Read first (verbatim):** `docs/working-agreements.md`, `docs/issues/0015-active-archived-model.md` (this slice), `docs/prd/consolidate-active-archived.md`, `docs/adr/0005-active-archived-lead-lifecycle.md`, `docs/adr/0002-dedupe-leads-by-email.md` (read the **Revision** — dedup spans active ∪ archived), `CONTEXT.md` (**Active Lead / Archived Lead**).

Implement in a **fresh context** via `/tdd`. This slice is **pure logic + persistence only — NO UI, NO camera.** It's the foundation; slices 0016 (archive) and 0017 (restore) wire it into the app, so keep the signatures clean.

## Reuse / extend (read these first)
- `src/lib/leads.ts` — the `Lead`/`Contact` types, `normalizeEmail`, and **`addLead(leads, contact, scannedAt)`** (today it rejects a contact whose normalized email is already in `leads`, else appends; returns `{ leads, status: 'saved' | 'duplicate' }`). Read `src/lib/leads.test.ts`.
- `src/lib/leadsStorage.ts` — `loadLeads`/`saveLeads` on the key `dayofdata.leads`. Read `src/lib/leadsStorage.test.ts`.

## What to build

### 1. Widen `addLead`'s dedup to the union
Add an optional **`archived: Lead[] = []`** parameter:
```
addLead(active: Lead[], contact: Contact, scannedAt: string, archived: Lead[] = []): { leads: Lead[]; status: 'saved' | 'duplicate' }
```
- Reject (`status: 'duplicate'`, `leads` unchanged) if `normalizeEmail(contact.email)` matches **any** Lead in
  **active OR archived**. Otherwise append to **active** and return `status: 'saved'`.
- **Default `archived = []` must make behavior byte-identical to today** — every existing caller (`handleScan`,
  `mergeLeads`) passes three args and is unaffected. (They start passing `archived` in slice 0016.)

### 2. Pure bucket moves (new, in `src/lib/leads.ts`)
```
archiveAll(active: Lead[], archived: Lead[]): { active: Lead[]; archived: Lead[] }   // → { active: [], archived: [...archived, ...active] }
restoreAll(active: Lead[], archived: Lead[]): { active: Lead[]; archived: Lead[] }   // → { active: [...active, ...archived], archived: [] }
```
Pure; preserve each Lead's `scannedAt` and order; **non-destructive** (no Lead lost or duplicated). The dedup
invariant guarantees the two buckets never share an email, so these are plain moves.

### 3. Archived store (new, in `src/lib/leadsStorage.ts`)
Add `loadArchived(): Lead[]` / `saveArchived(leads: Lead[]): void` on a **separate key** `dayofdata.archived`,
mirroring `loadLeads`/`saveLeads`; absent/empty → `[]`. Do not change the active store.

## TDD cycle list (one test → minimal code each; mirror `leads.test.ts` / `leadsStorage.test.ts`)

`src/lib/leads.test.ts` (extend):
1. `addLead` with the **default** (no 4th arg): a contact already in active → `duplicate` (unchanged); a new
   contact → `saved`, appended (regression guard — today's behavior preserved).
2. `addLead` with `archived` containing the contact's email → `duplicate` (the new union behavior); `leads` unchanged.
3. `addLead` with a new contact and a non-matching `archived` → `saved`, appended to active.
4. `archiveAll` → active empties, archived = old archived + old active (order + `scannedAt` preserved).
5. `restoreAll` → archived empties, active = old active + old archived.
6. **Round-trip:** `restoreAll(archiveAll(active, []).active, archiveAll(active, []).archived)` returns the
   original active set; non-destructive (counts match, no dup).

`src/lib/leadsStorage.test.ts` (extend):
7. `saveArchived` then `loadArchived` round-trips the archived Leads on `dayofdata.archived`; an absent key →
   `[]`; the active store (`loadLeads`) is independent/untouched.

Refactor with green.

## Do NOT
- No UI, no camera, no App wiring (that's 0016/0017). Do not change `handleScan`/`mergeLeads` call sites — only
  add the optional `archived` param to `addLead` (they keep working unchanged).
- No new dependency.

## Live QA
None — pure. The orchestrator verifies by re-running the suite and **adversarially probing** the edges (does the
default truly preserve today's behavior? can a move ever lose/duplicate a Lead? archived in the union?).

## Acceptance criteria
See `docs/issues/0015-active-archived-model.md`. Plus `npm test` all green, `tsc -b` + `npm run lint` clean.

## Disciplines (verbatim)
`/tdd` red→green→refactor, one test at a time. Behavior through public interfaces. Glossary: Lead / Active Lead /
Archived Lead. Respect **ADR-0005** + the **ADR-0002 revision** (dedup spans active ∪ archived). **Never assume;
chase bugs to ROOT CAUSE.** The orchestrator will **independently and adversarially review** (re-run, re-read, try
to break it) and will not trust this report alone. Report faithfully (real test output).

## Exact next action
1. `npm test` → confirm the current baseline is green.
2. Cycle 1: a failing test for `addLead` default-behavior preservation / the archived-union rejection. Red → green → continue.
3. Land the widened `addLead`, `archiveAll`/`restoreAll`, and the archived store. Report the FINAL signatures
   (slices 0016/0017's handoffs are written from them).
