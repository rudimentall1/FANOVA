import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { provenanceAnchor, work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { canManageOwnWork } from "@/lib/authz";
import { StoryProvenanceAction } from "@/components/works/story-provenance-action";

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

  const anchors = versions.length > 0
    ? await db.select({
        id: provenanceAnchor.id,
        workVersionId: provenanceAnchor.workVersionId,
        status: provenanceAnchor.status,
        contractAddress: provenanceAnchor.contractAddress,
        expectedSignerAddress: provenanceAnchor.expectedSignerAddress,
        transactionHash: provenanceAnchor.transactionHash,
        blockNumber: provenanceAnchor.blockNumber,
        verifiedAt: provenanceAnchor.verifiedAt
      }).from(provenanceAnchor)
        .where(inArray(provenanceAnchor.workVersionId, versions.map((version) => version.id)))
        .orderBy(desc(provenanceAnchor.createdAt))
    : [];

  const anchorByVersion = new Map<string, (typeof anchors)[number]>();
  for (const anchor of anchors) {
    if (anchor.workVersionId && !anchorByVersion.has(anchor.workVersionId)) {
      anchorByVersion.set(anchor.workVersionId, anchor);
    }
  }

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
          const savedAnchor = anchorByVersion.get(version.id);
          const anchor = savedAnchor ? {
            id: savedAnchor.id,
            status: savedAnchor.status,
            contractAddress: savedAnchor.contractAddress,
            expectedSignerAddress: savedAnchor.expectedSignerAddress,
            transactionHash: savedAnchor.transactionHash,
            blockNumber: savedAnchor.blockNumber?.toString() ?? null,
            verifiedAt: savedAnchor.verifiedAt?.toISOString() ?? null
          } : null;
          return (
            <article className="version-row" key={version.id}>
              <div>
                <span className={`work-status ${isLive ? "published" : ""}`}>{isLive ? "live" : isDraft ? "unpublished draft" : "superseded"}</span>
                <h2>Version {version.versionNumber}: {version.title}</h2>
                <p>{version.synopsis}</p>
                <small>{version.createdAt.toLocaleString()}</small>
              </div>
              <div className="version-hashes">
                <code>Source: {version.sourceHash}</code>
                <code>Permissions: {version.permissionHash}</code>
              </div>
              {isLive && version.versionNumber === 1 ? (
                <StoryProvenanceAction workVersionId={version.id} anchor={anchor} />
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
