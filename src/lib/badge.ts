/** Clean a Badge form field for encoding: strip embedded CR/LF (which would
 *  corrupt the vCard's line structure — encodeVCard does no escaping) and trim
 *  surrounding whitespace. */
export function cleanBadgeField(s: string): string {
  return s.replace(/[\r\n]/g, '').trim()
}

/** Gate for the Generate button: a non-empty name plus an email-ish address
 *  (text @ text . text — deliberately loose, NOT strict RFC). Inputs are
 *  cleaned (CR/LF stripped, trimmed) before the check. */
export function isValidBadgeInput(name: string, email: string): boolean {
  const emailIsh = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
  return cleanBadgeField(name).length > 0 && emailIsh.test(cleanBadgeField(email))
}

/** Filename for a downloaded Badge PNG: `day-of-data-badge-<slug>.png`, where
 *  slug = the name lowercased, non-alphanumerics collapsed to single '-', and
 *  trimmed of leading/trailing '-'. Mirrors the slug in scripts/generate-badges.ts. */
export function badgeFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `day-of-data-badge-${slug}.png`
}
