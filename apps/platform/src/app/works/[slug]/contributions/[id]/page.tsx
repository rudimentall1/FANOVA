import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { keccak256, toBytes } from "viem";
import { db } from "@/db";
import { contribution, provenanceAnchor, userProfile, work, workVersion } from "@/db/schema";
import { PublicAnchorEvidence } from "@/components/provenance/public-anchor-evidence";
import { selectPublicAnchor } from "@/lib/provenance-anchor-selection";

export const dynamic = "force-dynamic";

export default async function PublicContributionPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const [entry] = await db
    .select({
      contributionId: contribution.id,
      sourceVersionId: workVersion.id,
      title: contribution.title,
      type: contribution.type,
      content: contribution.content,
      contentHash: contribution.contentHash,
      acknowledgedPermissionHash: contribution.acknowledgedPermissionHash,
      creatorFeedback: contribution.creatorFeedback,
      sourceHash: workVersion.sourceHash,
      permissionHash: workVersion.permissionHash,
      createdAt: contribution.createdAt,
      contributorName: userProfile.displayName,
      contributorHandle: userProfile.handle,
      workTitle: workVersion.title,
      workSlug: work.slug
    })
    .from(contribution)
    .innerJoin(work, eq(contribution.workId, work.id))
    .innerJoin(workVersion, eq(contribution.sourceVersionId, workVersion.id))
    .leftJoin(userProfile, eq(contribution.contributorUserId, userProfile.userId))
    .where(and(
      eq(contribution.id, id),
      eq(work.slug, slug),
      eq(contribution.status, "approved"),
      eq(contribution.isPublic, true)
    ))
    .limit(1);

  if (!entry) notFound();

  const storyAnchors = await db.select({
    status: provenanceAnchor.status, transactionHash: provenanceAnchor.transactionHash,
    blockNumber: provenanceAnchor.blockNumber, verifiedAt: provenanceAnchor.verifiedAt,
    eventName: provenanceAnchor.eventName, chainId: provenanceAnchor.chainId,
    contractAddress: provenanceAnchor.contractAddress, expectedSignerAddress: provenanceAnchor.expectedSignerAddress,
    verificationSnapshot: provenanceAnchor.verificationSnapshot,
    sourceHash: provenanceAnchor.sourceHash,
    permissionHash: provenanceAnchor.permissionHash,
    contributionHash: provenanceAnchor.contributionHash,
    createdAt: provenanceAnchor.createdAt
  }).from(provenanceAnchor).where(and(
    eq(provenanceAnchor.workVersionId, entry.sourceVersionId),
    eq(provenanceAnchor.operationType, "work_version")
  ));
  const contributionAnchors = await db.select({
    status: provenanceAnchor.status, transactionHash: provenanceAnchor.transactionHash,
    blockNumber: provenanceAnchor.blockNumber, verifiedAt: provenanceAnchor.verifiedAt,
    eventName: provenanceAnchor.eventName, chainId: provenanceAnchor.chainId,
    contractAddress: provenanceAnchor.contractAddress, expectedSignerAddress: provenanceAnchor.expectedSignerAddress,
    verificationSnapshot: provenanceAnchor.verificationSnapshot, createdAt: provenanceAnchor.createdAt
  }).from(provenanceAnchor).where(and(
    eq(provenanceAnchor.contributionId, entry.contributionId),
    eq(provenanceAnchor.operationType, "contribution")
  ));
  const decisionAnchors = await db.select({
    status: provenanceAnchor.status, transactionHash: provenanceAnchor.transactionHash,
    blockNumber: provenanceAnchor.blockNumber, verifiedAt: provenanceAnchor.verifiedAt,
    eventName: provenanceAnchor.eventName, chainId: provenanceAnchor.chainId,
    contractAddress: provenanceAnchor.contractAddress, expectedSignerAddress: provenanceAnchor.expectedSignerAddress,
    verificationSnapshot: provenanceAnchor.verificationSnapshot, createdAt: provenanceAnchor.createdAt
  }).from(provenanceAnchor).where(and(
    eq(provenanceAnchor.contributionId, entry.contributionId),
    eq(provenanceAnchor.operationType, "creator_decision")
  ));

  const storySelection = selectPublicAnchor(storyAnchors);
  const contributionSelection = selectPublicAnchor(contributionAnchors);
  const decisionSelection = selectPublicAnchor(decisionAnchors);

  const publicAnchor = (anchor: typeof storyAnchors[number] | typeof contributionAnchors[number] | typeof decisionAnchors[number] | null) => anchor ? {
    ...anchor,
    blockNumber: anchor.blockNumber?.toString() ?? null,
    verifiedAt: anchor.verifiedAt?.toISOString() ?? null
  } : null;

  return (    <main className="shell dashboard-shell">
      <header className="topbar"><Link className="brand" href="/">FANOVA</Link><Link className="text-link" href={`/works/${slug}`}>Back to source work</Link></header>
      <article className="work-detail">
        <p className="eyebrow">APPROVED COMMUNITY CONTRIBUTION · {entry.type.replace("_", " ")}</p>
        <h1>{entry.title}</h1>
        <p className="creator-byline">By {entry.contributorName ?? "Contributor"} · @{entry.contributorHandle ?? "member"} · Based on <Link href={`/works/${entry.workSlug}`}>{entry.workTitle}</Link></p>
        <div className="work-body">{entry.content.split("\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <section className="proof-reference">
          <p className="eyebrow">PROVENANCE EVIDENCE</p>
          <PublicAnchorEvidence label="Source story version" expectedEvent="StoryVersionRegistered" anchor={publicAnchor(storySelection.anchor)} ambiguous={storySelection.ambiguous} expectedHashes={{ sourceHash: entry.sourceHash, permissionHash: entry.permissionHash }} />
          <PublicAnchorEvidence label="Contribution" expectedEvent="ContributionRegistered" anchor={publicAnchor(contributionSelection.anchor)} ambiguous={contributionSelection.ambiguous} expectedHashes={{ sourceHash: entry.sourceHash, permissionHash: entry.acknowledgedPermissionHash, contributionHash: entry.contentHash }} />
          <PublicAnchorEvidence label="Creator decision" expectedEvent="ContributionDecided" anchor={publicAnchor(decisionSelection.anchor)} ambiguous={decisionSelection.ambiguous} expectedHashes={{ sourceHash: entry.sourceHash, permissionHash: entry.acknowledgedPermissionHash, contributionHash: entry.contentHash, reasonCode: keccak256(toBytes(entry.creatorFeedback ?? "")) }} />
          <p>Content SHA-256</p><code>{entry.contentHash}</code>
        </section>
      </article>
    </main>
  );
}