import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">FANOVA</Link>
        <nav className="home-nav" aria-label="Account">
          <Link href="/sign-in">Sign in</Link>
          <Link className="nav-cta" href="/sign-up">Create account</Link>
        </nav>
      </header>
      <section className="hero">
        <p className="eyebrow">CREATOR × COMMUNITY</p>
        <h1>Stories grow<br /><em>with their fans.</em></h1>
        <p className="intro">
          A creator sets the rules. Contributors work within them. Decisions stay linked to the source story.
        </p>
        <div className="hero-actions">
          <Link className="primary-button button-link" href="/discover">Explore stories</Link>
          <Link className="text-link" href="/sign-up">Join the community</Link>
        </div>
        <div className="status-panel">
          <strong>Built around creator control</strong>
          <span>Creators define permitted use and make the final decision on contributions. FANOVA records provenance for accepted work.</span>
        </div>
      </section>
    </main>
  );
}