import Link from "next/link";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { userProfile, work, workVersion } from "@/db/schema";
import { parseDiscoverFilters } from "@/lib/discover-filters";

export const dynamic = "force-dynamic";

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; fanArt?: string; translations?: string; adaptations?: string; commercialUse?: string }> }) {
  const params = await searchParams;
  const filtersFromUrl = parseDiscoverFilters(new URLSearchParams(params as Record<string, string>));
  const query = filtersFromUrl.q;
  const filters = [eq(work.status, "published")];
  if (query) {
    filters.push(or(
      ilike(workVersion.title, `%${query}%`),
      ilike(workVersion.synopsis, `%${query}%`),
      ilike(userProfile.handle, `%${query}%`),
      ilike(userProfile.displayName, `%${query}%`)
    ) as typeof filters[number]);
  }
  if (filtersFromUrl.fanArt) filters.push(sql`(${workVersion.permissions}->>'fanArt') = 'true'`);
  if (filtersFromUrl.translations) filters.push(sql`(${workVersion.permissions}->>'translations') = 'true'`);
  if (filtersFromUrl.adaptations) filters.push(sql`(${workVersion.permissions}->>'adaptations') = 'true'`);
  if (filtersFromUrl.commercialUse) filters.push(sql`(${workVersion.permissions}->>'commercialUse') = 'true'`);

  const hasActiveFilters = Boolean(query || filtersFromUrl.fanArt || filtersFromUrl.translations || filtersFromUrl.adaptations || filtersFromUrl.commercialUse);

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
    .leftJoin(userProfile, and(eq(work.ownerUserId, userProfile.userId), eq(userProfile.isPublic, true)))
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
        <label htmlFor="catalogue-query">Search published works or creators</label>
        <div><input id="catalogue-query" name="q" maxLength={100} defaultValue={query} placeholder="Title, synopsis, or creator" /><button className="secondary-button" type="submit">Search</button></div>
        <fieldset className="discover-permission-filters">
          <legend>Show works that allow</legend>
          <label><input type="checkbox" name="fanArt" value="allowed" defaultChecked={filtersFromUrl.fanArt} /> Fan art</label>
          <label><input type="checkbox" name="translations" value="allowed" defaultChecked={filtersFromUrl.translations} /> Translations</label>
          <label><input type="checkbox" name="adaptations" value="allowed" defaultChecked={filtersFromUrl.adaptations} /> Adaptations</label>
          <label><input type="checkbox" name="commercialUse" value="allowed" defaultChecked={filtersFromUrl.commercialUse} /> Commercial use</label>
        </fieldset>
        <Link className="text-link" href="/discover">Clear filters</Link>
      </form>
      {rows.length === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">{hasActiveFilters ? "NO MATCHES" : "NO PUBLISHED WORKS YET"}</p>
          <h2>{hasActiveFilters ? "No published work matches these filters." : "The catalogue is waiting for its first creator."}</h2>
          <p>{hasActiveFilters ? "Change or clear your search and permission filters." : "Published works will appear here. FANOVA does not fill the catalogue with demo profiles or invented stories."}</p>
          {!hasActiveFilters ? <Link className="text-link" href="/sign-up">Create an account</Link> : null}
        </section>
      ) : (
        <section className="catalogue-grid">
          {rows.map((entry) => (
            <article className="catalogue-card" key={entry.slug}>
              <span className="eyebrow">ORIGINAL WORK</span>
              <h2><Link href={`/works/${entry.slug}`}>{entry.title}</Link></h2>
              <p>{entry.synopsis}</p>
              {entry.creatorHandle ? <small>By {entry.creatorName} · <Link href={`/creators/${entry.creatorHandle}`}>@{entry.creatorHandle}</Link></small> : <small>By FANOVA creator</small>}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}