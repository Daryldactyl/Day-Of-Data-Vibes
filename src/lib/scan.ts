import { parseVCard, type Contact } from './vcard'
import { addLead, type Lead } from './leads'

export type ScanNotification = 'saved' | 'duplicate' | 'not-a-badge'

export interface ScanResult {
  leads: Lead[]
  notification: ScanNotification
  /** The Attendee read off the Badge (for naming the toast); null for not-a-badge. */
  contact: Contact | null
}

/** Turn a raw decoded QR string into an updated Leads list + a notification.
 *  Pure: `scannedAt` is passed in, no clock or storage. A QR that isn't a
 *  parseable Badge yields 'not-a-badge'; otherwise dedup (ADR-0002) decides
 *  between 'saved' and 'duplicate'. */
export function handleScan(leads: Lead[], rawQrText: string, scannedAt: string): ScanResult {
  const contact = parseVCard(rawQrText)
  if (contact === null) {
    return { leads, notification: 'not-a-badge', contact: null }
  }
  const { leads: nextLeads, status } = addLead(leads, contact, scannedAt)
  return { leads: nextLeads, notification: status, contact }
}

/** The last decode the overlay acted on — the raw QR text plus when (ms epoch). */
export interface LastDecode {
  key: string
  at: number
}

/** qr-scanner re-decodes a Badge held in front of the camera every frame, so one
 *  physical Scan fires the decode callback many times. Decide whether a decode is
 *  a *distinct* Scan worth acting on, vs the same Badge still being held (which
 *  must count once). Fresh when it's a different Badge, or the same Badge
 *  reappearing after a gap longer than `gapMs` — i.e. it left the frame and was
 *  re-presented, a deliberate rescan. */
export function isFreshScan(last: LastDecode | null, key: string, now: number, gapMs: number): boolean {
  if (last === null) return true
  if (last.key !== key) return true
  return now - last.at > gapMs
}
