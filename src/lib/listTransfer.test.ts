import { describe, it, expect } from 'vitest'
import { encodeListChunks, decodeChunk, reassembleChunks, mergeLeads } from './listTransfer'
import { encodeVCard } from './vcard'
import type { Lead } from './leads'

const lead = (name: string, email: string): Lead => ({
  name,
  email,
  scannedAt: '2026-06-16T10:00:00.000Z',
})

describe('encodeListChunks', () => {
  it('splits N Leads into ceil(N/chunkSize) payload strings', () => {
    const leads: Lead[] = [
      lead('A', 'a@x.example'),
      lead('B', 'b@x.example'),
      lead('C', 'c@x.example'),
      lead('D', 'd@x.example'),
      lead('E', 'e@x.example'),
    ]
    const codes = encodeListChunks(leads, 't1', 2)
    expect(codes).toHaveLength(3)
  })
})

describe('round-trip (encode → decode → reassemble)', () => {
  it('reproduces the original Leads in order, complete', () => {
    const leads: Lead[] = [
      lead('A', 'a@x.example'),
      lead('B', 'b@x.example'),
      lead('C', 'c@x.example'),
      lead('D', 'd@x.example'),
      lead('E', 'e@x.example'),
    ]
    const emitted = encodeListChunks(leads, 't1', 2)
    const decoded = emitted.map(decodeChunk)
    // none of the emitted chunks should fail to decode
    expect(decoded.every((c) => c !== null)).toBe(true)
    const result = reassembleChunks(decoded as NonNullable<(typeof decoded)[number]>[])
    expect(result.complete).toBe(true)
    expect(result.leads).toEqual(leads)
  })
})

describe('decodeChunk on emitted chunks', () => {
  it('decodes each chunk with transferId, correct index/total, and its Leads slice', () => {
    const leads: Lead[] = [
      lead('A', 'a@x.example'),
      lead('B', 'b@x.example'),
      lead('C', 'c@x.example'),
      lead('D', 'd@x.example'),
      lead('E', 'e@x.example'),
    ]
    const emitted = encodeListChunks(leads, 't1', 2)

    expect(decodeChunk(emitted[0])).toEqual({
      transferId: 't1',
      index: 0,
      total: 3,
      leads: [lead('A', 'a@x.example'), lead('B', 'b@x.example')],
    })
    expect(decodeChunk(emitted[1])).toEqual({
      transferId: 't1',
      index: 1,
      total: 3,
      leads: [lead('C', 'c@x.example'), lead('D', 'd@x.example')],
    })
    expect(decodeChunk(emitted[2])).toEqual({
      transferId: 't1',
      index: 2,
      total: 3,
      leads: [lead('E', 'e@x.example')],
    })
  })

  it('returns null for a vCard Badge string (the badge/non-badge boundary)', () => {
    const vcard = encodeVCard({ name: 'Ada Lovelace', email: 'ada@x.example' })
    expect(decodeChunk(vcard)).toBeNull()
  })

  it('returns null for arbitrary junk', () => {
    expect(decodeChunk('just some scanned text')).toBeNull()
    expect(decodeChunk('https://example.com/whatever')).toBeNull()
    expect(decodeChunk('')).toBeNull()
    // valid JSON, but lacking the marker
    expect(decodeChunk('{"hello":"world"}')).toBeNull()
    expect(decodeChunk('[1,2,3]')).toBeNull()
    expect(decodeChunk('42')).toBeNull()
    expect(decodeChunk('null')).toBeNull()
  })

  it('returns null for a marked payload that is structurally malformed', () => {
    // Has the marker but is missing/typed-wrong on the required fields.
    expect(decodeChunk('{"dod":"leads"}')).toBeNull()
    expect(decodeChunk('{"dod":"leads","id":"t1","i":0,"m":2}')).toBeNull() // no leads
    expect(decodeChunk('{"dod":"leads","id":"t1","i":"0","m":2,"leads":[]}')).toBeNull() // i not a number
    expect(decodeChunk('{"dod":"leads","id":5,"i":0,"m":2,"leads":[]}')).toBeNull() // id not a string
  })
})

describe('reassembleChunks', () => {
  it('reports correct have/total/missing and complete:false for a partial transfer', () => {
    const leads: Lead[] = [
      lead('A', 'a@x.example'),
      lead('B', 'b@x.example'),
      lead('C', 'c@x.example'),
      lead('D', 'd@x.example'),
      lead('E', 'e@x.example'),
    ]
    const emitted = encodeListChunks(leads, 't1', 2) // 3 chunks: 0,1,2
    // Only chunks 0 and 2 arrived; index 1 is still missing.
    const chunks = [decodeChunk(emitted[0])!, decodeChunk(emitted[2])!]
    const result = reassembleChunks(chunks)
    expect(result.have).toBe(2)
    expect(result.total).toBe(3)
    expect(result.missing).toEqual([1])
    expect(result.complete).toBe(false)
  })

  it('reassembles correctly when chunks arrive out of order', () => {
    const leads: Lead[] = [
      lead('A', 'a@x.example'),
      lead('B', 'b@x.example'),
      lead('C', 'c@x.example'),
      lead('D', 'd@x.example'),
      lead('E', 'e@x.example'),
    ]
    const emitted = encodeListChunks(leads, 't1', 2) // 3 chunks
    // Arrive in the order 2, 0, 1.
    const chunks = [decodeChunk(emitted[2])!, decodeChunk(emitted[0])!, decodeChunk(emitted[1])!]
    const result = reassembleChunks(chunks)
    expect(result.complete).toBe(true)
    expect(result.missing).toEqual([])
    expect(result.leads).toEqual(leads)
  })

  it('is idempotent when the same index is scanned twice', () => {
    const leads: Lead[] = [
      lead('A', 'a@x.example'),
      lead('B', 'b@x.example'),
      lead('C', 'c@x.example'),
    ]
    const emitted = encodeListChunks(leads, 't1', 2) // 2 chunks: 0,1
    const c0 = decodeChunk(emitted[0])!
    const c1 = decodeChunk(emitted[1])!
    const withoutDup = reassembleChunks([c0, c1])
    // Chunk 0 scanned twice must not change the result.
    const withDup = reassembleChunks([c0, c1, c0])
    expect(withDup).toEqual(withoutDup)
    expect(withDup.have).toBe(2)
    expect(withDup.complete).toBe(true)
    expect(withDup.leads).toEqual(leads)
  })

  it('ignores a chunk from a different transfer id (no corruption of the active transfer)', () => {
    const mine: Lead[] = [
      lead('A', 'a@x.example'),
      lead('B', 'b@x.example'),
      lead('C', 'c@x.example'),
    ]
    const emitted = encodeListChunks(mine, 't1', 2) // 2 chunks: 0,1
    // A teammate's nearby transfer 't2' also has an index-1 chunk; it must not
    // overwrite or count toward the active 't1' reassembly.
    const foreign = encodeListChunks(
      [lead('X', 'x@x.example'), lead('Y', 'y@x.example'), lead('Z', 'z@x.example')],
      't2',
      2,
    )
    const c0 = decodeChunk(emitted[0])! // t1, index 0
    const c1 = decodeChunk(emitted[1])! // t1, index 1
    const foreign1 = decodeChunk(foreign[1])! // t2, index 1

    // First chunk (t1) sets the active transfer; the foreign chunk is ignored.
    const result = reassembleChunks([c0, foreign1, c1])
    expect(result.total).toBe(2)
    expect(result.have).toBe(2)
    expect(result.missing).toEqual([])
    expect(result.complete).toBe(true)
    expect(result.leads).toEqual(mine)
  })

  it('handles an empty chunk list safely: nothing received, not complete, no crash', () => {
    const result = reassembleChunks([])
    expect(result.have).toBe(0)
    expect(result.total).toBe(0)
    expect(result.missing).toEqual([])
    expect(result.complete).toBe(false)
    expect(result.leads).toEqual([])
  })
})

describe('mergeLeads', () => {
  it('adds new Leads (with their own scannedAt), skips email dupes (existing wins), non-destructively', () => {
    const existing: Lead[] = [
      { name: 'Ada Lovelace', email: 'ada@x.example', scannedAt: '2026-06-16T09:00:00.000Z' },
      { name: 'Alan Turing', email: 'alan@x.example', scannedAt: '2026-06-16T09:05:00.000Z' },
    ]
    const incoming: Lead[] = [
      // New person — should be added, keeping its own (original) scan time.
      { name: 'Grace Hopper', email: 'grace@x.example', scannedAt: '2026-06-16T08:00:00.000Z' },
      // Same Attendee as existing (email matches, different-cased + name differs):
      // existing wins, this is skipped.
      { name: 'Ada L.', email: 'ADA@x.example', scannedAt: '2026-06-16T11:00:00.000Z' },
    ]
    const before = structuredClone(existing)

    const result = mergeLeads(existing, incoming)

    expect(result.added).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.merged).toEqual([
      { name: 'Ada Lovelace', email: 'ada@x.example', scannedAt: '2026-06-16T09:00:00.000Z' },
      { name: 'Alan Turing', email: 'alan@x.example', scannedAt: '2026-06-16T09:05:00.000Z' },
      // Added with its original scannedAt (08:00), not "now".
      { name: 'Grace Hopper', email: 'grace@x.example', scannedAt: '2026-06-16T08:00:00.000Z' },
    ])
    // Non-destructive: the caller's existing array is untouched.
    expect(existing).toEqual(before)
  })

  it('skips an incoming Lead whose email is in the archived bucket (dedup spans active ∪ archived — ADR-0005)', () => {
    const existing: Lead[] = [
      { name: 'Ada Lovelace', email: 'ada@x.example', scannedAt: '2026-06-16T09:00:00.000Z' },
    ]
    const archived: Lead[] = [
      { name: 'Grace Hopper', email: 'grace@x.example', scannedAt: '2026-06-15T08:00:00.000Z' },
    ]
    const incoming: Lead[] = [
      // Already handed off (archived) — must be skipped, never re-added.
      { name: 'Grace H.', email: 'GRACE@x.example', scannedAt: '2026-06-16T11:00:00.000Z' },
      // Genuinely new — added.
      { name: 'Alan Turing', email: 'alan@x.example', scannedAt: '2026-06-16T10:30:00.000Z' },
    ]

    const result = mergeLeads(existing, incoming, archived)

    expect(result.added).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.merged).toEqual([
      { name: 'Ada Lovelace', email: 'ada@x.example', scannedAt: '2026-06-16T09:00:00.000Z' },
      { name: 'Alan Turing', email: 'alan@x.example', scannedAt: '2026-06-16T10:30:00.000Z' },
    ])
  })
})
