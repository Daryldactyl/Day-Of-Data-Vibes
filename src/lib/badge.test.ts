import { describe, it, expect } from 'vitest'
import { badgeFilename, cleanBadgeField, isValidBadgeInput } from './badge'

describe('cleanBadgeField', () => {
  it('trims surrounding whitespace', () => {
    expect(cleanBadgeField('  Ada Lovelace  ')).toBe('Ada Lovelace')
  })

  it('removes embedded carriage returns and newlines (which would corrupt the vCard)', () => {
    expect(cleanBadgeField('Ada\r\nLovelace')).toBe('AdaLovelace')
    expect(cleanBadgeField('Ada\nLovelace')).toBe('AdaLovelace')
    expect(cleanBadgeField('Ada\rLovelace')).toBe('AdaLovelace')
  })
})

describe('isValidBadgeInput', () => {
  it('is true for a non-empty name and an email-ish address', () => {
    expect(isValidBadgeInput('Ada Lovelace', 'ada@dayofdata.example')).toBe(true)
  })

  it('is false when the name is empty or whitespace-only', () => {
    expect(isValidBadgeInput('', 'ada@dayofdata.example')).toBe(false)
    expect(isValidBadgeInput('   ', 'ada@dayofdata.example')).toBe(false)
  })

  it('is false for an empty email, an @-less email, or a domain with no dot', () => {
    expect(isValidBadgeInput('Ada Lovelace', '')).toBe(false)
    expect(isValidBadgeInput('Ada Lovelace', 'ada-at-example.com')).toBe(false)
    expect(isValidBadgeInput('Ada Lovelace', 'ada@example')).toBe(false)
  })
})

describe('badgeFilename', () => {
  it('builds a slugified .png filename from the name', () => {
    expect(badgeFilename('Ada Lovelace')).toBe('day-of-data-badge-ada-lovelace.png')
  })

  it('collapses punctuation and multiple spaces and trims dashes', () => {
    expect(badgeFilename("O'Brien,  Pat")).toBe('day-of-data-badge-o-brien-pat.png')
  })
})
