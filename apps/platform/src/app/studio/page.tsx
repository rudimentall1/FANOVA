import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function CreatorStudioPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (!actor.roles.includes("creator")) redirect("/dashboard");

  return (
    <main className="shell dashboard-shell">
      <header className="topbar">
        <Link className="brand" href="/">FANOVA</Link>
        <nav className="home-nav"><Link href="/dashboard">Workspace</Link><Link href="/discover">Discover</Link></nav>
      </header>
      <section className="dashboard-hero">
        <p className="eyebrow">CREATOR STUDIO</p>
        <h1>Your stories.<br />Your rules.</h1>
        <p className="intro">Publish original works, set permitted-use rules, and keep each published version traceable.</p>
        <Link className="primary-button button-link" href="/studio/works/new">Create a work</Link>
      </section>
      <section className="studio-panel">
        <h2>Creator workspace</h2>
        <p>Manage drafts and published works in one place.</p>
        <Link className="text-link" href="/studio/works">View your works</Link>
      </section>
    </main>
  );
}