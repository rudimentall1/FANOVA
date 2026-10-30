import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { userProfile, work, workVersion } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [entry] = await db
    .select({
      id: work.id,
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
  return (
    <main className="shell dashboard-shell">
      <header className="topbar">
        <Link className="brand" href="/">FANOVA</Link>
        <nav className="home-nav"><Link href="/discover">Discover</Link><Link href="/dashboard">Workspace</Link></nav>
      </header>
      <article className="work-detail">
        <p className="eyebrow">CREATOR-PUBLISHED WORK · VERSION {entry.versionNumber}</p>
        <h1>{entry.title}</h1>
        <p className="work-synopsis">{entry.synopsis}</p>
        <p className="creator-byline">By {entry.creatorName ?? "FANOVA creator"} · @{entry.creatorHandle ?? "creator"}</p>
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
          <p className="eyebrow">CONTENT INTEGRITY</p>
          <p>Versioned content hashes are stored with this work. They are not yet anchored on Soneium.</p>
          <code>Source SHA-256: {entry.sourceHash}</code>
          <code>Permissions SHA-256: {entry.permissionHash}</code>
        </section>
      </article>
    </main>
  );
}