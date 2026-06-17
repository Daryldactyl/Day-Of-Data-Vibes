import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import App from './App'
import { saveLeads, saveArchived, loadLeads, loadArchived } from './lib/leadsStorage'
import type { Lead } from './lib/leads'

// The Restore thread (Slice 17, ADR-0005): a "N archived — Restore" affordance in
// the Home footer surfaces the archived count and a one-tap restore that moves all
// archived Leads back to active. Symmetric to the "archive these" handoff action;
// the pure move (restoreAll) is covered in src/lib/leads.test.ts. These tests drive
// the App behavior through the rendered UI + the persisted stores.

const lead = (name: string, email: string): Lead => ({
  name,
  email,
  scannedAt: '2026-06-16T10:00:00.000Z',
})

describe('Restore flow', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('shows the archived count when there are archived Leads, and hides it at 0 archived', () => {
    // 0 archived → the affordance is absent.
    const { unmount } = render(<App />)
    expect(screen.queryByTestId('archived-count')).not.toBeInTheDocument()
    unmount()

    // 2 archived → the count affordance shows "2".
    saveLeads([lead('Ada Lovelace', 'ada@dayofdata.example')])
    saveArchived([
      lead('Grace Hopper', 'grace@dayofdata.example'),
      lead('Alan Turing', 'alan@dayofdata.example'),
    ])
    render(<App />)
    expect(screen.getByTestId('archived-count')).toHaveTextContent('2')
  })

  it('moves all archived Leads back to active when Restore is tapped, persisting both stores', () => {
    saveLeads([lead('Ada Lovelace', 'ada@dayofdata.example')])
    saveArchived([
      lead('Grace Hopper', 'grace@dayofdata.example'),
      lead('Alan Turing', 'alan@dayofdata.example'),
    ])
    render(<App />)

    expect(screen.getByTestId('lead-count')).toHaveTextContent('1 lead')

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    // Home now shows all 3 restored Leads; the count affordance is gone (0 archived).
    expect(screen.getByTestId('lead-count')).toHaveTextContent('3 leads')
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('Alan Turing')).toBeInTheDocument()
    expect(screen.queryByTestId('archived-count')).not.toBeInTheDocument()

    // Both stores persisted: active has all 3, archived is empty.
    expect(loadLeads()).toHaveLength(3)
    expect(loadArchived()).toEqual([])
  })

  it('is non-destructive — no Lead lost or duplicated and scannedAt is preserved', () => {
    const active = [{ name: 'Ada Lovelace', email: 'ada@dayofdata.example', scannedAt: '2026-06-16T09:00:00.000Z' }]
    const archivedLeads = [
      { name: 'Grace Hopper', email: 'grace@dayofdata.example', scannedAt: '2026-06-16T08:00:00.000Z' },
      { name: 'Alan Turing', email: 'alan@dayofdata.example', scannedAt: '2026-06-16T07:30:00.000Z' },
    ]
    saveLeads(active)
    saveArchived(archivedLeads)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    // The merged set equals active + archived exactly — same Leads, same scan
    // times, nothing dropped, nothing duplicated.
    expect(loadLeads()).toEqual([...active, ...archivedLeads])
    expect(loadArchived()).toEqual([])
  })
})
