import { describe, it, expect } from 'vitest'
import { encodeVCard, parseVCard } from './vcard'

describe('encodeVCard', () => {
  it('produces a vCard 3.0 containing the name and email', () => {
    const out = encodeVCard({ name: 'Jane Doe', email: 'jane@example.com' })
    expect(out).toContain('BEGIN:VCARD')
    expect(out).toContain('VERSION:3.0')
    expect(out).toContain('FN:Jane Doe')
    expect(out).toContain('EMAIL:jane@example.com')
    expect(out).toContain('END:VCARD')
  })
})

describe('parseVCard', () => {
  it('extracts the name and email from a vCard string', () => {
    const vcard = 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:John Smith\r\nEMAIL:john@acme.io\r\nEND:VCARD'
    expect(parseVCard(vcard)).toEqual({ name: 'John Smith', email: 'john@acme.io' })
  })

  it('tolerates property parameters and surrounding whitespace', () => {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN;CHARSET=UTF-8:  Mary Jane ',
      'EMAIL;TYPE=INTERNET:  mary@example.org ',
      'END:VCARD',
    ].join('\n')
    expect(parseVCard(vcard)).toEqual({ name: 'Mary Jane', email: 'mary@example.org' })
  })

  it('returns null when the name or email is missing, or input is not a vCard', () => {
    expect(parseVCard('BEGIN:VCARD\nVERSION:3.0\nFN:No Email\nEND:VCARD')).toBeNull()
    expect(parseVCard('just some scanned text')).toBeNull()
    expect(parseVCard('https://example.com/whatever')).toBeNull()
    expect(parseVCard('')).toBeNull()
  })

  it('round-trips a contact through encode then parse', () => {
    const contact = { name: 'Round Trip', email: 'rt@example.com' }
    expect(parseVCard(encodeVCard(contact))).toEqual(contact)
  })
})
