import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ShareListView } from './ShareListView'
import { encodeListChunks, DEFAULT_CHUNK_SIZE } from './lib/listTransfer'
import type { Lead } from './lib/leads'
import type { MakeQrDataUrl } from './badgeQr'

afterEach(cleanup)

const lead = (n: number): Lead => ({
  name: `Attendee ${n}`,
  email: `a${n}@x.example`,
  scannedAt: '2026-06-16T10:00:00.000Z',
})

/** N Leads, enough to span several chunks at DEFAULT_CHUNK_SIZE. */
const manyLeads = (n: number): Lead[] => Array.from({ length: n }, (_, i) => lead(i))

describe('ShareListView', () => {
  it('renders ceil(N/chunkSize) QR <img>s, one per chunk', async () => {
    const leads = manyLeads(45)
    const makeQrDataUrl = vi.fn(async (text: string) => `data:image/png;base64,QR(${text.length})`)
    render(
      <ShareListView
        leads={leads}
        onDone={() => {}}
        makeQrDataUrl={makeQrDataUrl}
        makeTransferId={() => 'fixed-id'}
      />,
    )

    const expectedCount = Math.ceil(leads.length / DEFAULT_CHUNK_SIZE)
    const imgs = await screen.findAllByRole('img')
    expect(imgs).toHaveLength(expectedCount)
  })

  it('labels each card "Code i+1 of M" (1-based for humans)', async () => {
    const leads = manyLeads(45)
    const m = Math.ceil(leads.length / DEFAULT_CHUNK_SIZE)
    const makeQrDataUrl = vi.fn(async () => 'data:image/png;base64,QR')
    render(
      <ShareListView
        leads={leads}
        onDone={() => {}}
        makeQrDataUrl={makeQrDataUrl}
        makeTransferId={() => 'fixed-id'}
      />,
    )

    expect(await screen.findByText(`Code 1 of ${m}`)).toBeInTheDocument()
    expect(screen.getByText(`Code 2 of ${m}`)).toBeInTheDocument()
    expect(screen.getByText(`Code ${m} of ${m}`)).toBeInTheDocument()
  })

  it('calls makeQrDataUrl with exactly the encodeListChunks payload strings (real chunks)', async () => {
    const leads = manyLeads(45)
    const makeQrDataUrl = vi.fn<MakeQrDataUrl>(async () => 'data:image/png;base64,QR')
    render(
      <ShareListView
        leads={leads}
        onDone={() => {}}
        makeQrDataUrl={makeQrDataUrl}
        makeTransferId={() => 'fixed-id'}
      />,
    )

    await screen.findAllByRole('img')

    const expectedPayloads = encodeListChunks(leads, 'fixed-id', DEFAULT_CHUNK_SIZE)
    expect(makeQrDataUrl).toHaveBeenCalledTimes(expectedPayloads.length)
    const actualPayloads = makeQrDataUrl.mock.calls.map((c) => c[0])
    expect(actualPayloads).toEqual(expectedPayloads)
  })

  it('is read-only — rendering changes neither the Leads array nor localStorage', async () => {
    localStorage.clear()
    const leads = manyLeads(45)
    const before = structuredClone(leads)
    const makeQrDataUrl = vi.fn(async () => 'data:image/png;base64,QR')
    render(
      <ShareListView
        leads={leads}
        onDone={() => {}}
        makeQrDataUrl={makeQrDataUrl}
        makeTransferId={() => 'fixed-id'}
      />,
    )

    await screen.findAllByRole('img')

    expect(leads).toEqual(before)
    expect(localStorage.length).toBe(0)
  })
})
