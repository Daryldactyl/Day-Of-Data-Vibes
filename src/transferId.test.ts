import { describe, it, expect } from 'vitest'
import { defaultMakeTransferId } from './transferId'

describe('defaultMakeTransferId', () => {
  it('returns a non-empty string', () => {
    const id = defaultMakeTransferId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('two calls are not trivially equal (best-effort uniqueness)', () => {
    expect(defaultMakeTransferId()).not.toBe(defaultMakeTransferId())
  })
})
