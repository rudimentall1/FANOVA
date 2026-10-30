import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userRole } from "@/db/schema";
import type { AuthenticatedActor } from "@/lib/authz";

export async function getCurrentActor(): Promise<AuthenticatedActor | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const rows = await db
    .select({ role: userRole.role })
    .from(userRole)
    .where(eq(userRole.userId, session.user.id));

  return {
    userId: session.user.id,
    roles: rows.map((row) => row.role)
  };
}

export async function requireCurrentActor(): Promise<AuthenticatedActor> {
  const actor = await getCurrentActor();
  if (!actor) throw new Error("UNAUTHENTICATED");
  return actor;
}