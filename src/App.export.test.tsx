import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import App from './App'
import { saveLeads } from './lib/leadsStorage'
import type { Lead } from './lib/leads'

// These tests inject a fake `exportLeads` (mirroring the `createScanner` seam in
// App.scan.test.tsx) so the Export button's behavior is driven without touching
// the real download. The real CSV assembly is covered in exportCsv.test.ts.

const lead = (name: string, email: string): Lead => ({
  name,
  email,
  scannedAt: '2026-06-16T10:00:00.000Z',
})

describe('Export flow', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('disables the Export button when there are 0 Leads', () => {
    render(<App exportLeads={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
  })

  it('enables Export with ≥1 Lead and calls exportLeads with the current Leads', () => {
    const leads = [lead('Ada Lovelace', 'ada@dayofdata.example')]
    saveLeads(leads)
    const exportLeads = vi.fn()
    render(<App exportLeads={exportLeads} />)

    const button = screen.getByRole('button', { name: 'Export' })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(exportLeads).toHaveBeenCalledTimes(1)
    expect(exportLeads).toHaveBeenCalledWith(leads)
  })

  it('leaves the Leads list unchanged after Export (read-only)', () => {
    saveLeads([
      lead('Ada Lovelace', 'ada@dayofdata.example'),
      lead('Alan Turing', 'alan@dayofdata.example'),
    ])
    render(<App exportLeads={vi.fn()} />)

    expect(screen.getByTestId('lead-count')).toHaveTextContent('2 leads')
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    expect(screen.getByTestId('lead-count')).toHaveTextContent('2 leads')
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Alan Turing')).toBeInTheDocument()
  })
})
