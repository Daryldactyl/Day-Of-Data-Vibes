import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import App from './App'
import { saveLeads, loadLeads } from './lib/leadsStorage'
import type { Lead } from './lib/leads'

// These tests inject a fake `random` (mirroring the `exportLeads` / `createScanner`
// seams) so the drawn winner is deterministic without touching Math.random. The
// pure draw itself is covered in src/lib/raffle.test.ts.
//
// Slice 11 migration: the Raffle now rolls a name reel for ~3s before revealing
// the (already-chosen) winner, so the reveal assertions advance fake timers past
// the locked 3000ms roll. The fairness contract is unchanged — they still assert
// the `random`-chosen winner. The reel's motion itself is QA'd live.
const ROLL_MS = 3000

const lead = (name: string, email: string): Lead => ({
  name,
  email,
  scannedAt: '2026-06-16T10:00:00.000Z',
})

describe('Raffle flow', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('disables the Raffle button at 0 Leads and enables it at >=1 Lead', () => {
    const { unmount } = render(<App />)
    expect(screen.getByRole('button', { name: 'Raffle' })).toBeDisabled()
    unmount()

    saveLeads([lead('Ada Lovelace', 'ada@dayofdata.example')])
    render(<App />)
    expect(screen.getByRole('button', { name: 'Raffle' })).toBeEnabled()
  })

  it('reveals the random-chosen winning Lead (name + email) after the roll when Raffle is tapped', () => {
    vi.useFakeTimers()
    try {
      saveLeads([
        lead('Ada Lovelace', 'ada@dayofdata.example'),
        lead('Grace Hopper', 'grace@dayofdata.example'),
        lead('Alan Turing', 'alan@dayofdata.example'),
      ])
      // rng → 0.5 → index Math.floor(0.5 * 3) = 1 → Grace Hopper.
      render(<App random={() => 0.5} />)

      fireEvent.click(screen.getByRole('button', { name: 'Raffle' }))

      const overlay = screen.getByTestId('raffle-overlay')
      // The reel is rolling — the winner is revealed only after the ~3s roll.
      expect(screen.queryByTestId('raffle-winner-name')).not.toBeInTheDocument()
      act(() => vi.advanceTimersByTime(ROLL_MS))
      expect(overlay).toHaveTextContent('Grace Hopper')
      expect(overlay).toHaveTextContent('grace@dayofdata.example')
    } finally {
      vi.useRealTimers()
    }
  })

  it('redraws an independent winner when Draw again is tapped (next random value)', () => {
    vi.useFakeTimers()
    try {
      saveLeads([
        lead('Ada Lovelace', 'ada@dayofdata.example'),
        lead('Grace Hopper', 'grace@dayofdata.example'),
        lead('Alan Turing', 'alan@dayofdata.example'),
      ])
      // A scripted random: first draw → 0 (Ada), Draw again → 0.999 (Alan).
      const values = [0, 0.999]
      let i = 0
      const random = () => values[i++]
      render(<App random={random} />)

      fireEvent.click(screen.getByRole('button', { name: 'Raffle' }))
      act(() => vi.advanceTimersByTime(ROLL_MS))
      expect(screen.getByTestId('raffle-winner-name')).toHaveTextContent('Ada Lovelace')

      fireEvent.click(screen.getByRole('button', { name: 'Draw again' }))
      act(() => vi.advanceTimersByTime(ROLL_MS))
      expect(screen.getByTestId('raffle-winner-name')).toHaveTextContent('Alan Turing')
    } finally {
      vi.useRealTimers()
    }
  })

  it('leaves the Leads list unchanged after drawing (read-only) and Done returns to Home', () => {
    saveLeads([
      lead('Ada Lovelace', 'ada@dayofdata.example'),
      lead('Grace Hopper', 'grace@dayofdata.example'),
    ])
    render(<App random={() => 0} />)

    expect(screen.getByTestId('lead-count')).toHaveTextContent('2 leads')

    fireEvent.click(screen.getByRole('button', { name: 'Raffle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw again' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw again' }))

    // Done returns to Home.
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByTestId('raffle-overlay')).not.toBeInTheDocument()

    // The Leads list is intact and unchanged — in the UI and in storage.
    expect(screen.getByTestId('lead-count')).toHaveTextContent('2 leads')
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(loadLeads()).toEqual([
      lead('Ada Lovelace', 'ada@dayofdata.example'),
      lead('Grace Hopper', 'grace@dayofdata.example'),
    ])
  })
})
