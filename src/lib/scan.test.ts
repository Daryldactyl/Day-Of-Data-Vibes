import { describe, it, expect } from 'vitest'
import { handleScan, isFreshScan } from './scan'
import { encodeVCard } from './vcard'
import type { Lead } from './leads'

describe('handleScan', () => {
  it('saves a new Lead when a valid Badge is scanned', () => {
    const badge = encodeVCard({ name: 'Ada Lovelace', email: 'ada@dayofdata.example' })
    const result = handleScan([], badge, '2026-06-10T15:00:00.000Z')
    expect(result.notification).toBe('saved')
    expect(result.leads).toEqual([
      { name: 'Ada Lovelace', email: 'ada@dayofdata.example', scannedAt: '2026-06-10T15:00:00.000Z' },
    ])
  })

  it('reports a duplicate and leaves leads unchanged when the Attendee is already saved', () => {
    const existing: Lead[] = [
      { name: 'Ada Lovelace', email: 'ada@dayofdata.example', scannedAt: '2026-06-10T15:00:00.000Z' },
    ]
    const badge = encodeVCard({ name: 'Ada Lovelace', email: 'ada@dayofdata.example' })
    const result = handleScan(existing, badge, '2026-06-10T16:00:00.000Z')
    expect(result.notification).toBe('duplicate')
    expect(result.leads).toEqual(existing)
  })

  it('reports not-a-badge and leaves leads unchanged for a QR that is not a Badge', () => {
    const existing: Lead[] = [
      { name: 'Ada Lovelace', email: 'ada@dayofdata.example', scannedAt: '2026-06-10T15:00:00.000Z' },
    ]
    const result = handleScan(existing, 'https://example.com', '2026-06-10T16:00:00.000Z')
    expect(result.notification).toBe('not-a-badge')
    expect(result.leads).toEqual(existing)
  })

  it('returns the parsed contact for a valid Badge (so the UI can name the toast), and null otherwise', () => {
    const badge = encodeVCard({ name: 'Grace Hopper', email: 'grace@dayofdata.example' })
    const saved = handleScan([], badge, '2026-06-10T15:00:00.000Z')
    expect(saved.contact).toEqual({ name: 'Grace Hopper', email: 'grace@dayofdata.example' })

    const duplicate = handleScan(saved.leads, badge, '2026-06-10T16:00:00.000Z')
    expect(duplicate.contact).toEqual({ name: 'Grace Hopper', email: 'grace@dayofdata.example' })

    const notBadge = handleScan([], 'just text', '2026-06-10T16:00:00.000Z')
    expect(notBadge.contact).toBeNull()
  })
})

describe('isFreshScan', () => {
  const GAP = 1500

  it('treats the very first decode as fresh', () => {
    expect(isFreshScan(null, 'A', 1000, GAP)).toBe(true)
  })

  it('treats a different Badge as fresh', () => {
    expect(isFreshScan({ key: 'A', at: 1000 }, 'B', 1010, GAP)).toBe(true)
  })

  it('ignores the same Badge re-decoded within the gap (still held in view)', () => {
    expect(isFreshScan({ key: 'A', at: 1000 }, 'A', 1200, GAP)).toBe(false)
  })

  it('treats the same Badge re-presented after the gap as fresh (a deliberate rescan)', () => {
    expect(isFreshScan({ key: 'A', at: 1000 }, 'A', 3000, GAP)).toBe(true)
  })
})
