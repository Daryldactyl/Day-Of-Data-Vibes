import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// Spy on qrcode so we can confirm the sender's DEFAULT generator (no injected
// makeQrDataUrl) renders dense list chunks at the LARGER list size — not the
// 320px badge size (Slice 14 density decision).
type QrOpts = { width?: number; margin?: number }
const { toDataURL } = vi.hoisted(() => ({
  // Zero declared params (no unused-arg lint); vitest records the real call args.
  toDataURL: vi.fn((): Promise<string> => Promise.resolve('data:image/png;base64,QR')),
}))
vi.mock('qrcode', () => ({ default: { toDataURL } }))

import { ShareListView } from './ShareListView'
import type { Lead } from './lib/leads'

afterEach(() => {
  cleanup()
  toDataURL.mockClear()
})

const lead = (n: number): Lead => ({
  name: `Attendee ${n}`,
  email: `a${n}@x.example`,
  scannedAt: '2026-06-16T10:00:00.000Z',
})

describe('ShareListView default QR generator', () => {
  it('uses the larger list QR (>320px) when no makeQrDataUrl is injected', async () => {
    // No makeQrDataUrl prop → ShareListView's default generator runs.
    render(
      <ShareListView leads={[lead(1), lead(2)]} onDone={() => {}} makeTransferId={() => 'id'} />,
    )
    await screen.findByRole('img')

    expect(toDataURL).toHaveBeenCalled()
    const firstCall = toDataURL.mock.calls[0] as unknown as [string, QrOpts?]
    expect(firstCall[1]?.width ?? 0).toBeGreaterThan(320)
  })
})
