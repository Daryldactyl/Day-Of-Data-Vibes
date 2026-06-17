import type { Lead } from './leads'

/** Pick one uniformly-random winning Lead from `leads` using the injected
 *  `rng` (Math.random-shaped — returns a number in [0, 1)). The winner is
 *  decided here; the UI never decides it. */
export function pickWinner(leads: Lead[], rng: () => number): Lead | null {
  if (leads.length === 0) return null
  const index = Math.min(Math.floor(rng() * leads.length), leads.length - 1)
  return leads[index]
}
