import { describe, it, expect, beforeEach } from 'vitest'
import { loadLeads, saveLeads, loadArchived, saveArchived } from './leadsStorage'

describe('leads storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns an empty list when nothing has been saved yet', () => {
    expect(loadLeads()).toEqual([])
  })

  it('round-trips saved Leads through storage', () => {
    const leads = [{ name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T15:00:00.000Z' }]
    saveLeads(leads)
    expect(loadLeads()).toEqual(leads)
  })

  // Cycle 7 — the archived bucket persists on its own key, absent → [], and is
  // independent of the active store (saving one never touches the other).
  it('returns an empty archived list when nothing has been archived yet', () => {
    expect(loadArchived()).toEqual([])
  })

  it('round-trips archived Leads independently of the active store', () => {
    const active = [{ name: 'Ada Lovelace', email: 'ada@example.com', scannedAt: '2026-06-10T09:00:00.000Z' }]
    const archived = [{ name: 'Jane Doe', email: 'jane@example.com', scannedAt: '2026-06-10T08:00:00.000Z' }]
    saveLeads(active)
    saveArchived(archived)
    expect(loadArchived()).toEqual(archived)
    // the active store is untouched by archiving
    expect(loadLeads()).toEqual(active)
  })
})
