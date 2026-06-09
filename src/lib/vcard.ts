export interface Contact {
  name: string
  email: string
}

/** Encode a contact as a minimal vCard 3.0 string (CRLF line endings, per spec). */
export function encodeVCard(c: Contact): string {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${c.name}`,
    `EMAIL:${c.email}`,
    'END:VCARD',
  ].join('\r\n')
}

/** Parse a vCard string into a contact. Tolerant of CRLF/LF, property
 *  parameters (e.g. `EMAIL;TYPE=INTERNET:`), and surrounding whitespace. */
export function parseVCard(input: string): Contact | null {
  const lines = input.split(/\r\n|\r|\n/)
  let name = ''
  let email = ''
  for (const raw of lines) {
    const line = raw.trim()
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).split(';')[0].toUpperCase()
    const value = line.slice(colon + 1).trim()
    if (key === 'FN') name = value
    else if (key === 'EMAIL') email = value
  }
  if (!name || !email) return null
  return { name, email }
}
