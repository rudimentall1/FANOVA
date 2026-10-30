import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { SubmitContributionForm } from "@/components/contributions/contribution-ui";

export const dynamic = "force-dynamic";

export default async function ContributePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const actor = await getCurrentActor();
  if (!actor) redirect(`/sign-in?callbackURL=${encodeURIComponent(`/works/${slug}/contribute`)}`);
  const [source] = await db
    .select({
      id: work.id,
      ownerUserId: work.ownerUserId,
      title: workVersion.title,
      permissions: workVersion.permissions,
      permissionHash: workVersion.permissionHash
    })
    .from(work)
    .innerJoin(workVersion, eq(work.currentVersionId, workVersion.id))
    .where(eq(work.slug, slug))
    .limit(1);

  if (!source) notFound();

  return (
    <main className="shell dashboard-shell">
      <header className="topbar"><Link className="brand" href="/">FANOVA</Link><Link className="text-link" href={`/works/${slug}`}>Back to work</Link></header>
      <section className="dashboard-hero compact-hero">
        <p className="eyebrow">CONTRIBUTE</p>
        <h1>{source.title}</h1>
        <p className="intro">Submit work against the current source and permission version.</p>
      </section>
      {source.ownerUserId === actor.userId ? (
        <section className="empty-state"><h2>This is your work.</h2><p>Creators review contributions from other accounts, not submissions to their own work.</p></section>
      ) : (
        <SubmitContributionForm slug={slug} permissions={source.permissions} permissionHash={source.permissionHash} />
      )}
    </main>
  );
}