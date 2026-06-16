import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import App from './App'
import { saveLeads } from './lib/leadsStorage'
import type { Lead } from './lib/leads'

// Mirrors the createScanner / exportLeads injection in App.scan.test.tsx /
// App.export.test.tsx: a fake makeQrDataUrl is passed through App so the Badge
// Generator's public path is driven without a real QR canvas.

const lead = (name: string, email: string): Lead => ({
  name,
  email,
  scannedAt: '2026-06-16T10:00:00.000Z',
})

describe('Badge Generator entry from Home', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('opens the Badge Generator from the footer and returns to Home with Leads intact', async () => {
    saveLeads([lead('Ada Lovelace', 'ada@dayofdata.example')])
    const makeQrDataUrl = vi.fn(async () => 'data:image/png;base64,FAKEQR')
    render(<App makeQrDataUrl={makeQrDataUrl} />)

    expect(screen.getByTestId('lead-count')).toHaveTextContent('1 lead')

    fireEvent.click(screen.getByRole('button', { name: 'Make a badge' }))
    expect(screen.getByTestId('badge-overlay')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByTestId('badge-overlay')).not.toBeInTheDocument()
    expect(screen.getByTestId('lead-count')).toHaveTextContent('1 lead')
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
  })
})
