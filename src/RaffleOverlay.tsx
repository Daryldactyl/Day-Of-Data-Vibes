import { useState } from 'react'
import type { Lead } from './lib/leads'
import { pickWinner } from './lib/raffle'

interface RaffleOverlayProps {
  leads: Lead[]
  onDone: () => void
  /** Inject a fake random source in tests; defaults to the platform RNG. */
  random?: () => number
}

/** Full-screen Raffle: on open, draws one uniformly-random winning Lead over
 *  the current Leads and reveals their name + email, big and centered (a
 *  simple/instant reveal — no reel/animation yet, that's slice 0011).
 *  Read-only: it never mutates, reorders, persists, or clears a Lead. */
export function RaffleOverlay({ leads, onDone, random = Math.random }: RaffleOverlayProps) {
  // Lazy initializer: the draw runs once on open, through the injected random
  // capability — kept out of the render body so it doesn't re-draw every render
  // and doesn't trip the react-hooks/purity rule (same concern that flagged the
  // scan clock).
  const [winner, setWinner] = useState<Lead | null>(() => pickWinner(leads, random))

  return (
    <div className="raffle-overlay" data-testid="raffle-overlay">
      <div className="raffle-hud">
        <span className="raffle-title">Raffle</span>
        <button className="raffle-done" type="button" onClick={onDone}>
          Done
        </button>
      </div>

      <div className="raffle-stage">
        {winner ? (
          <div className="raffle-winner">
            <p className="raffle-label">Winner</p>
            <p className="raffle-winner-name" data-testid="raffle-winner-name">
              {winner.name}
            </p>
            <p className="raffle-winner-email">{winner.email}</p>
          </div>
        ) : null}

        <button
          className="raffle-again"
          type="button"
          onClick={() => setWinner(pickWinner(leads, random))}
        >
          Draw again
        </button>
      </div>
    </div>
  )
}
