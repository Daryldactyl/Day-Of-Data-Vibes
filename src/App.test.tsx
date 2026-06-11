import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import App from './App'
import { saveLeads } from './lib/leadsStorage'

describe('Home', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('shows the empty state when no Leads have been collected', () => {
    render(<App />)
    expect(screen.getByText('No leads yet')).toBeInTheDocument()
  })

  it('rehydrates and lists the persisted Leads with a count', () => {
    saveLeads([
      { name: 'Ada Lovelace', email: 'ada@dayofdata.example', scannedAt: '2026-06-10T09:00:00.000Z' },
      { name: 'Grace Hopper', email: 'grace@dayofdata.example', scannedAt: '2026-06-10T09:05:00.000Z' },
    ])
    render(<App />)
    expect(screen.getByTestId('lead-count')).toHaveTextContent('2 leads')
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@dayofdata.example')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
  })

  it('uses the singular "lead" for a single collected Lead', () => {
    saveLeads([{ name: 'Alan Turing', email: 'alan@dayofdata.example', scannedAt: '2026-06-10T09:10:00.000Z' }])
    render(<App />)
    expect(screen.getByTestId('lead-count')).toHaveTextContent('1 lead')
  })
})
