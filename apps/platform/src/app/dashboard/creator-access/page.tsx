import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { creatorAccessRequest } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { CreatorAccessForm } from "@/components/creator-access/creator-access-ui";

export const dynamic = "force-dynamic";

export default async function CreatorAccessPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.roles.includes("creator")) redirect("/studio");

  const requests = await db
    .select({
      status: creatorAccessRequest.status,
      statement: creatorAccessRequest.statement,
      createdAt: creatorAccessRequest.createdAt,
      reviewedAt: creatorAccessRequest.reviewedAt
    })
    .from(creatorAccessRequest)
    .where(eq(creatorAccessRequest.userId, actor.userId))
    .orderBy(desc(creatorAccessRequest.createdAt))
    .limit(5);
  const pending = requests.some((request) => request.status === "pending");

  return (
    <main className="shell dashboard-shell">
      <header className="topbar"><Link className="brand" href="/">FANOVA</Link><Link className="text-link" href="/dashboard">Workspace</Link></header>
      <section className="dashboard-hero compact-hero">
        <p className="eyebrow">CREATOR ACCESS</p>
        <h1>Bring your work<br />to FANOVA.</h1>
        <p className="intro">Tell us what you create and share a public portfolio. Creator access is granted after review.</p>
      </section>
      {requests.map((request, index) => (
        <section className="request-history" key={index}>
          <span className={`work-status ${request.status === "approved" ? "published" : ""}`}>{request.status}</span>
          <p>{request.statement}</p>
          <small>Submitted {request.createdAt.toLocaleDateString()}</small>
        </section>
      ))}
      {pending ? (
        <section className="empty-state"><h2>Application under review.</h2><p>You already have a pending application. You can submit another after a decision is recorded.</p></section>
      ) : <CreatorAccessForm />}
    </main>
  );
}