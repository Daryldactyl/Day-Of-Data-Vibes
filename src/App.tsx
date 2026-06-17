import { useState } from 'react'
import './App.css'
import { loadLeads } from './lib/leadsStorage'
import type { Lead } from './lib/leads'
import { ScanOverlay } from './ScanOverlay'
import type { CreateScanner } from './scanner'
import { defaultExportLeads } from './lib/exportCsv'
import { BadgeGenerator } from './BadgeGenerator'
import { defaultMakeQrDataUrl, defaultMakeListQrDataUrl, type MakeQrDataUrl } from './badgeQr'
import { RaffleOverlay } from './RaffleOverlay'
import { ShareListView } from './ShareListView'
import { ImportListView } from './ImportListView'
import { defaultMakeTransferId, type MakeTransferId } from './transferId'

interface AppProps {
  /** Inject a fake scanner in tests; defaults to the real camera scanner. */
  createScanner?: CreateScanner
  /** Inject a fake Export in tests; defaults to the real CSV download. */
  exportLeads?: (leads: Lead[]) => void | Promise<void>
  /** Inject a fake Badge QR generator in tests; defaults to the real 320px call. */
  makeQrDataUrl?: MakeQrDataUrl
  /** Inject a fake list QR generator in tests; defaults to the larger list QR
   *  (the sender's dense Merge chunks need more pixels than a Badge). */
  makeListQrDataUrl?: MakeQrDataUrl
  /** Inject a fake random source in tests; defaults to the platform RNG. */
  random?: () => number
  /** Inject a fixed transfer id in tests; defaults to a fresh random id. */
  makeTransferId?: MakeTransferId
}

export default function App({
  createScanner,
  exportLeads = defaultExportLeads,
  makeQrDataUrl = defaultMakeQrDataUrl,
  makeListQrDataUrl = defaultMakeListQrDataUrl,
  random = Math.random,
  makeTransferId = defaultMakeTransferId,
}: AppProps = {}) {
  const [leads, setLeads] = useState<Lead[]>(() => loadLeads())
  const [scanning, setScanning] = useState(false)
  const [makingBadge, setMakingBadge] = useState(false)
  const [raffling, setRaffling] = useState(false)
  const [sharingList, setSharingList] = useState(false)
  const [importingList, setImportingList] = useState(false)

  return (
    <main className="app">
      <header className="topbar">
        <h1>Day of Data — Vendor App</h1>
        <p className="tag">Scan attendee badges → collect leads → export</p>
      </header>

      {leads.length === 0 ? (
        <section className="empty">
          <p className="big">No leads yet</p>
          <p className="muted">
            Tap <strong>Scan</strong> to capture an attendee badge. Leads you collect
            show up here and are saved on this phone.
          </p>
        </section>
      ) : (
        <section className="leads">
          <p className="count" data-testid="lead-count">
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
          </p>
          <ul className="lead-list">
            {leads.map((lead, i) => (
              <li className="lead" key={`${lead.email}-${i}`}>
                <span className="lead-name">{lead.name}</span>
                <span className="lead-email">{lead.email}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="actions">
        <button className="scan-button" type="button" onClick={() => setScanning(true)}>
          Scan
        </button>
        <button
          className="export-button"
          type="button"
          disabled={leads.length === 0}
          onClick={() => exportLeads(leads)}
        >
          Export
        </button>
        <button
          className="raffle-button"
          type="button"
          disabled={leads.length === 0}
          onClick={() => setRaffling(true)}
        >
          Raffle
        </button>
      </div>

      <footer className="foot">
        <div className="foot-links">
          <button
            className="make-badge-link"
            type="button"
            onClick={() => setMakingBadge(true)}
          >
            Make a badge
          </button>
          <button
            className="share-list-link"
            type="button"
            disabled={leads.length === 0}
            onClick={() => setSharingList(true)}
          >
            Show my list as codes
          </button>
          <button
            className="import-list-link"
            type="button"
            onClick={() => setImportingList(true)}
          >
            Import a list
          </button>
        </div>
        <span className="foot-glossary">Attendee · Vendor · Badge · Scan · Lead · Export</span>
      </footer>

      {scanning ? (
        <ScanOverlay
          leads={leads}
          onLeadsChange={setLeads}
          onDone={() => setScanning(false)}
          createScanner={createScanner}
        />
      ) : null}

      {makingBadge ? (
        <BadgeGenerator onDone={() => setMakingBadge(false)} makeQrDataUrl={makeQrDataUrl} />
      ) : null}

      {raffling ? (
        <RaffleOverlay leads={leads} onDone={() => setRaffling(false)} random={random} />
      ) : null}

      {sharingList ? (
        <ShareListView
          leads={leads}
          onDone={() => setSharingList(false)}
          makeQrDataUrl={makeListQrDataUrl}
          makeTransferId={makeTransferId}
        />
      ) : null}

      {importingList ? (
        <ImportListView
          leads={leads}
          onLeadsChange={setLeads}
          onDone={() => setImportingList(false)}
          createScanner={createScanner}
        />
      ) : null}
    </main>
  )
}
