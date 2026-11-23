import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { userProfile, userRole, work, workVersion } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function CreatorProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [profile] = await db.select({
    userId: userProfile.userId,
    handle: userProfile.handle,
    displayName: userProfile.displayName,
    bio: userProfile.bio
  }).from(userProfile)
    .innerJoin(userRole, eq(userRole.userId, userProfile.userId))
    .where(and(
      eq(userProfile.handle, handle.toLowerCase()),
      eq(userProfile.isPublic, true),
      eq(userRole.role, "creator")
    ))
    .limit(1);

  if (!profile) notFound();

  const works = await db.select({
    slug: work.slug,
    title: workVersion.title,
    synopsis: workVersion.synopsis,
    publishedAt: work.publishedAt
  }).from(work)
    .innerJoin(workVersion, eq(work.currentVersionId, workVersion.id))
    .where(and(eq(work.ownerUserId, profile.userId), eq(work.status, "published")))
    .orderBy(desc(work.publishedAt))
    .limit(50);

  return (
    <main className="shell dashboard-shell">
      <header className="topbar">
        <Link className="brand" href="/">FANOVA</Link>
        <nav className="home-nav"><Link href="/discover">Discover</Link><Link href="/sign-in">Sign in</Link></nav>
      </header>
      <section className="dashboard-hero">
        <p className="eyebrow">FANOVA CREATOR</p>
        <h1>{profile.displayName}</h1>
        <p className="creator-byline">@{profile.handle}</p>
        {profile.bio ? <p className="intro">{profile.bio}</p> : <p className="field-note">This creator has not added a bio yet.</p>}
      </section>
      <section>
        <p className="eyebrow">PUBLISHED WORKS</p>
        {works.length === 0 ? (
          <section className="empty-state"><h2>No published works yet.</h2><p>Published stories from this creator will appear here.</p></section>
        ) : (
          <div className="catalogue-grid">
            {works.map((entry) => (
              <Link className="catalogue-card" href={`/works/${entry.slug}`} key={entry.slug}>
                <span className="eyebrow">ORIGINAL WORK</span>
                <h2>{entry.title}</h2>
                <p>{entry.synopsis}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
