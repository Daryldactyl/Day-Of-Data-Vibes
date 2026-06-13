import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import App from './App'
import { encodeVCard } from './lib/vcard'
import { loadLeads } from './lib/leadsStorage'
import type { CreateScanner } from './scanner'

/** A fake qr-scanner that captures the onDecode callback so a test can drive
 *  decodes without a real camera. */
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

const badge = (name: string, email: string) => encodeVCard({ name, email })

// These tests use a fake scanner whose start() resolves (camera works); the
// no-camera and permission-denied paths are covered in ScanOverlay.error.test.tsx.

describe('Scan flow', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('opens the camera overlay and starts the camera when Scan is tapped', async () => {
    const fake = makeFakeScanner()
    render(<App createScanner={fake.create} />)
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    expect(screen.getByTestId('scan-overlay')).toBeInTheDocument()
    await vi.waitFor(() => expect(fake.scanner.start).toHaveBeenCalled())
  })

  it('saves a new Lead, dedupes a re-scan, and ignores a non-Badge — then returns to the list', () => {
    const fake = makeFakeScanner()
    render(<App createScanner={fake.create} />)
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))

    // New Badge → saved
    fake.scan(badge('Ada Lovelace', 'ada@dayofdata.example'))
    expect(screen.getByTestId('scan-toast')).toHaveTextContent('Saved: Ada Lovelace')
    expect(screen.getByTestId('scan-lead-count')).toHaveTextContent('1 lead')

    // Same Badge again → already saved, no new row
    fake.scan(badge('Ada Lovelace', 'ada@dayofdata.example'))
    expect(screen.getByTestId('scan-toast')).toHaveTextContent('Already saved: Ada Lovelace')
    expect(screen.getByTestId('scan-lead-count')).toHaveTextContent('1 lead')

    // Junk QR → not a badge, no new row
    fake.scan('https://example.com/poster')
    expect(screen.getByTestId('scan-toast')).toHaveTextContent('Not a badge')
    expect(screen.getByTestId('scan-lead-count')).toHaveTextContent('1 lead')

    // Persisted immediately
    expect(loadLeads()).toEqual([
      expect.objectContaining({ name: 'Ada Lovelace', email: 'ada@dayofdata.example' }),
    ])

    // Done releases the camera (stop + destroy) and returns to the list
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(fake.scanner.stop).toHaveBeenCalled()
    expect(fake.scanner.destroy).toHaveBeenCalled()
    expect(screen.queryByTestId('scan-overlay')).not.toBeInTheDocument()
    expect(screen.getByTestId('lead-count')).toHaveTextContent('1 lead')
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
  })
})
