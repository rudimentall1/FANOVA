import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contribution, provenanceAnchor, work, workVersion } from "@/db/schema";
import { ContributionProvenanceAction } from "@/components/contributions/contribution-provenance-action";
import { getCurrentActor } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function MyContributionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { id } = await params;

  const [entry] = await db
    .select({
      id: contribution.id,
      title: contribution.title,
      type: contribution.type,
      content: contribution.content,
      contentHash: contribution.contentHash,
      acknowledgedPermissionHash: contribution.acknowledgedPermissionHash,
      status: contribution.status,
      feedback: contribution.creatorFeedback,
      isPublic: contribution.isPublic,
      createdAt: contribution.createdAt,
      workSlug: work.slug,
      workTitle: workVersion.title,
      sourceVersion: workVersion.versionNumber,
      sourceVersionId: workVersion.id,
      currentVersionId: work.currentVersionId,
      workStatus: work.status
    })
    .from(contribution)
    .innerJoin(work, eq(contribution.workId, work.id))
    .innerJoin(workVersion, eq(contribution.sourceVersionId, workVersion.id))
    .where(and(eq(contribution.id, id), eq(contribution.contributorUserId, actor.userId)))
    .limit(1);

  if (!entry) notFound();

  const [savedAnchor] = await db.select({
    id: provenanceAnchor.id,
    status: provenanceAnchor.status,
    contractAddress: provenanceAnchor.contractAddress,
    expectedSignerAddress: provenanceAnchor.expectedSignerAddress,
    transactionHash: provenanceAnchor.transactionHash,
    blockNumber: provenanceAnchor.blockNumber,
    verificationSnapshot: provenanceAnchor.verificationSnapshot
  }).from(provenanceAnchor)
    .where(and(
      eq(provenanceAnchor.contributionId, entry.id),
      eq(provenanceAnchor.operationType, "contribution")
    ))
    .orderBy(desc(provenanceAnchor.createdAt))
    .limit(1);

  const anchor = savedAnchor ? {
    id: savedAnchor.id,
    status: savedAnchor.status,
    contractAddress: savedAnchor.contractAddress,
    expectedSignerAddress: savedAnchor.expectedSignerAddress,
    transactionHash: savedAnchor.transactionHash,
    blockNumber: savedAnchor.blockNumber?.toString() ?? null,
    storyProvenanceVersion: savedAnchor.verificationSnapshot?.sourceVersion?.toString() ?? null
  } : null;
  const isCurrentSource = entry.workStatus === "published" && entry.currentVersionId === entry.sourceVersionId;

  return (
    <main className="shell dashboard-shell">
      <header className="topbar"><Link className="brand" href="/">FANOVA</Link><Link className="text-link" href="/dashboard/contributions">My contributions</Link></header>
      <article className="work-detail">
        <p className="eyebrow">YOUR CONTRIBUTION · {entry.status.toUpperCase()}</p>
        <h1>{entry.title}</h1>
        <p className="creator-byline">{entry.type.replace("_", " ")} · For <Link href={`/works/${entry.workSlug}`}>{entry.workTitle}</Link> · source version {entry.sourceVersion}</p>
        <div className="work-body">{entry.content.split("\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        {entry.feedback ? <section className="permission-panel"><p className="eyebrow">CREATOR FEEDBACK</p><p>{entry.feedback}</p></section> : null}
        <section className="proof-reference">
          <p className="eyebrow">SUBMISSION RECORD</p>
          <p>Permission version acknowledged at submission time.</p>
          <code>Content SHA-256: {entry.contentHash}</code>
          <code>Permission SHA-256: {entry.acknowledgedPermissionHash}</code>
          <p>{entry.isPublic ? "This approved contribution is public." : "This contribution is private."}</p>
          {anchor && (anchor.status === "mainnet" || Boolean(anchor.transactionHash) || (entry.status !== "stale" && isCurrentSource)) ? (
            <ContributionProvenanceAction contributionId={entry.id} sourceVersionNumber={entry.sourceVersion} anchor={anchor} />
          ) : entry.status !== "stale" && isCurrentSource ? (
            <ContributionProvenanceAction contributionId={entry.id} sourceVersionNumber={entry.sourceVersion} anchor={null} />
          ) : (
            <p className="field-note">This contribution is stale and has no submitted Mainnet transaction to verify.</p>
          )}
        </section>
      </article>
    </main>
  );
}