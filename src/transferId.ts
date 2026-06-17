/** Minimal slice of transfer-id generation the sender view drives — small
 *  enough that a test can supply a fixed id (see the `makeTransferId` prop)
 *  for a deterministic transfer, mirroring `makeQrDataUrl` in badgeQr.ts and
 *  the `random` clock/RNG seams. */
export type MakeTransferId = () => string

/** The real generator: a fresh random id per transfer, stamped onto every
 *  chunk so a receiver can tell two nearby transfers apart (ADR-0004). */
export const defaultMakeTransferId: MakeTransferId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36)
