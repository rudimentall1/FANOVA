import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { userProfile, work, workVersion } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 100) ?? "";
  const filters = [eq(work.status, "published")];
  if (query) {
    filters.push(or(
      ilike(workVersion.title, `%${query}%`),
      ilike(workVersion.synopsis, `%${query}%`)
    ) as typeof filters[number]);
  }

  const rows = await db
    .select({
      slug: work.slug,
      title: workVersion.title,
      synopsis: workVersion.synopsis,
      creatorName: userProfile.displayName,
      creatorHandle: userProfile.handle,
      publishedAt: work.publishedAt
    })
    .from(work)
    .innerJoin(workVersion, eq(work.currentVersionId, workVersion.id))
    .leftJoin(userProfile, eq(work.ownerUserId, userProfile.userId))
    .where(and(...filters))
    .orderBy(desc(work.publishedAt))
    .limit(50);

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
      <form className="catalogue-search" action="/discover" method="get">
        <label htmlFor="catalogue-query">Search published works</label>
        <div><input id="catalogue-query" name="q" maxLength={100} defaultValue={query} placeholder="Title or synopsis" /><button className="secondary-button" type="submit">Search</button></div>
      </form>
      {rows.length === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">{query ? "NO MATCHES" : "NO PUBLISHED WORKS YET"}</p>
          <h2>{query ? "No published work matches that search." : "The catalogue is waiting for its first creator."}</h2>
          <p>{query ? "Try another title or a shorter search phrase." : "Published works will appear here. FANOVA does not fill the catalogue with demo profiles or invented stories."}</p>
          {!query ? <Link className="text-link" href="/sign-up">Create an account</Link> : null}
        </section>
      ) : (
        <section className="catalogue-grid">
          {rows.map((entry) => (
            <Link className="catalogue-card" href={`/works/${entry.slug}`} key={entry.slug}>
              <span className="eyebrow">ORIGINAL WORK</span>
              <h2>{entry.title}</h2>
              <p>{entry.synopsis}</p>
              <small>By {entry.creatorName ?? "FANOVA creator"} · @{entry.creatorHandle ?? "creator"}</small>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}