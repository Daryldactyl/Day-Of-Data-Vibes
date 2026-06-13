export type CameraErrorKind = 'denied' | 'no-camera' | 'other'

export interface CameraErrorInfo {
  kind: CameraErrorKind
  message: string
}

/** Calm, Vendor-facing copy per failure mode. Exported so the no-camera
 *  pre-check and the start()-failure catch share one source of truth. */
export const CAMERA_MESSAGES: Record<CameraErrorKind, string> = {
  denied:
    'Camera access is blocked. Allow camera access for this page in your browser settings, then tap Retry. On iPhone, open this page in a Safari tab — not the home-screen app.',
  'no-camera':
    'No camera found on this device. Open the app on a phone with a working camera to scan Badges.',
  other:
    "The camera couldn't start. Make sure no other app is using it, then tap Retry.",
}

function classify(error: unknown): CameraErrorKind {
  const name = error instanceof DOMException ? error.name : ''
  const text =
    typeof error === 'string' ? error : error instanceof Error ? error.message : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError') return 'no-camera'
  if (/camera not found|no camera/i.test(text)) return 'no-camera'
  return 'other'
}

/** Classify a camera/getUserMedia failure into a calm, Vendor-facing message.
 *  qr-scanner surfaces getUserMedia DOMExceptions (e.g. NotAllowedError) and
 *  its own string errors; this is the single seam that maps any of them to a
 *  kind + message so the overlay never shows a raw error or a blank screen. */
export function describeCameraError(error: unknown): CameraErrorInfo {
  const kind = classify(error)
  return { kind, message: CAMERA_MESSAGES[kind] }
}
