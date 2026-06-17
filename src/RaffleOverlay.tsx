import { useEffect, useRef, useState } from 'react'
import type { Lead } from './lib/leads'
import { pickWinner } from './lib/raffle'

// --- Locked motion parameters (tuned in /tmp/raffle-reel-prototype.html and
// approved by the Vendor — see docs/handoffs/slice-11-raffle-name-reel.md). ---
/** Total roll time before the winner is revealed. */
const RAFFLE_DURATION_MS = 3000
/** How many full passes of the names the reel scrolls through before settling. */
const RAFFLE_LOOPS = 8
/** Deceleration curve: easeOutExpo — a dramatic fast-then-glide landing. */
const RAFFLE_EASING = 'cubic-bezier(.16, 1, .3, 1)'
/** Height of one name cell in the reel, in px (mirrors `.raffle-cell` in App.css). */
const RAFFLE_ROW_PX = 60
/** Which visible cell is the landing "slot" (the centered highlight band). */
const RAFFLE_CENTER_ROW = 2

interface RaffleOverlayProps {
  leads: Lead[]
  onDone: () => void
  /** Inject a fake random source in tests; defaults to the platform RNG. */
  random?: () => number
  /** Whether the Vendor opted out of motion. Injected/overridable so tests can
   *  exercise both the instant-reveal and the rolling-reel paths; defaults to
   *  the OS `prefers-reduced-motion: reduce` setting. */
  prefersReducedMotion?: boolean
}

/** One spin: the pre-chosen winner plus the reel strip + landing offset that
 *  lands on them. The winner is decided by `pickWinner` BEFORE the strip is
 *  built — the reel is choreography, never the decision. */
interface Spin {
  id: number
  winner: Lead | null
  /** The names rendered down the strip (RAFFLE_LOOPS passes of the Leads). */
  strip: Lead[]
  /** translateY (px) that brings the winner to the centered slot. */
  landTranslate: number
}

/** Read the OS `prefers-reduced-motion: reduce` preference, guarding for
 *  environments (jsdom) where `matchMedia` is absent. */
function osPrefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Build a spin that LANDS on the already-chosen winner. Picks the winner first
 *  via `pickWinner` (fairness), then lays out a long strip with the winner near
 *  the end so the reel scrolls ~RAFFLE_LOOPS passes before settling on them. */
function makeSpin(id: number, leads: Lead[], random: () => number): Spin {
  const winner = pickWinner(leads, random)
  if (!winner || leads.length === 0) {
    return { id, winner, strip: [], landTranslate: 0 }
  }
  const winnerIdx = leads.indexOf(winner)
  const strip: Lead[] = []
  for (let loop = 0; loop < RAFFLE_LOOPS; loop++) strip.push(...leads)
  const landIdx = (RAFFLE_LOOPS - 1) * leads.length + winnerIdx
  const landTranslate = -((landIdx - RAFFLE_CENTER_ROW) * RAFFLE_ROW_PX)
  return { id, winner, strip, landTranslate }
}

/** Full-screen Raffle (slice 11): on each draw it picks one uniformly-random
 *  winning Lead FIRST (fairness lives in `pickWinner`), then rolls a vertical
 *  name reel that decelerates over RAFFLE_DURATION_MS and LANDS on that winner,
 *  who then pops to the big winner card. Under `prefers-reduced-motion` it skips
 *  the roll and reveals instantly. Read-only: it never mutates, reorders,
 *  persists, or clears a Lead. */
export function RaffleOverlay({
  leads,
  onDone,
  random = Math.random,
  prefersReducedMotion = osPrefersReducedMotion(),
}: RaffleOverlayProps) {
  // The winner is chosen FIRST, in this lazy initializer (kept out of the render
  // body so it doesn't re-draw every render or trip react-hooks/purity — the same
  // concern that flagged the scan clock). The reel only LANDS on `spin.winner`.
  const [spin, setSpin] = useState<Spin>(() => makeSpin(0, leads, random))
  // Whether the winner card is shown. Reduced motion reveals instantly; otherwise
  // it's revealed after the roll completes (via a timer, NOT transitionend, which
  // jsdom won't fire).
  const [revealed, setRevealed] = useState(prefersReducedMotion)
  const stripRef = useRef<HTMLDivElement | null>(null)

  // Drive each draw: under reduced motion the winner is already revealed; otherwise
  // run the reel and reveal the (already-chosen) winner after RAFFLE_DURATION_MS.
  useEffect(() => {
    if (prefersReducedMotion) return

    const strip = stripRef.current
    if (strip) {
      // Snap to the top, then on the next frame transition to the landing offset.
      // This visual roll is QA'd live; the reveal below is driven by the timer.
      strip.style.transition = 'none'
      strip.style.transform = 'translateY(0px)'
      const raf =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                strip.style.transition = `transform ${RAFFLE_DURATION_MS}ms ${RAFFLE_EASING}`
                strip.style.transform = `translateY(${spin.landTranslate}px)`
              }),
            )
          : undefined

      const timer = setTimeout(() => setRevealed(true), RAFFLE_DURATION_MS)
      return () => {
        if (raf !== undefined) cancelAnimationFrame(raf)
        clearTimeout(timer)
      }
    }

    const timer = setTimeout(() => setRevealed(true), RAFFLE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [spin.id, prefersReducedMotion, spin.landTranslate])

  function drawAgain() {
    setRevealed(prefersReducedMotion)
    setSpin((prev) => makeSpin(prev.id + 1, leads, random))
  }

  const winner = spin.winner

  return (
    <div className="raffle-overlay" data-testid="raffle-overlay">
      <div className="raffle-hud">
        <span className="raffle-title">Raffle</span>
        <button className="raffle-done" type="button" onClick={onDone}>
          Done
        </button>
      </div>

      <div className="raffle-stage">
        {!revealed ? (
          <div className="raffle-viewport" data-testid="raffle-reel" aria-hidden="true">
            <div className="raffle-strip" ref={stripRef}>
              {spin.strip.map((lead, i) => (
                <div className="raffle-cell" key={`${spin.id}-${lead.email}-${i}`}>
                  {lead.name}
                </div>
              ))}
            </div>
            <div className="raffle-band" />
          </div>
        ) : null}

        {revealed && winner ? (
          <div className="raffle-winner">
            <p className="raffle-label">Winner</p>
            <p className="raffle-winner-name" data-testid="raffle-winner-name">
              {winner.name}
            </p>
            <p className="raffle-winner-email">{winner.email}</p>
          </div>
        ) : null}

        <button className="raffle-again" type="button" onClick={drawAgain}>
          Draw again
        </button>
      </div>
    </div>
  )
}
