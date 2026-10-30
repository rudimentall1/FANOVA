import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { creatorAccessRequest, user, userProfile } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { CreatorRequestReview } from "@/components/creator-access/creator-access-ui";

export const dynamic = "force-dynamic";

export default async function AdminCreatorRequestsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (!actor.roles.includes("admin")) redirect("/dashboard");

  const requests = await db
    .select({
      id: creatorAccessRequest.id,
      email: user.email,
      displayName: userProfile.displayName,
      handle: userProfile.handle,
      portfolioUrl: creatorAccessRequest.portfolioUrl,
      statement: creatorAccessRequest.statement,
      createdAt: creatorAccessRequest.createdAt
    })
    .from(creatorAccessRequest)
    .innerJoin(user, eq(creatorAccessRequest.userId, user.id))
    .leftJoin(userProfile, eq(creatorAccessRequest.userId, userProfile.userId))
    .where(eq(creatorAccessRequest.status, "pending"))
    .orderBy(asc(creatorAccessRequest.createdAt))
    .limit(100);

  return (
    <main className="shell dashboard-shell">
      <header className="topbar"><Link className="brand" href="/">FANOVA</Link><Link className="text-link" href="/dashboard">Workspace</Link></header>
      <section className="dashboard-hero compact-hero">
        <p className="eyebrow">ADMIN REVIEW</p>
        <h1>Creator applications.</h1>
        <p className="intro">Review the applicant's public work and stated intent before granting creator permissions.</p>
      </section>
      {requests.length === 0 ? (
        <section className="empty-state"><h2>No pending applications.</h2><p>New creator requests will appear here.</p></section>
      ) : (
        <section className="request-list">
          {requests.map((request) => (
            <article className="request-card" key={request.id}>
              <p className="eyebrow">CREATOR APPLICATION</p>
              <h2>{request.displayName ?? "Unnamed account"} · @{request.handle ?? "unknown"}</h2>
              <p className="request-email">{request.email}</p>
              <p>{request.statement}</p>
              {request.portfolioUrl ? <a className="text-link" href={request.portfolioUrl} target="_blank" rel="noreferrer">Open portfolio</a> : <span className="field-note">No portfolio link provided.</span>}
              <small>Submitted {request.createdAt.toLocaleDateString()}</small>
              <CreatorRequestReview requestId={request.id} />
            </article>
          ))}
        </section>
      )}
    </main>
  );
}