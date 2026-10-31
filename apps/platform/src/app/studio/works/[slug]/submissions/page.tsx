import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { contribution, provenanceAnchor, userProfile, work } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { canManageOwnWork } from "@/lib/authz";
import { ContributionReviewCard } from "@/components/contributions/contribution-ui";

export const dynamic = "force-dynamic";

export default async function WorkSubmissionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (!actor.roles.includes("creator")) redirect("/dashboard");
  const { slug } = await params;
  const [source] = await db.select({ id: work.id, ownerUserId: work.ownerUserId, slug: work.slug })
    .from(work).where(eq(work.slug, slug)).limit(1);
  if (!source || !canManageOwnWork(actor, source.ownerUserId)) notFound();

  const rows = await db
    .select({
      id: contribution.id,
      title: contribution.title,
      type: contribution.type,
      content: contribution.content,
      status: contribution.status,
      feedback: contribution.creatorFeedback,
      createdAt: contribution.createdAt,
      contributorName: userProfile.displayName,
      contributorHandle: userProfile.handle
    })
    .from(contribution)
    .leftJoin(userProfile, eq(contribution.contributorUserId, userProfile.userId))
    .where(eq(contribution.workId, source.id))
    .orderBy(asc(contribution.createdAt))
    .limit(100);

  return (
    <main className="shell dashboard-shell">
      <header className="topbar"><Link className="brand" href="/">FANOVA</Link><Link className="text-link" href="/studio/works">Your works</Link></header>
      <section className="dashboard-hero compact-hero">
        <p className="eyebrow">CREATOR REVIEW QUEUE</p>
        <h1>Community contributions.</h1>
        <p className="intro">Review each submission against the permission version it acknowledged.</p>
      </section>
      {rows.length === 0 ? (
        <section className="empty-state"><h2>No submissions yet.</h2><p>When contributors submit to this work, their work will appear here.</p></section>
      ) : (
        <section className="contribution-list">
          {rows.map((row) => (
            <ContributionReviewCard
              key={row.id}
              contributionId={row.id}
              title={row.title}
              type={row.type}
              content={row.content}
              contributorName={row.contributorName}
              contributorHandle={row.contributorHandle}
              createdAt={row.createdAt}
              status={row.status}
              feedback={row.feedback}
            />
          ))}
        </section>
      )}
    </main>
  );
}