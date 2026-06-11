import type { Lead } from './leads'

const STORAGE_KEY = 'dayofdata.leads'

/** Read the Vendor's saved Leads from localStorage. Returns [] when none. */
export function loadLeads(): Lead[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  return JSON.parse(raw) as Lead[]
}

/** Persist the Vendor's Leads to localStorage. */
export function saveLeads(leads: Lead[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
}
