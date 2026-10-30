import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { contribution, work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const rows = await db
    .select({
      id: contribution.id,
      title: contribution.title,
      type: contribution.type,
      status: contribution.status,
      feedback: contribution.creatorFeedback,
      isPublic: contribution.isPublic,
      createdAt: contribution.createdAt,
      workSlug: work.slug,
      workTitle: workVersion.title,
      sourceVersion: workVersion.versionNumber
    })
    .from(contribution)
    .innerJoin(work, eq(contribution.workId, work.id))
    .innerJoin(workVersion, eq(contribution.sourceVersionId, workVersion.id))
    .where(eq(contribution.contributorUserId, actor.userId))
    .orderBy(desc(contribution.createdAt))
    .limit(100);

  return NextResponse.json({ contributions: rows });
}