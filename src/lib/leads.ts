import type { Contact } from './vcard'

export interface Lead extends Contact {
  scannedAt: string
}

export interface AddLeadResult {
  leads: Lead[]
  status: 'saved' | 'duplicate'
}

/** Append a Lead for `contact`, unless an Attendee with the same email is
 *  already in the list (dedup by normalized email — see ADR-0002). */
const normalizeEmail = (email: string): string => email.trim().toLowerCase()

export function addLead(leads: Lead[], contact: Contact, scannedAt: string): AddLeadResult {
  const email = normalizeEmail(contact.email)
  if (leads.some((lead) => normalizeEmail(lead.email) === email)) {
    return { leads, status: 'duplicate' }
  }
  return { leads: [...leads, { ...contact, scannedAt }], status: 'saved' }
}
