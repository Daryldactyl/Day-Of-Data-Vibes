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
