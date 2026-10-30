import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
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
      status: work.status,
      draftVersionId: work.draftVersionId,
      title: workVersion.title,
      synopsis: workVersion.synopsis,
      body: workVersion.body,
      permissions: workVersion.permissions
    })
    .from(work)
    .innerJoin(workVersion, sql`${workVersion.id} = coalesce(${work.draftVersionId}, ${work.currentVersionId})`)
.where(and(eq(work.slug, slug), eq(work.ownerUserId, actor.userId), inArray(work.status, ["draft", "published"])))
    .limit(1);

  if (!draft) notFound();

  return (
    <main className="shell dashboard-shell">
      <header className="topbar"><Link className="brand" href="/">FANOVA</Link><Link href="/studio/works" className="text-link">Your works</Link></header>
      <section className="dashboard-hero compact-hero">
        <p className="eyebrow">{draft.status === "published" ? (draft.draftVersionId ? "EDIT UNPUBLISHED REVISION" : "CREATE NEW VERSION") : "EDIT PRIVATE DRAFT"}</p>
        <h1>Keep shaping it.</h1>
        <p className="intro">{draft.status === "published" ? "Changes are saved as a private revision. The current public version stays live until you publish the revision." : "Saving changes creates a new draft version. Publishing makes that version public."}</p>
      </section>
      <NewWorkForm slug={slug} initial={draft} />
    </main>
  );
}