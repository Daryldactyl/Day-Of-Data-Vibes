import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import App from './App'
import { encodeListChunks } from './lib/listTransfer'
import { loadLeads, saveArchived } from './lib/leadsStorage'
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

describe('Import a list — App wiring', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('opens the import view from the footer, merges a scanned list into Home, and Done releases the camera', () => {
    const fake = makeFakeScanner()
    render(<App createScanner={fake.create} />)

    // Entry point sits beside "Show my list as codes".
    fireEvent.click(screen.getByRole('button', { name: 'Import a list' }))
    expect(screen.getByTestId('import-overlay')).toBeInTheDocument()

    // Scan a teammate's one-chunk list.
    const codes = encodeListChunks([lead('A', 'a@x.example'), lead('B', 'b@x.example')], 't1', 9)
    fake.scan(codes[0])
    expect(screen.getByTestId('import-summary')).toHaveTextContent(
      'Imported 2 new Leads (0 already had)',
    )

    // Done releases the camera (stop + destroy) and returns to Home.
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(fake.scanner.stop).toHaveBeenCalled()
    expect(fake.scanner.destroy).toHaveBeenCalled()
    expect(screen.queryByTestId('import-overlay')).not.toBeInTheDocument()

    // Home reflects the merged, persisted list.
    expect(screen.getByTestId('lead-count')).toHaveTextContent('2 leads')
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(loadLeads()).toEqual([lead('A', 'a@x.example'), lead('B', 'b@x.example')])
  })

  it('skips an imported Lead already in the archived bucket (dedup spans active ∪ archived — ADR-0005)', () => {
    // An Attendee already handed off (archived) — re-importing must not re-add.
    saveArchived([lead('Grace', 'grace@x.example')])

    const fake = makeFakeScanner()
    render(<App createScanner={fake.create} />)

    fireEvent.click(screen.getByRole('button', { name: 'Import a list' }))

    // Incoming chunk: one already-archived Attendee + one genuinely new.
    const codes = encodeListChunks(
      [lead('Grace', 'grace@x.example'), lead('New Person', 'new@x.example')],
      't1',
      9,
    )
    fake.scan(codes[0])
    expect(screen.getByTestId('import-summary')).toHaveTextContent(
      'Imported 1 new Lead (1 already had)',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    // Only the new Attendee landed in the active store; the archived one was skipped.
    expect(screen.getByTestId('lead-count')).toHaveTextContent('1 lead')
    expect(loadLeads()).toEqual([lead('New Person', 'new@x.example')])
  })
})
