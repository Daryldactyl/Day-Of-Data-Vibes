import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { RaffleOverlay } from './RaffleOverlay'
import { pickWinner } from './lib/raffle'
import type { Lead } from './lib/leads'

// Slice 11 — the gamified vertical name-reel layered onto slice 10's draw.
// The reel is choreography; the winner is still chosen by pickWinner(leads, random)
// FIRST and the reveal merely LANDS on it. These tests assert the OUTCOME (the
// chosen winner is revealed) and the BRANCH/TIMING (instant under reduced-motion,
// after the roll duration otherwise) — never the animation's pixel positions.
// Reduced-motion is injected as a prop so both paths run without jsdom matchMedia.

const lead = (name: string, email: string): Lead => ({
  name,
  email,
  scannedAt: '2026-06-16T10:00:00.000Z',
})

const noop = () => {}

const POOL: Lead[] = [
  lead('Ada Lovelace', 'ada@dayofdata.example'),
  lead('Grace Hopper', 'grace@dayofdata.example'),
  lead('Alan Turing', 'alan@dayofdata.example'),
]

describe('Raffle reel (slice 11)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('reveals the random-chosen winner INSTANTLY under reduced motion (no roll)', () => {
    // random → 0.5 → index Math.floor(0.5 * 3) = 1 → Grace Hopper.
    render(
      <RaffleOverlay
        leads={POOL}
        onDone={noop}
        random={() => 0.5}
        prefersReducedMotion={true}
      />,
    )

    // No timer advance: the winner is shown immediately on the reduced-motion path.
    expect(screen.getByTestId('raffle-winner-name')).toHaveTextContent('Grace Hopper')
    expect(screen.getByTestId('raffle-overlay')).toHaveTextContent('grace@dayofdata.example')
  })

  it('reveals NOTHING until the roll duration elapses, then the chosen winner (with motion)', () => {
    vi.useFakeTimers()
    try {
      // random → 0.5 → index 1 → Grace Hopper.
      render(
        <RaffleOverlay
          leads={POOL}
          onDone={noop}
          random={() => 0.5}
          prefersReducedMotion={false}
        />,
      )

      // The reel is rolling — no winner card yet.
      expect(screen.queryByTestId('raffle-winner-name')).not.toBeInTheDocument()

      // Just before the duration completes: still rolling, still no winner.
      act(() => vi.advanceTimersByTime(2999))
      expect(screen.queryByTestId('raffle-winner-name')).not.toBeInTheDocument()

      // After the full ~3s roll: the chosen winner pops.
      act(() => vi.advanceTimersByTime(1))
      expect(screen.getByTestId('raffle-winner-name')).toHaveTextContent('Grace Hopper')
      expect(screen.getByTestId('raffle-overlay')).toHaveTextContent('grace@dayofdata.example')
    } finally {
      vi.useRealTimers()
    }
  })

  it('replays the roll on Draw again and lands on the next random value’s winner', () => {
    vi.useFakeTimers()
    try {
      // Scripted random: first draw → 0 (Ada), Draw again → 0.999 (Alan).
      const values = [0, 0.999]
      let i = 0
      const random = () => values[i++]
      render(
        <RaffleOverlay
          leads={POOL}
          onDone={noop}
          random={random}
          prefersReducedMotion={false}
        />,
      )

      act(() => vi.advanceTimersByTime(3000))
      expect(screen.getByTestId('raffle-winner-name')).toHaveTextContent('Ada Lovelace')

      // Draw again replays: the winner card disappears while the reel rolls again.
      act(() => screen.getByRole('button', { name: 'Draw again' }).click())
      expect(screen.queryByTestId('raffle-winner-name')).not.toBeInTheDocument()

      act(() => vi.advanceTimersByTime(3000))
      expect(screen.getByTestId('raffle-winner-name')).toHaveTextContent('Alan Turing')
    } finally {
      vi.useRealTimers()
    }
  })

  it('always reveals the pickWinner result — the reel never changes the winner', () => {
    // Probe every index across the pool: for each rng value the revealed winner
    // must equal pickWinner(leads, random), independent of timing.
    for (let idx = 0; idx < POOL.length; idx++) {
      const rngValue = (idx + 0.5) / POOL.length // lands squarely on POOL[idx]
      const random = () => rngValue
      const expected = pickWinner(POOL, random)
      expect(expected).toBe(POOL[idx]) // sanity: the seam selects POOL[idx]

      vi.useFakeTimers()
      try {
        render(
          <RaffleOverlay
            leads={POOL}
            onDone={noop}
            random={random}
            prefersReducedMotion={false}
          />,
        )
        // Mid-roll, nothing has resolved to a different name.
        act(() => vi.advanceTimersByTime(1500))
        expect(screen.queryByTestId('raffle-winner-name')).not.toBeInTheDocument()
        // After the roll, the revealed winner is exactly the pickWinner result.
        act(() => vi.advanceTimersByTime(1500))
        expect(screen.getByTestId('raffle-winner-name')).toHaveTextContent(expected!.name)
      } finally {
        vi.useRealTimers()
        cleanup()
      }
    }
  })

  it('never mutates, reorders, or removes a Lead across repeated draws (read-only)', () => {
    vi.useFakeTimers()
    try {
      const leads = [...POOL]
      const snapshot = POOL.map((l) => ({ ...l }))
      const values = [0, 0.5, 0.999, 0]
      let i = 0
      const random = () => values[i++ % values.length]

      render(
        <RaffleOverlay
          leads={leads}
          onDone={noop}
          random={random}
          prefersReducedMotion={false}
        />,
      )

      act(() => vi.advanceTimersByTime(3000))
      act(() => screen.getByRole('button', { name: 'Draw again' }).click())
      act(() => vi.advanceTimersByTime(3000))
      act(() => screen.getByRole('button', { name: 'Draw again' }).click())
      act(() => vi.advanceTimersByTime(3000))

      // The same array reference, same order, same contents — nothing touched.
      expect(leads).toHaveLength(snapshot.length)
      expect(leads).toEqual(snapshot)
    } finally {
      vi.useRealTimers()
    }
  })
})
