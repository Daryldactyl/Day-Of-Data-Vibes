import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import App from './App'
import { saveLeads, loadLeads, loadArchived } from './lib/leadsStorage'
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

  it('the deliberate "archive these" action moves the whole active list → archived, persists both stores, and returns to Home empty', async () => {
    saveLeads([lead(1), lead(2), lead(3)])
    const makeListQrDataUrl = vi.fn(async () => 'data:image/png;base64,QR')
    render(<App makeListQrDataUrl={makeListQrDataUrl} makeTransferId={() => 'fixed-id'} />)

    fireEvent.click(screen.getByRole('button', { name: 'Show my list as codes' }))
    expect(await screen.findByRole('img')).toBeInTheDocument()

    // The deliberate Vendor action — after confirming the handoff landed.
    fireEvent.click(screen.getByRole('button', { name: "I've handed these off — archive them" }))

    // Back on Home, the active list is now empty.
    expect(screen.queryByTestId('share-overlay')).not.toBeInTheDocument()
    expect(screen.queryByTestId('lead-count')).not.toBeInTheDocument()
    expect(screen.getByText('No leads yet')).toBeInTheDocument()

    // Both stores persisted: active emptied, archived holds the whole list.
    expect(loadLeads()).toEqual([])
    expect(loadArchived()).toEqual([lead(1), lead(2), lead(3)])

    // Export, Raffle, and Share all read active only — now disabled (no logic
    // change; the empty active list disables them for free).
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Raffle' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Show my list as codes' })).toBeDisabled()
  })

  it('opening then closing the share view (without the archive button) archives nothing', () => {
    saveLeads([lead(1), lead(2)])
    render(<App makeListQrDataUrl={vi.fn(async () => 'QR')} makeTransferId={() => 'fixed-id'} />)

    fireEvent.click(screen.getByRole('button', { name: 'Show my list as codes' }))
    // Close with Done — NOT the archive action.
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.queryByTestId('share-overlay')).not.toBeInTheDocument()
    // Nothing moved: active intact, archived still empty.
    expect(screen.getByTestId('lead-count')).toHaveTextContent('2 leads')
    expect(loadLeads()).toEqual([lead(1), lead(2)])
    expect(loadArchived()).toEqual([])
  })
})
