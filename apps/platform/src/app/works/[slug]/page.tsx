import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { contribution, provenanceAnchor, userProfile, work, workVersion } from "@/db/schema";
import { PublicAnchorEvidence } from "@/components/provenance/public-anchor-evidence";

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
      title: contribution.title,
      type: contribution.type,
      contributorName: userProfile.displayName,
      contributorHandle: userProfile.handle,
      createdAt: contribution.createdAt
    })
    .from(contribution)
    .leftJoin(userProfile, eq(contribution.contributorUserId, userProfile.userId))
    .where(and(
      eq(contribution.workId, entry.id),
      eq(contribution.status, "approved"),
      eq(contribution.isPublic, true)
    ))
    .orderBy(desc(contribution.createdAt))
    .limit(20);

  const [storyAnchorRow] = await db.select({
    status: provenanceAnchor.status,
    transactionHash: provenanceAnchor.transactionHash,
    blockNumber: provenanceAnchor.blockNumber,
    verifiedAt: provenanceAnchor.verifiedAt,
    eventName: provenanceAnchor.eventName,
    chainId: provenanceAnchor.chainId,
    contractAddress: provenanceAnchor.contractAddress,
    expectedSignerAddress: provenanceAnchor.expectedSignerAddress,
    verificationSnapshot: provenanceAnchor.verificationSnapshot
  }).from(provenanceAnchor).where(and(
    eq(provenanceAnchor.workVersionId, entry.versionId),
    eq(provenanceAnchor.operationType, "work_version")
  )).orderBy(desc(provenanceAnchor.createdAt)).limit(1);

  const contributionAnchors = publicContributions.length > 0
    ? await db.select({
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
        verificationSnapshot: provenanceAnchor.verificationSnapshot
      }).from(provenanceAnchor).where(inArray(
        provenanceAnchor.contributionId,
        publicContributions.map((item) => item.id)
      )).orderBy(desc(provenanceAnchor.createdAt))
    : [];

  const anchorByContribution = new Map<string, {
    contribution: typeof contributionAnchors[number] | null;
    decision: typeof contributionAnchors[number] | null;
  }>();
  for (const anchor of contributionAnchors) {
    if (!anchor.contributionId) continue;
    const current = anchorByContribution.get(anchor.contributionId) ?? { contribution: null, decision: null };
    if (anchor.operationType === "contribution" && !current.contribution) current.contribution = anchor;
    if (anchor.operationType === "creator_decision" && !current.decision) current.decision = anchor;
    anchorByContribution.set(anchor.contributionId, current);
  }

  const publicAnchor = (anchor: typeof storyAnchorRow | typeof contributionAnchors[number] | null | undefined) => anchor ? {
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
          <PublicAnchorEvidence label="Story version anchor" expectedEvent="StoryVersionRegistered" anchor={publicAnchor(storyAnchorRow)} />
          <code>Source SHA-256: {entry.sourceHash}</code>
          <code>Permissions SHA-256: {entry.permissionHash}</code>
        </section>
        <section className="public-contributions">
          <p className="eyebrow">COMMUNITY CONTRIBUTIONS</p>
          {publicContributions.length === 0 ? <p className="field-note">No approved public contributions yet.</p> : publicContributions.map((item) => {
            const anchors = anchorByContribution.get(item.id);
            return (
              <article className="version-row" key={item.id}>
                <Link className="public-contribution-link" href={`/works/${slug}/contributions/${item.id}`}>
                  <strong>{item.title}</strong><small>{item.type.replace("_", " ")} · {item.contributorName ?? "Contributor"} · @{item.contributorHandle ?? "member"}</small>
                </Link>
                <PublicAnchorEvidence label="Contribution anchor" expectedEvent="ContributionRegistered" anchor={publicAnchor(anchors?.contribution)} />
                <PublicAnchorEvidence label="Creator decision anchor" expectedEvent="ContributionDecided" anchor={publicAnchor(anchors?.decision)} />
              </article>
            );
          })}
        </section>
      </article>
    </main>
  );
}