import { useState } from 'react'
import './App.css'
import { loadLeads } from './lib/leadsStorage'
import type { Lead } from './lib/leads'

export default function App() {
  const [leads] = useState<Lead[]>(() => loadLeads())

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

      <footer className="foot">
        Attendee · Vendor · Badge · Scan · Lead · Export
      </footer>
    </main>
  )
}
