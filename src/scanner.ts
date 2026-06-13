import QrScanner from 'qr-scanner'
import { describeCameraError, CAMERA_MESSAGES, type CameraErrorInfo } from './lib/cameraError'

/** Minimal slice of qr-scanner the overlay drives — small enough that a test
 *  can supply a fake (see `createScanner`) without a real camera. */
export interface Scanner {
  start: () => Promise<void>
  stop: () => void
  destroy: () => void
}

export type CreateScanner = (
  video: HTMLVideoElement,
  onDecode: (text: string) => void,
) => Scanner

/** Recover the *true* reason the camera wouldn't start.
 *
 *  qr-scanner's `start()` swallows every `getUserMedia` rejection and always
 *  throws the string `"Camera not found."` — so a permission denial is
 *  indistinguishable from a missing camera at that layer. We probe
 *  `getUserMedia` directly to surface the real DOMException, classify it, and
 *  release the probe stream immediately. Only run this when `start()` failed. */
export async function diagnoseCamera(): Promise<CameraErrorInfo> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    })
    // The probe itself succeeded — the camera is grantable but qr-scanner still
    // couldn't start, so this is an unexpected/other failure.
    stream.getTracks().forEach((track) => track.stop())
    return { kind: 'other', message: CAMERA_MESSAGES.other }
  } catch (error) {
    return describeCameraError(error)
  }
}

/** The real camera scanner: rear lens, detailed results, highlighted region. */
export const defaultCreateScanner: CreateScanner = (video, onDecode) =>
  new QrScanner(video, (result) => onDecode(result.data), {
    preferredCamera: 'environment',
    returnDetailedScanResult: true,
    highlightScanRegion: true,
  })
