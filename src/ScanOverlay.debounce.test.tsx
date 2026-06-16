import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import App from './App'
import { encodeVCard } from './lib/vcard'
import type { CreateScanner, Scanner } from './scanner'

// qr-scanner re-decodes a Badge held in view every frame. These tests prove the
// overlay treats that continuous stream as one Scan (the confirmation survives),
// and only shows "Already saved" when the Badge is re-presented after leaving.
function makeFakeScanner() {
  let decode: (text: string) => void = () => {}
  const scanner: Scanner = { start: vi.fn(async () => {}), stop: vi.fn(), destroy: vi.fn() }
  const create: CreateScanner = (_video, onDecode) => {
    decode = onDecode
    return scanner
  }
  return { create, scanner, scan: (t: string) => act(() => decode(t)) }
}

const badge = (name: string, email: string) => encodeVCard({ name, email })

describe('Scan overlay — same-Badge debounce', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('holds a Badge kept in view to one save and keeps the confirmation (no instant "Already saved")', () => {
    vi.useFakeTimers()
    const fake = makeFakeScanner()
    render(<App createScanner={fake.create} />)
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))

    const b = badge('Ada Lovelace', 'ada@dayofdata.example')
    fake.scan(b)
    expect(screen.getByTestId('scan-toast')).toHaveTextContent('Saved: Ada Lovelace')

    // The same Badge, re-decoded a few frames later while still held, is ignored.
    act(() => vi.advanceTimersByTime(100))
    fake.scan(b)
    act(() => vi.advanceTimersByTime(100))
    fake.scan(b)

    expect(screen.getByTestId('scan-toast')).toHaveTextContent('Saved: Ada Lovelace')
    expect(screen.getByTestId('scan-lead-count')).toHaveTextContent('1 lead')
  })

  it('shows "Already saved" only when the same Badge is re-presented after leaving the view', () => {
    vi.useFakeTimers()
    const fake = makeFakeScanner()
    render(<App createScanner={fake.create} />)
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))

    const b = badge('Ada Lovelace', 'ada@dayofdata.example')
    fake.scan(b)
    expect(screen.getByTestId('scan-toast')).toHaveTextContent('Saved: Ada Lovelace')

    // Badge leaves the frame (no decodes) for longer than the gap, then is scanned again.
    act(() => vi.advanceTimersByTime(2000))
    fake.scan(b)

    expect(screen.getByTestId('scan-toast')).toHaveTextContent('Already saved: Ada Lovelace')
    expect(screen.getByTestId('scan-lead-count')).toHaveTextContent('1 lead')
  })
})
