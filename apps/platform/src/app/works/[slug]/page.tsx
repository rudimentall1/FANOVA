import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq, inArray, ne } from "drizzle-orm";
import { keccak256, toBytes } from "viem";
import { db } from "@/db";
import { contribution, linkedWallet, provenanceAnchor, userProfile, work, workVersion } from "@/db/schema";
import { PublicAnchorEvidence } from "@/components/provenance/public-anchor-evidence";
import { selectPublicAnchor } from "@/lib/provenance-anchor-selection";
import { deriveContributionIdentity, deriveStoryIdentity, FANOVA_CHAIN_ID } from "@/lib/provenance-intent";
import { isAddress, type Address } from "viem";

export const dynamic = "force-dynamic";

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [entry] = await db
    .select({
      id: work.id,
      versionId: workVersion.id,
      slug: work.slug,
      ownerUserId: work.ownerUserId,
      title: workVersion.title,
      synopsis: workVersion.synopsis,
      body: workVersion.body,
      permissions: workVersion.permissions,
      versionNumber: workVersion.versionNumber,
      sourceHash: workVersion.sourceHash,
      permissionHash: workVersion.permissionHash,
      creatorName: userProfile.displayName,
      creatorHandle: userProfile.handle
    })
    .from(work)
    .innerJoin(workVersion, eq(work.currentVersionId, workVersion.id))
    .leftJoin(userProfile, eq(work.ownerUserId, userProfile.userId))
    .where(and(eq(work.slug, slug), eq(work.status, "published")))
    .limit(1);

  if (!entry) notFound();

  const permissions = entry.permissions;
  const publicContributions = await db
    .select({
      id: contribution.id,
      contributorUserId: contribution.contributorUserId,
      title: contribution.title,
      type: contribution.type,
      contributorName: userProfile.displayName,
      contributorHandle: userProfile.handle,
      createdAt: contribution.createdAt,
      contentHash: contribution.contentHash,
      acknowledgedPermissionHash: contribution.acknowledgedPermissionHash,
      creatorFeedback: contribution.creatorFeedback,
      sourceHash: workVersion.sourceHash,
      permissionHash: workVersion.permissionHash
    })
    .from(contribution)
    .innerJoin(workVersion, eq(contribution.sourceVersionId, workVersion.id))
    .leftJoin(userProfile, eq(contribution.contributorUserId, userProfile.userId))
    .where(and(
      eq(contribution.workId, entry.id),
      eq(contribution.status, "approved"),
      eq(contribution.isPublic, true)
    ))
    .orderBy(desc(contribution.createdAt))
    .limit(20);

  const walletUserIds = [...new Set([entry.ownerUserId, ...publicContributions.map((item) => item.contributorUserId)])];
  const publicWalletRows = await db.select({ userId: linkedWallet.userId, address: linkedWallet.address })
    .from(linkedWallet)
    .where(and(inArray(linkedWallet.userId, walletUserIds), eq(linkedWallet.chainId, FANOVA_CHAIN_ID)));
  const publicWalletByUser = new Map(publicWalletRows.map((wallet) => [wallet.userId, wallet.address]));
  const creatorWallet = publicWalletByUser.get(entry.ownerUserId) ?? null;
  const storyIdentity = creatorWallet && isAddress(creatorWallet)
    ? deriveStoryIdentity(entry.id, creatorWallet as Address).storyId
    : null;

  const storyAnchorFields = {
    status: provenanceAnchor.status,
    transactionHash: provenanceAnchor.transactionHash,
    blockNumber: provenanceAnchor.blockNumber,
    verifiedAt: provenanceAnchor.verifiedAt,
    eventName: provenanceAnchor.eventName,
    chainId: provenanceAnchor.chainId,
    contractAddress: provenanceAnchor.contractAddress,
    expectedSignerAddress: provenanceAnchor.expectedSignerAddress,
    verificationSnapshot: provenanceAnchor.verificationSnapshot,
    sourceHash: provenanceAnchor.sourceHash,
    permissionHash: provenanceAnchor.permissionHash,
    contributionHash: provenanceAnchor.contributionHash,
    createdAt: provenanceAnchor.createdAt
  };
  const storyFilter = and(
    eq(provenanceAnchor.workVersionId, entry.versionId),
    eq(provenanceAnchor.operationType, "work_version")
  );
  const [storyVerifiedCountRow] = await db.select({ total: count() }).from(provenanceAnchor)
    .where(and(storyFilter, eq(provenanceAnchor.status, "mainnet")));
  const storyVerified = await db.selectDistinctOn([provenanceAnchor.workVersionId], storyAnchorFields)
    .from(provenanceAnchor)
    .where(and(storyFilter, eq(provenanceAnchor.status, "mainnet")))
    .orderBy(provenanceAnchor.workVersionId, desc(provenanceAnchor.createdAt));
  const storyOther = await db.selectDistinctOn([provenanceAnchor.workVersionId], storyAnchorFields)
    .from(provenanceAnchor)
    .where(and(storyFilter, ne(provenanceAnchor.status, "mainnet")))
    .orderBy(provenanceAnchor.workVersionId, desc(provenanceAnchor.createdAt));
  const storyAnchors = [...storyVerified, ...storyOther];
  const storySelection = selectPublicAnchor(storyAnchors, Number(storyVerifiedCountRow?.total ?? 0));

  const contributionAnchorFields = {
    contributionId: provenanceAnchor.contributionId,
    operationType: provenanceAnchor.operationType,
    status: provenanceAnchor.status,
    transactionHash: provenanceAnchor.transactionHash,
    blockNumber: provenanceAnchor.blockNumber,
    verifiedAt: provenanceAnchor.verifiedAt,
    eventName: provenanceAnchor.eventName,
    chainId: provenanceAnchor.chainId,
    contractAddress: provenanceAnchor.contractAddress,
    expectedSignerAddress: provenanceAnchor.expectedSignerAddress,
    verificationSnapshot: provenanceAnchor.verificationSnapshot,
    sourceHash: provenanceAnchor.sourceHash,
    permissionHash: provenanceAnchor.permissionHash,
    contributionHash: provenanceAnchor.contributionHash,
    createdAt: provenanceAnchor.createdAt
  };
  const contributionIds = publicContributions.map((item) => item.id);
  const contributionAnchors = contributionIds.length > 0
    ? await db.selectDistinctOn([provenanceAnchor.contributionId, provenanceAnchor.operationType], contributionAnchorFields)
        .from(provenanceAnchor)
        .where(and(inArray(provenanceAnchor.contributionId, contributionIds), ne(provenanceAnchor.status, "mainnet")))
        .orderBy(provenanceAnchor.contributionId, provenanceAnchor.operationType, desc(provenanceAnchor.createdAt))
    : [];
  const verifiedContributionAnchors = contributionIds.length > 0
    ? await db.selectDistinctOn([provenanceAnchor.contributionId, provenanceAnchor.operationType], contributionAnchorFields)
        .from(provenanceAnchor)
        .where(and(inArray(provenanceAnchor.contributionId, contributionIds), eq(provenanceAnchor.status, "mainnet")))
        .orderBy(provenanceAnchor.contributionId, provenanceAnchor.operationType, desc(provenanceAnchor.createdAt))
    : [];
  const verifiedContributionCounts = contributionIds.length > 0
    ? await db.select({
        contributionId: provenanceAnchor.contributionId,
        operationType: provenanceAnchor.operationType,
        total: count()
      }).from(provenanceAnchor)
        .where(and(inArray(provenanceAnchor.contributionId, contributionIds), eq(provenanceAnchor.status, "mainnet")))
        .groupBy(provenanceAnchor.contributionId, provenanceAnchor.operationType)
    : [];
  const verifiedCountByContribution = new Map(
    verifiedContributionCounts.map((row) => [`${row.contributionId}:${row.operationType}`, Number(row.total)])
  );
  const allContributionAnchors = [...verifiedContributionAnchors, ...contributionAnchors];

  const anchorAttemptsByContribution = new Map<string, {
    contribution: typeof contributionAnchors;
    decision: typeof contributionAnchors;
  }>();
  for (const anchor of allContributionAnchors) {
    if (!anchor.contributionId) continue;
    const current = anchorAttemptsByContribution.get(anchor.contributionId) ?? { contribution: [], decision: [] };
    if (anchor.operationType === "contribution") current.contribution.push(anchor);
    if (anchor.operationType === "creator_decision") current.decision.push(anchor);
    anchorAttemptsByContribution.set(anchor.contributionId, current);
  }

  const publicAnchor = (anchor: typeof storyAnchors[number] | typeof contributionAnchors[number] | null | undefined) => anchor ? {
    ...anchor,
    blockNumber: anchor.blockNumber?.toString() ?? null,
    verifiedAt: anchor.verifiedAt?.toISOString() ?? null
  } : null;

  return (    <main className="shell dashboard-shell">
      <header className="topbar">
        <Link className="brand" href="/">FANOVA</Link>
        <nav className="home-nav"><Link href="/discover">Discover</Link><Link href="/dashboard">Workspace</Link></nav>
      </header>
      <article className="work-detail">
        <p className="eyebrow">CREATOR-PUBLISHED WORK · VERSION {entry.versionNumber}</p>
        <h1>{entry.title}</h1>
        <p className="work-synopsis">{entry.synopsis}</p>
        <p className="creator-byline">By {entry.creatorName ?? "FANOVA creator"} · @{entry.creatorHandle ?? "creator"}</p>
        <Link className="primary-button button-link" href={`/works/${slug}/contribute`}>Submit a contribution</Link>
        <div className="work-body">{entry.body.split("\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <section className="permission-panel">
          <p className="eyebrow">PERMITTED USE</p>
          <ul>
            <li>{permissions.fanArt ? "Fan art allowed" : "Fan art not permitted"}</li>
            <li>{permissions.translations ? "Translations allowed" : "Translations not permitted"}</li>
            <li>{permissions.adaptations ? "Adaptations allowed" : "Adaptations not permitted"}</li>
            <li>{permissions.commercialUse ? "Commercial use allowed" : "Commercial use not permitted"}</li>
            <li>{permissions.attributionRequired ? "Attribution required" : "Attribution not required"}</li>
          </ul>
          {permissions.additionalTerms ? <p className="additional-terms">{permissions.additionalTerms}</p> : null}
        </section>
        <section className="proof-reference">
          <p className="eyebrow">STORY PROVENANCE</p>
          <p>Only a server-verified Soneium receipt and matching contract event are labelled MAINNET VERIFIED.</p>
          <PublicAnchorEvidence label="Story version anchor" expectedEvent="StoryVersionRegistered" anchor={publicAnchor(storySelection.anchor)} ambiguous={storySelection.ambiguous} expectedSignerAddress={creatorWallet} expectedEntityId={storyIdentity} expectedHashes={{ sourceHash: entry.sourceHash, permissionHash: entry.permissionHash }} />
          <code>Source SHA-256: {entry.sourceHash}</code>
          <code>Permissions SHA-256: {entry.permissionHash}</code>
        </section>
        <section className="public-contributions">
          <p className="eyebrow">COMMUNITY CONTRIBUTIONS</p>
          {publicContributions.length === 0 ? <p className="field-note">No approved public contributions yet.</p> : publicContributions.map((item) => {
            const attempts = anchorAttemptsByContribution.get(item.id);
            const contributionSelection = selectPublicAnchor(attempts?.contribution ?? [], verifiedCountByContribution.get(`${item.id}:contribution`));
            const decisionSelection = selectPublicAnchor(attempts?.decision ?? [], verifiedCountByContribution.get(`${item.id}:creator_decision`));
            return (
              <article className="version-row" key={item.id}>
                <Link className="public-contribution-link" href={`/works/${slug}/contributions/${item.id}`}>
                  <strong>{item.title}</strong><small>{item.type.replace("_", " ")} · {item.contributorName ?? "Contributor"} · @{item.contributorHandle ?? "member"}</small>
                </Link>
                <PublicAnchorEvidence label="Contribution anchor" expectedEvent="ContributionRegistered" anchor={publicAnchor(contributionSelection.anchor)} ambiguous={contributionSelection.ambiguous} expectedSignerAddress={publicWalletByUser.get(item.contributorUserId) ?? null} expectedEntityId={deriveContributionIdentity(item.id)} expectedHashes={{ sourceHash: item.sourceHash, permissionHash: item.acknowledgedPermissionHash, contributionHash: item.contentHash }} />
                <PublicAnchorEvidence label="Creator decision anchor" expectedEvent="ContributionDecided" anchor={publicAnchor(decisionSelection.anchor)} ambiguous={decisionSelection.ambiguous} expectedSignerAddress={creatorWallet} expectedEntityId={deriveContributionIdentity(item.id)} expectedHashes={{ sourceHash: item.sourceHash, permissionHash: item.acknowledgedPermissionHash, contributionHash: item.contentHash, reasonCode: keccak256(toBytes(item.creatorFeedback ?? "")) }} />
              </article>
            );
          })}
        </section>
      </article>
    </main>
  );
}