import './App.css'

export default function App() {
  return (
    <main className="app">
      <header className="topbar">
        <h1>Day of Data — Vendor App</h1>
        <p className="tag">Scan attendee badges → collect leads → export</p>
      </header>

      <section className="empty">
        <p className="big">No leads yet</p>
        <p className="muted">
          This is the starting shell. The <strong>Scan</strong>, leads list, and{' '}
          <strong>Export</strong> features get built live at the meetup — the vCard
          helper and QR libraries are already wired in and tested.
        </p>
      </section>

      <footer className="foot">
        Attendee · Vendor · Badge · Scan · Lead · Export
      </footer>
    </main>
  )
}
