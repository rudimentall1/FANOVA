import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { NewWorkForm } from "@/components/works/new-work-form";

export const dynamic = "force-dynamic";

export default async function EditDraftPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (!actor.roles.includes("creator")) redirect("/dashboard");
  const { slug } = await params;

  const [draft] = await db
    .select({
      title: workVersion.title,
      synopsis: workVersion.synopsis,
      body: workVersion.body,
      permissions: workVersion.permissions
    })
    .from(work)
    .innerJoin(workVersion, eq(work.currentVersionId, workVersion.id))
    .where(and(
      eq(work.slug, slug),
      eq(work.ownerUserId, actor.userId),
      eq(work.status, "draft")
    ))
    .limit(1);

  if (!draft) notFound();

  return (
    <main className="shell dashboard-shell">
      <header className="topbar"><Link className="brand" href="/">FANOVA</Link><Link href="/studio/works" className="text-link">Your works</Link></header>
      <section className="dashboard-hero compact-hero">
        <p className="eyebrow">EDIT PRIVATE DRAFT</p>
        <h1>Keep shaping it.</h1>
        <p className="intro">Saving changes creates a new immutable draft version. Publishing makes that version public.</p>
      </section>
      <NewWorkForm slug={slug} initial={draft} />
    </main>
  );
}