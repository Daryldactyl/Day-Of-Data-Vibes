import { describe, it, expect, vi, beforeEach } from 'vitest'

// Spy on qrcode so we can assert the render width each generator requests
// without a real canvas. The list generator must request a LARGER QR than the
// 320px badge generator, so dense list chunks have plenty of pixels per module
// for a receiver camera (Slice 14 density decision).
type QrOpts = { width?: number; margin?: number }
const { toDataURL } = vi.hoisted(() => ({
  // Zero declared params (so no unused-arg lint); vitest still records the real
  // call args, which we read via mock.calls to assert the requested width.
  toDataURL: vi.fn((): Promise<string> => Promise.resolve('data:image/png;base64,QR')),
}))
vi.mock('qrcode', () => ({ default: { toDataURL } }))

import { defaultMakeQrDataUrl, defaultMakeListQrDataUrl } from './badgeQr'

const widthOfLastCall = (): number => {
  const lastCall = toDataURL.mock.calls.at(-1) as unknown as [string, QrOpts?] | undefined
  return lastCall?.[1]?.width ?? 0
}

describe('QR generators', () => {
  beforeEach(() => toDataURL.mockClear())

  it('the badge generator renders at 320px', async () => {
    await defaultMakeQrDataUrl('badge-payload')
    expect(widthOfLastCall()).toBe(320)
  })

  it('the list generator renders LARGER than the 320px badge QR', async () => {
    await defaultMakeListQrDataUrl('list-chunk-payload')
    const listWidth = widthOfLastCall()
    expect(listWidth).toBeGreaterThan(320)
    // Sized for a viewing screen so dense chunks stay scannable (~640–720px).
    expect(listWidth).toBeGreaterThanOrEqual(640)
  })
})
