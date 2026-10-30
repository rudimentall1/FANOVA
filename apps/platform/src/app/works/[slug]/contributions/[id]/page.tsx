import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contribution, userProfile, work, workVersion } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function PublicContributionPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const [entry] = await db
    .select({
      title: contribution.title,
      type: contribution.type,
      content: contribution.content,
      contentHash: contribution.contentHash,
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

  return (
    <main className="shell dashboard-shell">
      <header className="topbar"><Link className="brand" href="/">FANOVA</Link><Link className="text-link" href={`/works/${slug}`}>Back to source work</Link></header>
      <article className="work-detail">
        <p className="eyebrow">APPROVED COMMUNITY CONTRIBUTION · {entry.type.replace("_", " ")}</p>
        <h1>{entry.title}</h1>
        <p className="creator-byline">By {entry.contributorName ?? "Contributor"} · @{entry.contributorHandle ?? "member"} · Based on <Link href={`/works/${entry.workSlug}`}>{entry.workTitle}</Link></p>
        <div className="work-body">{entry.content.split("\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <section className="proof-reference"><p className="eyebrow">CONTENT INTEGRITY</p><p>This approved contribution has a stored SHA-256 content hash. It has not been anchored on Soneium.</p><code>{entry.contentHash}</code></section>
      </article>
    </main>
  );
}