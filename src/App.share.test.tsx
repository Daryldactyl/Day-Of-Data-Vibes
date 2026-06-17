import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import App from './App'
import { saveLeads } from './lib/leadsStorage'
import type { Lead } from './lib/leads'

const lead = (n: number): Lead => ({
  name: `Attendee ${n}`,
  email: `a${n}@x.example`,
  scannedAt: '2026-06-16T10:00:00.000Z',
})

describe('Share list (Merge sender) flow', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('opens the sender view from the footer entry and Done returns to Home', async () => {
    saveLeads([lead(1), lead(2), lead(3)])
    const makeListQrDataUrl = vi.fn(async () => 'data:image/png;base64,QR')
    render(<App makeListQrDataUrl={makeListQrDataUrl} makeTransferId={() => 'fixed-id'} />)

    // Home is showing, sender view is not.
    expect(screen.queryByTestId('share-overlay')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show my list as codes' }))
    expect(screen.getByTestId('share-overlay')).toBeInTheDocument()
    // A real QR card renders (1 chunk for 3 Leads).
    expect(await screen.findByRole('img')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByTestId('share-overlay')).not.toBeInTheDocument()
    expect(screen.getByTestId('lead-count')).toHaveTextContent('3 leads')
  })

  it('disables the share entry at 0 Leads (nothing to share)', () => {
    render(<App makeTransferId={() => 'fixed-id'} />)
    expect(screen.getByRole('button', { name: 'Show my list as codes' })).toBeDisabled()
  })
})
