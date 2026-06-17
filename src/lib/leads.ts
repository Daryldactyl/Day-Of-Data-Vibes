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

export function addLead(
  leads: Lead[],
  contact: Contact,
  scannedAt: string,
  archived: Lead[] = [],
): AddLeadResult {
  const email = normalizeEmail(contact.email)
  const isDuplicate = (bucket: Lead[]) => bucket.some((lead) => normalizeEmail(lead.email) === email)
  if (isDuplicate(leads) || isDuplicate(archived)) {
    return { leads, status: 'duplicate' }
  }
  return { leads: [...leads, { ...contact, scannedAt }], status: 'saved' }
}

export interface LeadBuckets {
  active: Lead[]
  archived: Lead[]
}

/** Move the whole active list into archived (active empties). Pure and
 *  non-destructive — order and scannedAt are preserved (see ADR-0005). */
export function archiveAll(active: Lead[], archived: Lead[]): LeadBuckets {
  return { active: [], archived: [...archived, ...active] }
}

/** Move all archived Leads back into active (archived empties). Pure and
 *  non-destructive — order and scannedAt are preserved (see ADR-0005). */
export function restoreAll(active: Lead[], archived: Lead[]): LeadBuckets {
  return { active: [...active, ...archived], archived: [] }
}
