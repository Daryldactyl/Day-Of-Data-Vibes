import { useState } from 'react'
import './App.css'
import { loadLeads } from './lib/leadsStorage'
import type { Lead } from './lib/leads'
import { ScanOverlay } from './ScanOverlay'
import type { CreateScanner } from './scanner'
import { defaultExportLeads } from './lib/exportCsv'

interface AppProps {
  /** Inject a fake scanner in tests; defaults to the real camera scanner. */
  createScanner?: CreateScanner
  /** Inject a fake Export in tests; defaults to the real CSV download. */
  exportLeads?: (leads: Lead[]) => void | Promise<void>
}

export default function App({ createScanner, exportLeads = defaultExportLeads }: AppProps = {}) {
  const [leads, setLeads] = useState<Lead[]>(() => loadLeads())
  const [scanning, setScanning] = useState(false)

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
      </div>

      <footer className="foot">
        Attendee · Vendor · Badge · Scan · Lead · Export
      </footer>

      {scanning ? (
        <ScanOverlay
          leads={leads}
          onLeadsChange={setLeads}
          onDone={() => setScanning(false)}
          createScanner={createScanner}
        />
      ) : null}
    </main>
  )
}
