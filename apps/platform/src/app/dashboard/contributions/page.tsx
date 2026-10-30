import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contribution, work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function MyContributionsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const rows = await db
    .select({
      id: contribution.id,
      title: contribution.title,
      type: contribution.type,
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
    .where(eq(contribution.contributorUserId, actor.userId))
    .orderBy(desc(contribution.createdAt))
    .limit(100);

  return (
    <main className="shell dashboard-shell">
      <header className="topbar"><Link className="brand" href="/">FANOVA</Link><Link className="text-link" href="/dashboard">Workspace</Link></header>
      <section className="dashboard-hero compact-hero">
        <p className="eyebrow">MY CONTRIBUTIONS</p>
        <h1>Your work in other worlds.</h1>
        <p className="intro">Track creator decisions and the exact source version you submitted against.</p>
      </section>
      {rows.length === 0 ? (
        <section className="empty-state"><h2>No contributions yet.</h2><p>Find a published work and submit within the creator's permitted-use rules.</p><Link className="text-link" href="/discover">Discover works</Link></section>
      ) : (
        <section className="work-list">
          {rows.map((row) => (
            <article className="work-row" key={row.id}>
              <div><span className={`work-status ${row.status === "approved" ? "published" : ""}`}>{row.status}</span><h2>{row.title}</h2><p>For <Link href={`/works/${row.workSlug}`}>{row.workTitle}</Link> · {row.type.replace("_", " ")} · source version {row.sourceVersion}</p>{row.feedback ? <small>Creator feedback: {row.feedback}</small> : null}</div>
              {row.status === "approved" && row.isPublic ? <Link className="text-link" href={`/works/${row.workSlug}/contributions/${row.id}`}>Public contribution</Link> : <span className="field-note">{row.status === "pending" ? "Awaiting creator review" : row.status === "stale" ? "Resubmit against the current version" : "Private"}</span>}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}