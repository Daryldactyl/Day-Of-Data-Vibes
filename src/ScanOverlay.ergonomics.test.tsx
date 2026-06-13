import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import App from './App'
import { ScanOverlay } from './ScanOverlay'
import { encodeVCard } from './lib/vcard'
import type { CreateScanner, Scanner } from './scanner'

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
const noop = () => {}

describe('Scan overlay — ergonomics', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('shows a live count that increments as distinct Leads are saved', () => {
    const fake = makeFakeScanner()
    render(<App createScanner={fake.create} />)
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))

    expect(screen.getByTestId('scan-lead-count')).toHaveTextContent('0 leads')
    fake.scan(badge('Ada Lovelace', 'ada@dayofdata.example'))
    expect(screen.getByTestId('scan-lead-count')).toHaveTextContent('1 lead')
    fake.scan(badge('Grace Hopper', 'grace@dayofdata.example'))
    expect(screen.getByTestId('scan-lead-count')).toHaveTextContent('2 leads')
  })

  it('releases the camera (stop + destroy) when the overlay unmounts', () => {
    const fake = makeFakeScanner()
    const { unmount } = render(
      <ScanOverlay leads={[]} onLeadsChange={noop} onDone={noop} createScanner={fake.create} />,
    )
    unmount()
    expect(fake.scanner.stop).toHaveBeenCalled()
    expect(fake.scanner.destroy).toHaveBeenCalled()
  })

  it('auto-dismisses a toast after ~2s while the camera keeps scanning', () => {
    vi.useFakeTimers()
    try {
      const fake = makeFakeScanner()
      render(<App createScanner={fake.create} />)
      fireEvent.click(screen.getByRole('button', { name: 'Scan' }))

      fake.scan(badge('Ada Lovelace', 'ada@dayofdata.example'))
      expect(screen.getByTestId('scan-toast')).toBeInTheDocument()

      act(() => { vi.advanceTimersByTime(2000) })
      // Toast is gone, but the overlay (camera) is still mounted — never blocked.
      expect(screen.queryByTestId('scan-toast')).not.toBeInTheDocument()
      expect(screen.getByTestId('scan-overlay')).toBeInTheDocument()
      expect(fake.scanner.stop).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
