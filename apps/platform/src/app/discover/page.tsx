import Link from "next/link";

export default function DiscoverPage() {
  return (
    <main className="shell dashboard-shell">
      <header className="topbar">
        <Link className="brand" href="/">FANOVA</Link>
        <nav className="home-nav"><Link href="/dashboard">Workspace</Link><Link href="/sign-in">Sign in</Link></nav>
      </header>
      <section className="dashboard-hero">
        <p className="eyebrow">DISCOVER</p>
        <h1>Find a story<br />worth adding to.</h1>
        <p className="intro">Explore original works and the contribution rules their creators have chosen.</p>
      </section>
      <section className="empty-state">
        <p className="eyebrow">CATALOGUE NOT YET POPULATED</p>
        <h2>The first creator works are on the way.</h2>
        <p>Public stories will appear here after creators publish them. No demo works or invented creator profiles are shown as real content.</p>
        <Link className="text-link" href="/sign-up">Create an account</Link>
      </section>
    </main>
  );
}