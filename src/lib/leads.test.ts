import { describe, it, expect } from 'vitest'
import { addLead, archiveAll, restoreAll } from './leads'

describe('addLead', () => {
  it('appends a brand-new contact and reports it as saved', () => {
    const result = addLead([], { name: 'Jane Doe', email: 'jane@example.com' }, '2026-06-10T15:00:00.000Z')
    expect(result.status).toBe('saved')
    expect(result.leads).toEqual([
      { name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T15:00:00.000Z' },
    ])
  })

  it('ignores a contact whose email is already in the list and reports it as a duplicate', () => {
    const existing = [{ name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T15:00:00.000Z' }]
    const result = addLead(existing, { name: 'Jane Doe', email: 'jane@example.com' }, '2026-06-10T16:00:00.000Z')
    expect(result.status).toBe('duplicate')
    expect(result.leads).toEqual(existing)
  })

  it('treats emails differing only in case or surrounding whitespace as the same Attendee', () => {
    const existing = [{ name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T15:00:00.000Z' }]
    const result = addLead(existing, { name: 'Jane Doe', email: '  JANE@Example.com  ' }, '2026-06-10T16:00:00.000Z')
    expect(result.status).toBe('duplicate')
    expect(result.leads).toEqual(existing)
  })

  it('appends a new Attendee after existing Leads, preserving their order', () => {
    const existing = [
      { name: 'Ada Lovelace', email: 'ada@example.com', scannedAt: '2026-06-10T09:00:00.000Z' },
      { name: 'Grace Hopper', email: 'grace@example.com', scannedAt: '2026-06-10T09:05:00.000Z' },
    ]
    const result = addLead(existing, { name: 'Alan Turing', email: 'alan@example.com' }, '2026-06-10T09:10:00.000Z')
    expect(result.status).toBe('saved')
    expect(result.leads).toEqual([
      { name: 'Ada Lovelace', email: 'ada@example.com', scannedAt: '2026-06-10T09:00:00.000Z' },
      { name: 'Grace Hopper', email: 'grace@example.com', scannedAt: '2026-06-10T09:05:00.000Z' },
      { name: 'Alan Turing', email: 'alan@example.com', scannedAt: '2026-06-10T09:10:00.000Z' },
    ])
  })

  // Cycle 1 — regression guard: with NO archived arg (the default ''), behavior is
  // byte-identical to today — a contact already in active is a duplicate, a new one is saved.
  describe('with the default (no archived argument)', () => {
    it('rejects a contact already in active as a duplicate, leaving the list unchanged', () => {
      const existing = [{ name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T15:00:00.000Z' }]
      const result = addLead(existing, { name: 'Jane Doe', email: 'jane@example.com' }, '2026-06-10T16:00:00.000Z')
      expect(result.status).toBe('duplicate')
      expect(result.leads).toBe(existing)
    })

    it('appends a brand-new contact to active and reports it as saved', () => {
      const existing = [{ name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T15:00:00.000Z' }]
      const result = addLead(existing, { name: 'Alan Turing', email: 'alan@example.com' }, '2026-06-10T16:00:00.000Z')
      expect(result.status).toBe('saved')
      expect(result.leads).toEqual([
        { name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T15:00:00.000Z' },
        { name: 'Alan Turing', email: 'alan@example.com', scannedAt: '2026-06-10T16:00:00.000Z' },
      ])
    })
  })

  // Cycle 2 — dedup spans the union (ADR-0002 revision): a contact whose normalized
  // email is in the ARCHIVED bucket is rejected even though active doesn't hold it.
  it('rejects a contact whose email is in the archived bucket (union dedup), leaving active unchanged', () => {
    const active = [{ name: 'Ada Lovelace', email: 'ada@example.com', scannedAt: '2026-06-10T09:00:00.000Z' }]
    const archived = [{ name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T08:00:00.000Z' }]
    const result = addLead(active, { name: 'Jane Doe', email: '  JANE@Example.com  ' }, '2026-06-10T10:00:00.000Z', archived)
    expect(result.status).toBe('duplicate')
    expect(result.leads).toBe(active)
  })

  // Cycle 3 — a genuinely new contact, with a non-matching archived bucket present,
  // is still saved and appended to active (archived doesn't spuriously block).
  it('saves a new contact and appends it to active when archived holds different Attendees', () => {
    const active = [{ name: 'Ada Lovelace', email: 'ada@example.com', scannedAt: '2026-06-10T09:00:00.000Z' }]
    const archived = [{ name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T08:00:00.000Z' }]
    const result = addLead(active, { name: 'Alan Turing', email: 'alan@example.com' }, '2026-06-10T10:00:00.000Z', archived)
    expect(result.status).toBe('saved')
    expect(result.leads).toEqual([
      { name: 'Ada Lovelace', email: 'ada@example.com', scannedAt: '2026-06-10T09:00:00.000Z' },
      { name: 'Alan Turing', email: 'alan@example.com', scannedAt: '2026-06-10T10:00:00.000Z' },
    ])
  })
})

describe('archiveAll', () => {
  // Cycle 4 — the whole active list moves into archived (appended after any existing
  // archived); active empties; order + scannedAt preserved; inputs untouched.
  it('empties active and appends the old active onto the existing archived, preserving order and scan times', () => {
    const active = [
      { name: 'Ada Lovelace', email: 'ada@example.com', scannedAt: '2026-06-10T09:00:00.000Z' },
      { name: 'Grace Hopper', email: 'grace@example.com', scannedAt: '2026-06-10T09:05:00.000Z' },
    ]
    const archived = [{ name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T08:00:00.000Z' }]
    const result = archiveAll(active, archived)
    expect(result.active).toEqual([])
    expect(result.archived).toEqual([
      { name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T08:00:00.000Z' },
      { name: 'Ada Lovelace', email: 'ada@example.com', scannedAt: '2026-06-10T09:00:00.000Z' },
      { name: 'Grace Hopper', email: 'grace@example.com', scannedAt: '2026-06-10T09:05:00.000Z' },
    ])
    // non-destructive: the original input arrays are not mutated
    expect(active).toHaveLength(2)
    expect(archived).toHaveLength(1)
  })
})

describe('restoreAll', () => {
  // Cycle 5 — all archived Leads move back into active (appended after existing
  // active); archived empties; order + scannedAt preserved; inputs untouched.
  it('empties archived and appends the old archived onto the existing active, preserving order and scan times', () => {
    const active = [{ name: 'Ada Lovelace', email: 'ada@example.com', scannedAt: '2026-06-10T09:00:00.000Z' }]
    const archived = [
      { name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T08:00:00.000Z' },
      { name: 'Grace Hopper', email: 'grace@example.com', scannedAt: '2026-06-10T08:30:00.000Z' },
    ]
    const result = restoreAll(active, archived)
    expect(result.archived).toEqual([])
    expect(result.active).toEqual([
      { name: 'Ada Lovelace', email: 'ada@example.com', scannedAt: '2026-06-10T09:00:00.000Z' },
      { name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T08:00:00.000Z' },
      { name: 'Grace Hopper', email: 'grace@example.com', scannedAt: '2026-06-10T08:30:00.000Z' },
    ])
    expect(active).toHaveLength(1)
    expect(archived).toHaveLength(2)
  })

  // Cycle 6 — round-trip: archiving the active list then restoring it returns the
  // original active set unchanged; non-destructive (no Lead lost or duplicated).
  it('round-trips an archive-then-restore back to the original active set', () => {
    const active = [
      { name: 'Ada Lovelace', email: 'ada@example.com', scannedAt: '2026-06-10T09:00:00.000Z' },
      { name: 'Grace Hopper', email: 'grace@example.com', scannedAt: '2026-06-10T09:05:00.000Z' },
    ]
    const archivedStep = archiveAll(active, [])
    const restoredStep = restoreAll(archivedStep.active, archivedStep.archived)
    expect(restoredStep.active).toEqual(active)
    expect(restoredStep.archived).toEqual([])
    // no duplication: count is conserved across the round-trip
    expect(restoredStep.active).toHaveLength(active.length)
  })
})
