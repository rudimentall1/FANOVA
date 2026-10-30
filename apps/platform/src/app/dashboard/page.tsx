import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/server-auth";
import { SignOutButton } from "@/components/auth/auth-ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  return (
    <main className="shell dashboard-shell">
      <header className="topbar">
        <Link className="brand" href="/">FANOVA</Link>
        <SignOutButton />
      </header>
      <section className="dashboard-hero">
        <p className="eyebrow">YOUR WORKSPACE</p>
        <h1>Welcome to FANOVA.</h1>
        <p className="intro">Your account is active. Your next step is to discover stories and join a creator's world.</p>
      </section>
      <section className="account-panel">
        <div>
          <span className="panel-label">ACCOUNT ID</span>
          <strong className="account-id">{actor.userId}</strong>
        </div>
        <div>
          <span className="panel-label">ACCESS</span>
          <div className="role-list">{actor.roles.map((role) => <span className="role-chip" key={role}>{role}</span>)}</div>
        </div>
        <p className="field-note">New accounts start as readers. Creator publishing tools will appear only after creator access is granted.</p>
      </section>
      <section className="dashboard-links">
        <Link href="/discover" className="dashboard-link"><span>01</span><strong>Discover stories</strong><small>Explore creator-published works.</small></Link>
        <Link href="/settings/account" className="dashboard-link"><span>02</span><strong>Account</strong><small>View your profile and access level.</small></Link>
        {actor.roles.includes("creator") ? (
          <Link href="/studio" className="dashboard-link"><span>03</span><strong>Creator Studio</strong><small>Publish works and manage permitted-use rules.</small></Link>
        ) : (
          <Link href="/dashboard/creator-access" className="dashboard-link"><span>03</span><strong>Apply for creator access</strong><small>Submit a portfolio and request creator permissions.</small></Link>
        )}
        {actor.roles.includes("admin") ? (
          <Link href="/admin/creator-requests" className="dashboard-link"><span>04</span><strong>Admin review</strong><small>Review pending creator applications.</small></Link>
        ) : null}
      </section>
    </main>
  );
}