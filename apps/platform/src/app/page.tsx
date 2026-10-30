export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/">FANOVA</a>
        <span className="environment">PLATFORM FOUNDATION · LOCAL</span>
      </header>
      <section className="hero">
        <p className="eyebrow">CREATOR × COMMUNITY</p>
        <h1>Stories grow<br /><em>with their fans.</em></h1>
        <p className="intro">A creator sets the rules. Contributors work within them. Decisions stay linked to the source story.</p>
        <div className="status-panel">
          <strong>Platform foundation</strong>
          <span>Server application scaffold is running. Account and publishing flows are being built in stages.</span>
        </div>
      </section>
    </main>
  );
}