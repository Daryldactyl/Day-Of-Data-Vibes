import { describe, it, expect, beforeEach } from 'vitest'
import { loadLeads, saveLeads } from './leadsStorage'

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
})
