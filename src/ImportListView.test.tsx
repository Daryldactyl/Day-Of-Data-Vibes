import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { ImportListView } from './ImportListView'
import { encodeListChunks } from './lib/listTransfer'
import { encodeVCard } from './lib/vcard'
import { loadLeads } from './lib/leadsStorage'
import type { Lead } from './lib/leads'
import type { CreateScanner } from './scanner'

/** A fake qr-scanner that captures the onDecode callback so a test can drive
 *  decodes without a real camera (mirrors App.scan.test.tsx). */
function makeFakeScanner() {
  let decode: (text: string) => void = () => {}
  const scanner = {
    start: vi.fn(async () => {}),
    stop: vi.fn(),
    destroy: vi.fn(),
  }
  const create: CreateScanner = (_video, onDecode) => {
    decode = onDecode
    return scanner
  }
  return {
    create,
    scanner,
    scan: (text: string) => act(() => decode(text)),
  }
}

const lead = (name: string, email: string): Lead => ({
  name,
  email,
  scannedAt: '2026-06-16T10:00:00.000Z',
})

const noop = () => {}

describe('ImportListView — import mode routing', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('ignores a vCard Badge scanned in import mode — no progress, no merge', () => {
    const fake = makeFakeScanner()
    const onLeadsChange = vi.fn()
    render(
      <ImportListView
        leads={[]}
        onLeadsChange={onLeadsChange}
        onDone={noop}
        createScanner={fake.create}
      />,
    )

    // A real vCard Badge is NOT a list chunk (decodeChunk → null): the import
    // scanner must ignore it (ADR-0001 — the two scan modes never cross).
    fake.scan(encodeVCard({ name: 'Ada Lovelace', email: 'ada@x.example' }))

    expect(onLeadsChange).not.toHaveBeenCalled()
    expect(loadLeads()).toEqual([])
    // No transfer has begun, so no "imported i of M" progress is shown.
    expect(screen.queryByTestId('import-progress')).not.toBeInTheDocument()
  })

  it('shows "imported 1 of M" progress and the still-missing indices after chunk 0', () => {
    const fake = makeFakeScanner()
    // 5 Leads at chunkSize 2 → 3 chunks (indices 0,1,2).
    const codes = encodeListChunks(
      [
        lead('A', 'a@x.example'),
        lead('B', 'b@x.example'),
        lead('C', 'c@x.example'),
        lead('D', 'd@x.example'),
        lead('E', 'e@x.example'),
      ],
      't1',
      2,
    )
    render(
      <ImportListView leads={[]} onLeadsChange={noop} onDone={noop} createScanner={fake.create} />,
    )

    fake.scan(codes[0])

    const progress = screen.getByTestId('import-progress')
    expect(progress).toHaveTextContent('Imported 1 of 3')
    // Indices 1 and 2 are still missing.
    expect(screen.getByTestId('import-missing')).toHaveTextContent('2, 3')
  })

  it('completes on all chunks (out-of-order + duplicate), merges, persists, and shows the summary', () => {
    const fake = makeFakeScanner()
    const incoming = [
      lead('A', 'a@x.example'),
      lead('B', 'b@x.example'),
      lead('C', 'c@x.example'),
    ]
    const codes = encodeListChunks(incoming, 't1', 2) // 2 chunks: 0,1
    const onLeadsChange = vi.fn()
    render(
      <ImportListView
        leads={[]}
        onLeadsChange={onLeadsChange}
        onDone={noop}
        createScanner={fake.create}
      />,
    )

    // Arrive out of order (1 then 0), with a harmless duplicate of 1.
    fake.scan(codes[1])
    fake.scan(codes[1]) // duplicate — idempotent
    expect(screen.queryByTestId('import-summary')).not.toBeInTheDocument()
    fake.scan(codes[0])

    // All 3 incoming Leads are new to our (empty) list.
    const summary = screen.getByTestId('import-summary')
    expect(summary).toHaveTextContent('Imported 3 new Leads (0 already had)')

    // Home reflects the combined list; persisted to localStorage.
    expect(onLeadsChange).toHaveBeenLastCalledWith([
      lead('A', 'a@x.example'),
      lead('B', 'b@x.example'),
      lead('C', 'c@x.example'),
    ])
    expect(loadLeads()).toEqual([
      lead('A', 'a@x.example'),
      lead('B', 'b@x.example'),
      lead('C', 'c@x.example'),
    ])
  })

  it('ignores a foreign-transfer chunk mid-import without corrupting the active transfer', () => {
    const fake = makeFakeScanner()
    const mine = [lead('A', 'a@x.example'), lead('B', 'b@x.example'), lead('C', 'c@x.example')]
    const codes = encodeListChunks(mine, 't1', 2) // 2 chunks: 0,1
    // A teammate's nearby transfer 't2' with its own index-1 chunk.
    const foreign = encodeListChunks(
      [lead('X', 'x@x.example'), lead('Y', 'y@x.example'), lead('Z', 'z@x.example')],
      't2',
      2,
    )
    const onLeadsChange = vi.fn()
    render(
      <ImportListView
        leads={[]}
        onLeadsChange={onLeadsChange}
        onDone={noop}
        createScanner={fake.create}
      />,
    )

    fake.scan(codes[0]) // t1 index 0 sets the active transfer
    fake.scan(foreign[1]) // t2 — must be ignored, not counted toward t1
    // Active transfer is still partial (only index 0 of t1 in); index 1 missing.
    expect(screen.getByTestId('import-progress')).toHaveTextContent('Imported 1 of 2')
    expect(screen.getByTestId('import-missing')).toHaveTextContent('2')
    expect(screen.queryByTestId('import-summary')).not.toBeInTheDocument()

    fake.scan(codes[1]) // t1 index 1 completes the active transfer
    expect(screen.getByTestId('import-summary')).toHaveTextContent(
      'Imported 3 new Leads (0 already had)',
    )
    // Only my Leads merged — none of the foreign transfer leaked in.
    expect(onLeadsChange).toHaveBeenLastCalledWith(mine)
  })

  it('dedups incoming against existing Leads (existing wins; new keeps its scannedAt) and persists', () => {
    const fake = makeFakeScanner()
    const existing: Lead[] = [
      { name: 'Ada Lovelace', email: 'ada@x.example', scannedAt: '2026-06-16T09:00:00.000Z' },
    ]
    // Persist existing so loadLeads has a baseline (the App owns load; here we
    // pass `leads` in and assert the merge persists the combined list).
    const incoming: Lead[] = [
      // New person — added, keeping its ORIGINAL scannedAt (08:00), not "now".
      { name: 'Grace Hopper', email: 'grace@x.example', scannedAt: '2026-06-16T08:00:00.000Z' },
      // Same Attendee as existing (email matches, different case) — existing wins, skipped.
      { name: 'Ada L.', email: 'ADA@x.example', scannedAt: '2026-06-16T11:00:00.000Z' },
    ]
    const codes = encodeListChunks(incoming, 't9', 5) // 1 chunk (2 ≤ 5)
    const onLeadsChange = vi.fn()
    render(
      <ImportListView
        leads={existing}
        onLeadsChange={onLeadsChange}
        onDone={noop}
        createScanner={fake.create}
      />,
    )

    fake.scan(codes[0])

    expect(screen.getByTestId('import-summary')).toHaveTextContent(
      'Imported 1 new Lead (1 already had)',
    )
    const expected: Lead[] = [
      { name: 'Ada Lovelace', email: 'ada@x.example', scannedAt: '2026-06-16T09:00:00.000Z' },
      { name: 'Grace Hopper', email: 'grace@x.example', scannedAt: '2026-06-16T08:00:00.000Z' },
    ]
    expect(onLeadsChange).toHaveBeenLastCalledWith(expected)
    expect(loadLeads()).toEqual(expected)
  })
})
