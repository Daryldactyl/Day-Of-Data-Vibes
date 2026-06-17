import { describe, it, expect } from 'vitest'
import { pickWinner } from './raffle'
import type { Lead } from './leads'

const lead = (name: string, email: string): Lead => ({
  name,
  email,
  scannedAt: '2026-06-16T10:00:00.000Z',
})

describe('pickWinner', () => {
  it('returns a Lead that is one of the input Leads', () => {
    const leads = [
      lead('Ada Lovelace', 'ada@dayofdata.example'),
      lead('Grace Hopper', 'grace@dayofdata.example'),
      lead('Alan Turing', 'alan@dayofdata.example'),
    ]
    const winner = pickWinner(leads, () => 0.5)
    expect(leads).toContain(winner)
  })

  it('returns the only Lead from a single-Lead list, for any rng', () => {
    const only = lead('Ada Lovelace', 'ada@dayofdata.example')
    expect(pickWinner([only], () => 0)).toBe(only)
    expect(pickWinner([only], () => 0.5)).toBe(only)
    expect(pickWinner([only], () => 0.999999)).toBe(only)
  })

  it('spans the whole list: rng→0 picks the first, rng→~1 picks the last (no off-by-one, clamped)', () => {
    const leads = [
      lead('Ada Lovelace', 'ada@dayofdata.example'),
      lead('Grace Hopper', 'grace@dayofdata.example'),
      lead('Alan Turing', 'alan@dayofdata.example'),
    ]
    expect(pickWinner(leads, () => 0)).toBe(leads[0])
    expect(pickWinner(leads, () => 0.999)).toBe(leads[2])
    // A fake rng returning exactly 1 must clamp to the last index, not overflow.
    expect(pickWinner(leads, () => 1)).toBe(leads[2])
  })

  it('returns null for an empty list (the defined contract)', () => {
    expect(pickWinner([], () => 0)).toBeNull()
    expect(pickWinner([], () => 0.999)).toBeNull()
  })
})
