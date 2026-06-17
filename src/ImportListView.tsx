import { useEffect, useRef, useState } from 'react'
import type { Lead } from './lib/leads'
import { decodeChunk, reassembleChunks, mergeLeads, type ListChunk } from './lib/listTransfer'
import { saveLeads } from './lib/leadsStorage'
import { defaultCreateScanner, diagnoseCamera as defaultDiagnoseCamera, type CreateScanner } from './scanner'
import type { CameraErrorInfo } from './lib/cameraError'

interface Progress {
  have: number
  total: number
  missing: number[]
}

interface Summary {
  added: number
  skipped: number
}

interface ImportListViewProps {
  leads: Lead[]
  onLeadsChange: (leads: Lead[]) => void
  onDone: () => void
  createScanner?: CreateScanner
  diagnoseCamera?: () => Promise<CameraErrorInfo>
}

/** Full-screen receiver view for a Merge: scan a teammate's list QR codes and
 *  merge their Leads into ours. Each decode is routed to decodeChunk /
 *  reassembleChunks (the "second scan mode") — NOT the Badge handleScan path, so
 *  a vCard Badge scanned here is ignored (ADR-0001). */
export function ImportListView({
  leads,
  onLeadsChange,
  onDone,
  createScanner = defaultCreateScanner,
  diagnoseCamera = defaultDiagnoseCamera,
}: ImportListViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const startCameraRef = useRef<() => void>(() => {})
  // Accumulated, decoded chunks across decodes (the scanner's onDecode closure
  // is long-lived, so progress lives in a ref it can always read + append to).
  const chunksRef = useRef<ListChunk[]>([])
  // Refs so the long-lived onDecode closure always merges against current Leads
  // and calls the current onLeadsChange (mirrors ScanOverlay).
  const leadsRef = useRef(leads)
  const onLeadsChangeRef = useRef(onLeadsChange)
  useEffect(() => {
    leadsRef.current = leads
    onLeadsChangeRef.current = onLeadsChange
  })

  const [progress, setProgress] = useState<Progress | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<CameraErrorInfo | null>(null)
  // Completion is one-shot: the merge persists once. Guarded via a ref because
  // the scanner's onDecode closure is captured at mount and never sees later
  // `summary` state — a ref it reads live keeps post-complete decodes inert.
  const doneRef = useRef(false)

  function onDecodedText(rawQrText: string) {
    // Once a transfer is complete, ignore further decodes — the merge is done
    // and one-shot; re-scanning a code must not re-merge.
    if (doneRef.current) return
    const chunk = decodeChunk(rawQrText)
    // Not a list chunk (a vCard Badge, junk, foreign format) → ignored.
    if (!chunk) return
    chunksRef.current = [...chunksRef.current, chunk]
    const { have, total, missing, complete, leads: incoming } = reassembleChunks(chunksRef.current)
    setProgress({ have, total, missing })
    if (complete) {
      doneRef.current = true
      const { merged, added, skipped } = mergeLeads(leadsRef.current, incoming)
      onLeadsChangeRef.current(merged)
      saveLeads(merged)
      setSummary({ added, skipped })
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const scanner = createScanner(video, onDecodedText)
    let cancelled = false

    // DEV-only seam for live Playwright QA: inject a decoded chunk string without
    // a real list QR in front of the camera. Stripped from production builds
    // (mirrors ScanOverlay's __scanBadge).
    if (import.meta.env.DEV) {
      ;(window as unknown as { __importChunk?: (t: string) => void }).__importChunk = onDecodedText
    }

    let starting = false
    async function startCamera() {
      // Guard against concurrent restarts (an impatient double-tap on Retry).
      if (starting) return
      starting = true
      try {
        await scanner.start()
        if (cancelled) return
        setError(null)
      } catch {
        // start() masks the real getUserMedia error ("Camera not found."), so
        // probe directly to recover the true reason (mirrors ScanOverlay).
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
      if (import.meta.env.DEV) {
        delete (window as unknown as { __importChunk?: (t: string) => void }).__importChunk
      }
    }
    // Mount-once: the camera must not restart on every Lead change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="scan-overlay" data-testid="import-overlay">
      <video className="scan-video" ref={videoRef} playsInline muted />

      <div className="scan-hud">
        <span className="badge-title">Import a list</span>
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

      {summary ? (
        <div className="import-status" role="status">
          <p className="import-summary" data-testid="import-summary">
            Imported {summary.added} new {summary.added === 1 ? 'Lead' : 'Leads'} ({summary.skipped}{' '}
            already had)
          </p>
        </div>
      ) : progress ? (
        <div className="import-status" role="status">
          <p className="import-progress" data-testid="import-progress">
            Imported {progress.have} of {progress.total}
          </p>
          {progress.missing.length > 0 ? (
            <p className="import-missing" data-testid="import-missing">
              Still need: {progress.missing.map((i) => i + 1).join(', ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
