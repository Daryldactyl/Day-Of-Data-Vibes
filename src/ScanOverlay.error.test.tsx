import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ScanOverlay } from './ScanOverlay'
import { CAMERA_MESSAGES, type CameraErrorInfo } from './lib/cameraError'
import type { CreateScanner, Scanner } from './scanner'

// qr-scanner's start() collapses every getUserMedia failure into this string,
// so the overlay must NOT classify it directly — it must diagnose the real cause.
const QR_SCANNER_MASKED_ERROR = 'Camera not found.'

function fakeScannerFactory(opts: { startError?: unknown } = {}) {
  const scanner: Scanner = {
    start: vi.fn(async () => {
      if (opts.startError !== undefined) throw opts.startError
    }),
    stop: vi.fn(),
    destroy: vi.fn(),
  }
  const create: CreateScanner = () => scanner
  return { create, scanner }
}

const info = (kind: CameraErrorInfo['kind']): CameraErrorInfo => ({
  kind,
  message: CAMERA_MESSAGES[kind],
})

const noop = () => {}

describe('ScanOverlay — graceful failures', () => {
  afterEach(cleanup)

  it('shows the DENIED message even though start() masks the denial as "Camera not found."', async () => {
    const fake = fakeScannerFactory({ startError: QR_SCANNER_MASKED_ERROR })
    render(
      <ScanOverlay
        leads={[]}
        onLeadsChange={noop}
        onDone={noop}
        createScanner={fake.create}
        diagnoseCamera={async () => info('denied')}
      />,
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(CAMERA_MESSAGES.denied)
    expect(alert).not.toHaveTextContent(CAMERA_MESSAGES['no-camera'])
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('shows the no-camera message when diagnosis finds no usable camera', async () => {
    const fake = fakeScannerFactory({ startError: QR_SCANNER_MASKED_ERROR })
    render(
      <ScanOverlay
        leads={[]}
        onLeadsChange={noop}
        onDone={noop}
        createScanner={fake.create}
        diagnoseCamera={async () => info('no-camera')}
      />,
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(CAMERA_MESSAGES['no-camera'])
  })

  it('does not diagnose or show an error when the camera starts fine', async () => {
    const fake = fakeScannerFactory()
    const diagnose = vi.fn(async () => info('other'))
    render(
      <ScanOverlay
        leads={[]}
        onLeadsChange={noop}
        onDone={noop}
        createScanner={fake.create}
        diagnoseCamera={diagnose}
      />,
    )

    await vi.waitFor(() => expect(fake.scanner.start).toHaveBeenCalled())
    expect(diagnose).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('retrying after a recoverable failure restarts the camera and clears the message', async () => {
    const scanner: Scanner = {
      start: vi
        .fn()
        .mockRejectedValueOnce(QR_SCANNER_MASKED_ERROR)
        .mockResolvedValueOnce(undefined),
      stop: vi.fn(),
      destroy: vi.fn(),
    }
    const create: CreateScanner = () => scanner
    render(
      <ScanOverlay
        leads={[]}
        onLeadsChange={noop}
        onDone={noop}
        createScanner={create}
        diagnoseCamera={async () => info('other')}
      />,
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(CAMERA_MESSAGES.other)

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await vi.waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
    expect(scanner.start).toHaveBeenCalledTimes(2)
  })

  it('ignores a second Retry while a restart is still in flight', async () => {
    let resolveRetry: () => void = () => {}
    const start = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(QR_SCANNER_MASKED_ERROR) // mount fails
      .mockImplementationOnce(() => new Promise<void>((res) => { resolveRetry = res })) // retry #1 hangs
    const scanner: Scanner = { start, stop: vi.fn(), destroy: vi.fn() }
    const create: CreateScanner = () => scanner
    render(
      <ScanOverlay
        leads={[]}
        onLeadsChange={noop}
        onDone={noop}
        createScanner={create}
        diagnoseCamera={async () => info('other')}
      />,
    )

    const retry = await screen.findByRole('button', { name: 'Retry' })
    fireEvent.click(retry) // start #2 begins, stays pending
    await vi.waitFor(() => expect(start).toHaveBeenCalledTimes(2))
    fireEvent.click(retry) // must be ignored while #2 is in flight
    await Promise.resolve()
    expect(start).toHaveBeenCalledTimes(2) // not 3 — no concurrent start() on one scanner

    resolveRetry()
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('does not set an error after the overlay is torn down mid-diagnosis', async () => {
    let resolveDiagnose: (info: CameraErrorInfo) => void = () => {}
    const fake = fakeScannerFactory({ startError: QR_SCANNER_MASKED_ERROR })
    const { unmount } = render(
      <ScanOverlay
        leads={[]}
        onLeadsChange={noop}
        onDone={noop}
        createScanner={fake.create}
        diagnoseCamera={() => new Promise<CameraErrorInfo>((res) => { resolveDiagnose = res })}
      />,
    )

    await vi.waitFor(() => expect(fake.scanner.start).toHaveBeenCalled())
    unmount() // Vendor taps Done while diagnosis is still pending
    resolveDiagnose(info('denied'))
    await Promise.resolve()
    // Torn down: nothing rendered, and no setState-after-unmount fallout.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fake.scanner.destroy).toHaveBeenCalled()
  })
})
