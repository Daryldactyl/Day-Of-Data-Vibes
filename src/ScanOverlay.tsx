import { useEffect, useRef, useState } from 'react'
import { handleScan, isFreshScan, type LastDecode, type ScanNotification } from './lib/scan'
import { saveLeads } from './lib/leadsStorage'
import type { Lead } from './lib/leads'
import { defaultCreateScanner, diagnoseCamera as defaultDiagnoseCamera, type CreateScanner } from './scanner'
import type { CameraErrorInfo } from './lib/cameraError'

interface Toast {
  kind: ScanNotification
  text: string
}

const TOAST_MS = 1800
// A Badge held in front of the camera re-decodes every frame; treat the same
// Badge seen again within this window as the same continuous Scan (count once,
// keep the confirmation). A longer gap means it left the frame and was
// re-presented — a deliberate rescan, which does show "Already saved".
const SCAN_GAP_MS = 1500

interface ScanOverlayProps {
  leads: Lead[]
  onLeadsChange: (leads: Lead[]) => void
  onDone: () => void
  createScanner?: CreateScanner
  diagnoseCamera?: () => Promise<CameraErrorInfo>
}

export function ScanOverlay({
  leads,
  onLeadsChange,
  onDone,
  createScanner = defaultCreateScanner,
  diagnoseCamera = defaultDiagnoseCamera,
}: ScanOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const startCameraRef = useRef<() => void>(() => {})
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The last decode we acted on, so qr-scanner's per-frame re-decodes of a Badge
  // held in view collapse to one Scan (see isFreshScan).
  const lastDecode = useRef<LastDecode | null>(null)
  // Refs so the scanner's long-lived onDecode closure always sees current state.
  const leadsRef = useRef(leads)
  const onLeadsChangeRef = useRef(onLeadsChange)
  useEffect(() => {
    leadsRef.current = leads
    onLeadsChangeRef.current = onLeadsChange
  })

  const [toast, setToast] = useState<Toast | null>(null)
  const [error, setError] = useState<CameraErrorInfo | null>(null)

  function onDecodedText(rawQrText: string) {
    // qr-scanner fires this every frame a Badge is in view. Ignore the repeats
    // of a Badge still being held so its confirmation isn't instantly replaced
    // by "Already saved"; only act on a fresh Scan (new Badge, or a re-presented
    // one after it left the frame).
    const decodedAt = new Date()
    const now = decodedAt.getTime()
    const fresh = isFreshScan(lastDecode.current, rawQrText, now, SCAN_GAP_MS)
    lastDecode.current = { key: rawQrText, at: now }
    if (!fresh) return

    const result = handleScan(leadsRef.current, rawQrText, decodedAt.toISOString())
    if (result.notification === 'saved' || result.notification === 'duplicate') {
      const name = result.contact?.name ?? ''
      if (result.notification === 'saved') {
        onLeadsChangeRef.current(result.leads)
        saveLeads(result.leads)
        showToast({ kind: 'saved', text: `Saved: ${name}` })
      } else {
        showToast({ kind: 'duplicate', text: `Already saved: ${name}` })
      }
    } else {
      showToast({ kind: 'not-a-badge', text: 'Not a badge' })
    }
  }

  function showToast(next: Toast) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(next)
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const scanner = createScanner(video, onDecodedText)
    let cancelled = false

    // DEV-only seam for live Playwright QA: inject a decoded string without a
    // real Badge in front of the camera. Stripped from production builds.
    if (import.meta.env.DEV) {
      ;(window as unknown as { __scanBadge?: (t: string) => void }).__scanBadge = onDecodedText
    }

    let starting = false
    async function startCamera() {
      // Guard against concurrent restarts (e.g. an impatient double-tap on
      // Retry) — two overlapping start() calls on one scanner is undefined.
      if (starting) return
      starting = true
      try {
        await scanner.start()
        if (cancelled) return
        setError(null)
      } catch {
        // start() masks the real getUserMedia error (always "Camera not
        // found."), so probe directly to recover the true reason.
        const info = await diagnoseCamera()
        if (!cancelled) setError(info)
      } finally {
        starting = false
      }
    }
    startCameraRef.current = startCamera
    startCamera()

    return () => {
      cancelled = true
      scanner.stop()
      scanner.destroy()
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (import.meta.env.DEV) {
        delete (window as unknown as { __scanBadge?: (t: string) => void }).__scanBadge
      }
    }
    // Intentionally mount-once: the camera must not restart on every Lead change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="scan-overlay" data-testid="scan-overlay">
      <video className="scan-video" ref={videoRef} playsInline muted />

      <div className="scan-hud">
        <span className="scan-count" data-testid="scan-lead-count">
          {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
        </span>
        <button className="scan-done" type="button" onClick={onDone}>
          Done
        </button>
      </div>

      {error ? (
        <div className={`scan-error scan-error--${error.kind}`} role="alert">
          <p>{error.message}</p>
          <button type="button" onClick={() => startCameraRef.current()}>
            Retry
          </button>
        </div>
      ) : null}

      {toast ? (
        <div className={`scan-toast scan-toast--${toast.kind}`} data-testid="scan-toast" role="status">
          {toast.text}
        </div>
      ) : null}
    </div>
  )
}
