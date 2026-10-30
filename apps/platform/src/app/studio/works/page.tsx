import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function CreatorWorksPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (!actor.roles.includes("creator")) redirect("/dashboard");

  const rows = await db
    .select({
      id: work.id,
      slug: work.slug,
      status: work.status,
      updatedAt: work.updatedAt,
      title: workVersion.title,
      synopsis: workVersion.synopsis,
      versionNumber: workVersion.versionNumber
    })
    .from(work)
    .innerJoin(workVersion, eq(work.currentVersionId, workVersion.id))
    .where(eq(work.ownerUserId, actor.userId))
    .orderBy(desc(work.updatedAt));

  return (
    <main className="shell dashboard-shell">
      <header className="topbar">
        <Link className="brand" href="/">FANOVA</Link>
        <nav className="home-nav"><Link href="/studio">Studio</Link><Link href="/dashboard">Workspace</Link></nav>
      </header>
      <section className="dashboard-hero compact-hero">
        <p className="eyebrow">CREATOR STUDIO</p>
        <h1>Your works.</h1>
        <p className="intro">Drafts remain private. Published works appear in Discover.</p>
        <Link className="primary-button button-link" href="/studio/works/new">Create a work</Link>
      </section>
      {rows.length === 0 ? (
        <section className="empty-state"><h2>No works yet.</h2><p>Create your first work and decide what kinds of contributions you permit.</p></section>
      ) : (
        <section className="work-list">
          {rows.map((row) => (
            <article className="work-row" key={row.id}>
              <div><span className={row.status === "published" ? "work-status published" : "work-status"}>{row.status}</span><h2>{row.title}</h2><p>{row.synopsis}</p><small>Version {row.versionNumber}</small></div>
              {row.status === "published" ? <div className="work-row-actions"><Link className="text-link" href={`/works/${row.slug}`}>Open public page</Link><Link className="text-link" href={`/studio/works/${row.slug}/submissions`}>Review submissions</Link></div> : <Link className="text-link" href={`/studio/works/${row.slug}/edit`}>Edit draft</Link>}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}