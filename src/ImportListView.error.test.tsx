import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ImportListView } from './ImportListView'
import { CAMERA_MESSAGES, type CameraErrorInfo } from './lib/cameraError'
import type { CreateScanner, Scanner } from './scanner'

// The import scanner is a camera view like ScanOverlay; a denied/missing camera
// must show a graceful message + Retry, not a blank view or a floating rejection.
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

const info = (kind: CameraErrorInfo['kind']): CameraErrorInfo => ({ kind, message: CAMERA_MESSAGES[kind] })
const noop = () => {}

describe('ImportListView — graceful camera failures', () => {
  afterEach(cleanup)

  it('shows the diagnosed camera error (denied) with a Retry, not a blank view', async () => {
    const fake = fakeScannerFactory({ startError: QR_SCANNER_MASKED_ERROR })
    render(
      <ImportListView
        leads={[]}
        onLeadsChange={noop}
        onDone={noop}
        createScanner={fake.create}
        diagnoseCamera={async () => info('denied')}
      />,
    )
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(CAMERA_MESSAGES.denied)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('does not diagnose or show an error when the camera starts fine', async () => {
    const fake = fakeScannerFactory()
    const diagnose = vi.fn(async () => info('other'))
    render(
      <ImportListView
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
      start: vi.fn().mockRejectedValueOnce(QR_SCANNER_MASKED_ERROR).mockResolvedValueOnce(undefined),
      stop: vi.fn(),
      destroy: vi.fn(),
    }
    const create: CreateScanner = () => scanner
    render(
      <ImportListView
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
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(scanner.start).toHaveBeenCalledTimes(2)
  })
})
