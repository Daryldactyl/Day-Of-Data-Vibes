import { useEffect, useState } from 'react'
import type { Lead } from './lib/leads'
import { encodeListChunks, DEFAULT_CHUNK_SIZE } from './lib/listTransfer'
import { defaultMakeListQrDataUrl, type MakeQrDataUrl } from './badgeQr'
import { defaultMakeTransferId, type MakeTransferId } from './transferId'

interface ShareListViewProps {
  leads: Lead[]
  onDone: () => void
  /** The deliberate "archive these" action — the Vendor confirms the handoff
   *  landed, moving the whole active list to archived (ADR-0005). Never a side
   *  effect of opening/closing this view: only this button archives. */
  onArchive: () => void
  makeQrDataUrl?: MakeQrDataUrl
  makeTransferId?: MakeTransferId
}

/** Full-screen sender view for a Merge: turn the Vendor's current Leads into a
 *  scrollable stack of QR codes a teammate can scan, one card per chunk, each
 *  labelled "Code i+1 of M". Read-only — sharing alters no Leads. */
export function ShareListView({
  leads,
  onDone,
  onArchive,
  makeQrDataUrl = defaultMakeListQrDataUrl,
  makeTransferId = defaultMakeTransferId,
}: ShareListViewProps) {
  // Compute the transfer id ONCE, through the injected capability (lazy
  // initializer) — so all chunks share one id, it doesn't regenerate per
  // render, and Math.random()/Date.now() never run inline in render (the
  // react-hooks/purity concern that flagged the scan clock and the raffle draw).
  const [transferId] = useState(() => makeTransferId())
  const payloads = encodeListChunks(leads, transferId, DEFAULT_CHUNK_SIZE)
  const [urls, setUrls] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all(payloads.map((p) => makeQrDataUrl(p))).then((generated) => {
      if (!cancelled) setUrls(generated)
    })
    return () => {
      cancelled = true
    }
    // payloads are derived deterministically from leads + transferId; depend on
    // the stable transferId and the leads identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferId, leads])

  return (
    <div className="badge-overlay" data-testid="share-overlay">
      <div className="badge-hud">
        <span className="badge-title">Show my list as codes</span>
        <button className="badge-done" type="button" onClick={onDone}>
          Done
        </button>
      </div>

      <div className="share-stack">
        {urls.map((url, i) => (
          <div className="share-card" key={i}>
            <img className="share-qr" src={url} alt={`List code ${i + 1} of ${urls.length}`} />
            <p className="share-label">
              Code {i + 1} of {urls.length}
            </p>
          </div>
        ))}
      </div>

      <div className="share-archive">
        <button className="share-archive-button" type="button" onClick={onArchive}>
          I've handed these off — archive them
        </button>
      </div>
    </div>
  )
}
