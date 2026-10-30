import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { contribution, userProfile, work } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { canManageOwnWork } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!actor.roles.includes("creator")) return NextResponse.json({ error: "Creator access required." }, { status: 403 });

  const { slug } = await params;
  const [source] = await db.select({ id: work.id, ownerUserId: work.ownerUserId })
    .from(work).where(eq(work.slug, slug)).limit(1);
  if (!source || !canManageOwnWork(actor, source.ownerUserId)) {
    return NextResponse.json({ error: "Work not found." }, { status: 404 });
  }

  const rows = await db
    .select({
      id: contribution.id,
      title: contribution.title,
      type: contribution.type,
      commercialIntent: contribution.commercialIntent,
      content: contribution.content,
      contentHash: contribution.contentHash,
      acknowledgedPermissionHash: contribution.acknowledgedPermissionHash,
      status: contribution.status,
      feedback: contribution.creatorFeedback,
      isPublic: contribution.isPublic,
      createdAt: contribution.createdAt,
      contributorName: userProfile.displayName,
      contributorHandle: userProfile.handle
    })
    .from(contribution)
    .leftJoin(userProfile, eq(contribution.contributorUserId, userProfile.userId))
    .where(eq(contribution.workId, source.id))
    .orderBy(asc(contribution.createdAt))
    .limit(100);

  return NextResponse.json({ contributions: rows });
}