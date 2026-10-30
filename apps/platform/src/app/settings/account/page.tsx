import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userProfile } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { SignOutButton } from "@/components/auth/auth-ui";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const [profile] = await db.select().from(userProfile).where(eq(userProfile.userId, actor.userId)).limit(1);

  return (
    <main className="shell dashboard-shell">
      <header className="topbar">
        <Link className="brand" href="/">FANOVA</Link>
        <SignOutButton />
      </header>
      <section className="dashboard-hero">
        <p className="eyebrow">ACCOUNT</p>
        <h1>Your account.</h1>
        <p className="intro">Your account identity and current access level.</p>
      </section>
      <section className="account-panel">
        <div><span className="panel-label">DISPLAY NAME</span><strong>{session.user.name}</strong></div>
        <div><span className="panel-label">EMAIL</span><strong>{session.user.email}</strong><p className="field-note">{session.user.emailVerified ? "Email verified" : "Email not verified"}</p></div>
        <div><span className="panel-label">PUBLIC HANDLE</span><strong>@{profile?.handle ?? "not-set"}</strong></div>
        <div><span className="panel-label">ACCESS</span><div className="role-list">{actor.roles.map((role) => <span className="role-chip" key={role}>{role}</span>)}</div></div>
        <p className="field-note">Profile editing is the next account milestone. This page currently displays server-stored account data only.</p>
      </section>
      <p className="auth-switch"><Link href="/dashboard">Back to workspace</Link></p>
    </main>
  );
}