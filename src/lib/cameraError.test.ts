import { describe, it, expect } from 'vitest'
import { describeCameraError } from './cameraError'

describe('describeCameraError', () => {
  it('classifies a NotAllowedError as a denied-permission failure', () => {
    const error = new DOMException('Permission denied', 'NotAllowedError')
    expect(describeCameraError(error).kind).toBe('denied')
  })

  it('classifies a SecurityError (e.g. blocked/insecure context) as a denied-permission failure', () => {
    const error = new DOMException('The operation is insecure', 'SecurityError')
    expect(describeCameraError(error).kind).toBe('denied')
  })

  it('classifies a NotFoundError as a no-camera failure', () => {
    const error = new DOMException('Requested device not found', 'NotFoundError')
    expect(describeCameraError(error).kind).toBe('no-camera')
  })

  it("classifies qr-scanner's 'Camera not found.' string as a no-camera failure", () => {
    expect(describeCameraError('Camera not found.').kind).toBe('no-camera')
  })

  it('classifies an unrecognized failure as other', () => {
    expect(describeCameraError(new DOMException('busy', 'NotReadableError')).kind).toBe('other')
    expect(describeCameraError(undefined).kind).toBe('other')
  })

  it('gives each kind a calm, distinct, non-empty message', () => {
    const denied = describeCameraError(new DOMException('x', 'NotAllowedError')).message
    const noCamera = describeCameraError(new DOMException('x', 'NotFoundError')).message
    const other = describeCameraError(undefined).message

    for (const m of [denied, noCamera, other]) {
      expect(m.trim().length).toBeGreaterThan(0)
    }
    // distinct copy per failure mode
    expect(new Set([denied, noCamera, other]).size).toBe(3)
    // the denied message guides the Vendor to re-enable access
    expect(denied.toLowerCase()).toMatch(/allow|permission|enable/)
    // the no-camera message names the actual problem
    expect(noCamera.toLowerCase()).toMatch(/camera/)
  })
})
