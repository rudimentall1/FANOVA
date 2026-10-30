import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contribution, work, workVersion } from "@/db/schema";
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
      sourceVersion: workVersion.versionNumber
    })
    .from(contribution)
    .innerJoin(work, eq(contribution.workId, work.id))
    .innerJoin(workVersion, eq(contribution.sourceVersionId, workVersion.id))
    .where(and(eq(contribution.id, id), eq(contribution.contributorUserId, actor.userId)))
    .limit(1);

  if (!entry) notFound();

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
          <p>{entry.isPublic ? "This approved contribution is public." : "This contribution is private."} It has not been anchored on Soneium.</p>
        </section>
      </article>
    </main>
  );
}