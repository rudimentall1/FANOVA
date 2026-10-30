import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/server-auth";
import { NewWorkForm } from "@/components/works/new-work-form";

export const dynamic = "force-dynamic";

export default async function NewWorkPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (!actor.roles.includes("creator")) redirect("/dashboard");

  return (
    <main className="shell dashboard-shell">
      <header className="topbar"><Link className="brand" href="/">FANOVA</Link><Link href="/studio/works" className="text-link">Your works</Link></header>
      <section className="dashboard-hero compact-hero">
        <p className="eyebrow">NEW ORIGINAL WORK</p>
        <h1>Set the ground rules.</h1>
        <p className="intro">Add the source material and choose the contribution types your community may create.</p>
      </section>
      <NewWorkForm />
    </main>
  );
}