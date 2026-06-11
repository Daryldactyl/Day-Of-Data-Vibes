import { describe, it, expect } from 'vitest'
import { addLead } from './leads'

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
})
