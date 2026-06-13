import { describe, it, expect, afterEach, vi } from 'vitest'
import { diagnoseCamera } from './scanner'

/** Install a fake navigator.mediaDevices.getUserMedia for one test. */
function stubGetUserMedia(impl: () => Promise<MediaStream>) {
  const original = navigator.mediaDevices
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(impl) },
  })
  return () => Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: original })
}

describe('diagnoseCamera', () => {
  let restore = () => {}
  afterEach(() => restore())

  it('reports denied when getUserMedia is blocked by permission', async () => {
    restore = stubGetUserMedia(async () => {
      throw new DOMException('Permission denied', 'NotAllowedError')
    })
    expect((await diagnoseCamera()).kind).toBe('denied')
  })

  it('reports no-camera when no capture device exists', async () => {
    restore = stubGetUserMedia(async () => {
      throw new DOMException('Requested device not found', 'NotFoundError')
    })
    expect((await diagnoseCamera()).kind).toBe('no-camera')
  })

  it('reports other and releases the probe stream when the camera is actually grantable', async () => {
    const track = { stop: vi.fn() }
    const stream = { getTracks: () => [track] } as unknown as MediaStream
    restore = stubGetUserMedia(async () => stream)

    expect((await diagnoseCamera()).kind).toBe('other')
    expect(track.stop).toHaveBeenCalled() // probe must not hold the camera open
  })

  it('probes the rear (environment) camera', async () => {
    const gum = vi.fn(async () => { throw new DOMException('x', 'NotFoundError') })
    restore = stubGetUserMedia(gum)

    await diagnoseCamera()
    expect(gum).toHaveBeenCalledWith({ video: { facingMode: 'environment' }, audio: false })
  })
})
