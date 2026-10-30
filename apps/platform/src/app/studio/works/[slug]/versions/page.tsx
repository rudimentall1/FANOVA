import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { canManageOwnWork } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function WorkVersionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (!actor.roles.includes("creator")) redirect("/dashboard");
  const { slug } = await params;

  const [source] = await db.select({
    id: work.id,
    ownerUserId: work.ownerUserId,
    status: work.status,
    currentVersionId: work.currentVersionId,
    draftVersionId: work.draftVersionId
  }).from(work).where(eq(work.slug, slug)).limit(1);

  if (!source || !canManageOwnWork(actor, source.ownerUserId)) notFound();

  const versions = await db
    .select({
      id: workVersion.id,
      versionNumber: workVersion.versionNumber,
      title: workVersion.title,
      synopsis: workVersion.synopsis,
      sourceHash: workVersion.sourceHash,
      permissionHash: workVersion.permissionHash,
      createdAt: workVersion.createdAt
    })
    .from(workVersion)
    .where(eq(workVersion.workId, source.id))
    .orderBy(desc(workVersion.versionNumber));

  return (
    <main className="shell dashboard-shell">
      <header className="topbar"><Link className="brand" href="/">FANOVA</Link><Link className="text-link" href="/studio/works">Your works</Link></header>
      <section className="dashboard-hero compact-hero">
        <p className="eyebrow">VERSION HISTORY</p>
        <h1>Every saved version.</h1>
        <p className="intro">Published versions remain stable while unpublished revisions are prepared separately.</p>
        <Link className="primary-button button-link" href={`/studio/works/${slug}/edit`}>Edit work</Link>
      </section>
      <section className="version-list">
        {versions.map((version) => {
          const isLive = version.id === source.currentVersionId && source.status === "published";
          const isDraft = version.id === source.draftVersionId || (source.status === "draft" && version.id === source.currentVersionId);
          return (
            <article className="version-row" key={version.id}>
              <div><span className={`work-status ${isLive ? "published" : ""}`}>{isLive ? "live" : isDraft ? "unpublished draft" : "superseded"}</span><h2>Version {version.versionNumber}: {version.title}</h2><p>{version.synopsis}</p><small>{version.createdAt.toLocaleString()}</small></div>
              <div className="version-hashes"><code>Source: {version.sourceHash}</code><code>Permissions: {version.permissionHash}</code></div>
            </article>
          );
        })}
      </section>
    </main>
  );
}