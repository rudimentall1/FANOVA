import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { keccak256, toBytes } from "viem";
import { db } from "@/db";
import { contribution, provenanceAnchor, userProfile, work, workVersion } from "@/db/schema";
import { PublicAnchorEvidence } from "@/components/provenance/public-anchor-evidence";
import { selectPublicAnchor } from "@/lib/provenance-anchor-selection";
import { deriveContributionIdentity, deriveStoryIdentity } from "@/lib/provenance-intent";
import { isAddress, type Address } from "viem";

export const dynamic = "force-dynamic";

export default async function PublicContributionPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const [entry] = await db
    .select({
      contributionId: contribution.id,
      workId: contribution.workId,
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

  const contributionIdentity = deriveContributionIdentity(entry.contributionId);

  const anchorFields = {
    status: provenanceAnchor.status, transactionHash: provenanceAnchor.transactionHash,
    blockNumber: provenanceAnchor.blockNumber, verifiedAt: provenanceAnchor.verifiedAt,
    eventName: provenanceAnchor.eventName, chainId: provenanceAnchor.chainId,
    contractAddress: provenanceAnchor.contractAddress, expectedSignerAddress: provenanceAnchor.expectedSignerAddress,
    verificationSnapshot: provenanceAnchor.verificationSnapshot,
    sourceHash: provenanceAnchor.sourceHash,
    permissionHash: provenanceAnchor.permissionHash,
    contributionHash: provenanceAnchor.contributionHash,
    createdAt: provenanceAnchor.createdAt
  };
  const storyFilter = and(
    eq(provenanceAnchor.workVersionId, entry.sourceVersionId),
    eq(provenanceAnchor.operationType, "work_version")
  );
  const [storyVerifiedCountRow] = await db.select({ total: count() }).from(provenanceAnchor)
    .where(and(storyFilter, eq(provenanceAnchor.status, "mainnet")));
  const storyVerified = await db.selectDistinctOn([provenanceAnchor.workVersionId], anchorFields)
    .from(provenanceAnchor)
    .where(and(storyFilter, eq(provenanceAnchor.status, "mainnet")))
    .orderBy(provenanceAnchor.workVersionId, desc(provenanceAnchor.createdAt));
  const storyOther = await db.selectDistinctOn([provenanceAnchor.workVersionId], anchorFields)
    .from(provenanceAnchor)
    .where(and(storyFilter, ne(provenanceAnchor.status, "mainnet")))
    .orderBy(provenanceAnchor.workVersionId, desc(provenanceAnchor.createdAt));
  const storyAnchors = [...storyVerified, ...storyOther];

  const contributionFilter = and(
    eq(provenanceAnchor.contributionId, entry.contributionId),
    eq(provenanceAnchor.operationType, "contribution")
  );
  const [contributionVerifiedCountRow] = await db.select({ total: count() }).from(provenanceAnchor)
    .where(and(contributionFilter, eq(provenanceAnchor.status, "mainnet")));
  const contributionVerified = await db.selectDistinctOn([provenanceAnchor.contributionId, provenanceAnchor.operationType], anchorFields)
    .from(provenanceAnchor)
    .where(and(contributionFilter, eq(provenanceAnchor.status, "mainnet")))
    .orderBy(provenanceAnchor.contributionId, provenanceAnchor.operationType, desc(provenanceAnchor.createdAt));
  const contributionOther = await db.selectDistinctOn([provenanceAnchor.contributionId, provenanceAnchor.operationType], anchorFields)
    .from(provenanceAnchor)
    .where(and(contributionFilter, ne(provenanceAnchor.status, "mainnet")))
    .orderBy(provenanceAnchor.contributionId, provenanceAnchor.operationType, desc(provenanceAnchor.createdAt));
  const contributionAnchors = [...contributionVerified, ...contributionOther];

  const decisionFilter = and(
    eq(provenanceAnchor.contributionId, entry.contributionId),
    eq(provenanceAnchor.operationType, "creator_decision")
  );
  const [decisionVerifiedCountRow] = await db.select({ total: count() }).from(provenanceAnchor)
    .where(and(decisionFilter, eq(provenanceAnchor.status, "mainnet")));
  const decisionVerified = await db.selectDistinctOn([provenanceAnchor.contributionId, provenanceAnchor.operationType], anchorFields)
    .from(provenanceAnchor)
    .where(and(decisionFilter, eq(provenanceAnchor.status, "mainnet")))
    .orderBy(provenanceAnchor.contributionId, provenanceAnchor.operationType, desc(provenanceAnchor.createdAt));
  const decisionOther = await db.selectDistinctOn([provenanceAnchor.contributionId, provenanceAnchor.operationType], anchorFields)
    .from(provenanceAnchor)
    .where(and(decisionFilter, ne(provenanceAnchor.status, "mainnet")))
    .orderBy(provenanceAnchor.contributionId, provenanceAnchor.operationType, desc(provenanceAnchor.createdAt));
  const decisionAnchors = [...decisionVerified, ...decisionOther];

  const storySelection = selectPublicAnchor(storyAnchors, Number(storyVerifiedCountRow?.total ?? 0));
  const contributionSelection = selectPublicAnchor(contributionAnchors, Number(contributionVerifiedCountRow?.total ?? 0));
  const decisionSelection = selectPublicAnchor(decisionAnchors, Number(decisionVerifiedCountRow?.total ?? 0));
  // Use the signer captured by each immutable intent, not a mutable linked-wallet row.
  const storySigner = storySelection.anchor?.expectedSignerAddress ?? null;
  const storyIdentity = storySigner && isAddress(storySigner)
    ? deriveStoryIdentity(entry.workId, storySigner as Address).storyId
    : null;

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
          <PublicAnchorEvidence label="Source story version" expectedEvent="StoryVersionRegistered" expectedContractAddress={process.env.FANOVA_PROVENANCE_CONTRACT ?? null} anchor={publicAnchor(storySelection.anchor)} ambiguous={storySelection.ambiguous} expectedSignerAddress={storySigner} expectedEntityId={storyIdentity} expectedHashes={{ sourceHash: entry.sourceHash, permissionHash: entry.permissionHash }} />
          <PublicAnchorEvidence label="Contribution" expectedEvent="ContributionRegistered" expectedContractAddress={process.env.FANOVA_PROVENANCE_CONTRACT ?? null} anchor={publicAnchor(contributionSelection.anchor)} ambiguous={contributionSelection.ambiguous} expectedSignerAddress={contributionSelection.anchor?.expectedSignerAddress ?? null} expectedEntityId={contributionIdentity} expectedHashes={{ sourceHash: entry.sourceHash, permissionHash: entry.acknowledgedPermissionHash, contributionHash: entry.contentHash }} />
          <PublicAnchorEvidence label="Creator decision" expectedEvent="ContributionDecided" expectedContractAddress={process.env.FANOVA_PROVENANCE_CONTRACT ?? null} anchor={publicAnchor(decisionSelection.anchor)} ambiguous={decisionSelection.ambiguous} expectedSignerAddress={decisionSelection.anchor?.expectedSignerAddress ?? null} expectedEntityId={contributionIdentity} expectedHashes={{ sourceHash: entry.sourceHash, permissionHash: entry.acknowledgedPermissionHash, contributionHash: entry.contentHash, reasonCode: keccak256(toBytes(entry.creatorFeedback ?? "")) }} />
          <p>Content SHA-256</p><code>{entry.contentHash}</code>
        </section>
      </article>
    </main>
  );
}