import type { Lead } from './leads'

const STORAGE_KEY = 'dayofdata.leads'
const ARCHIVED_STORAGE_KEY = 'dayofdata.archived'

/** Read the Vendor's saved (active) Leads from localStorage. Returns [] when none. */
export function loadLeads(): Lead[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  return JSON.parse(raw) as Lead[]
}

/** Persist the Vendor's (active) Leads to localStorage. */
export function saveLeads(leads: Lead[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
}

/** Read the Vendor's archived Leads from localStorage. Returns [] when none.
 *  Independent of the active store (separate key — see ADR-0005). */
export function loadArchived(): Lead[] {
  const raw = localStorage.getItem(ARCHIVED_STORAGE_KEY)
  if (!raw) return []
  return JSON.parse(raw) as Lead[]
}

/** Persist the Vendor's archived Leads to localStorage. */
export function saveArchived(leads: Lead[]): void {
  localStorage.setItem(ARCHIVED_STORAGE_KEY, JSON.stringify(leads))
}
