import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userProfile, work, workVersion } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [entry] = await db
    .select({
      slug: work.slug,
      title: workVersion.title,
      synopsis: workVersion.synopsis,
      body: workVersion.body,
      permissions: workVersion.permissions,
      versionNumber: workVersion.versionNumber,
      sourceHash: workVersion.sourceHash,
      permissionHash: workVersion.permissionHash,
      creatorName: userProfile.displayName,
      creatorHandle: userProfile.handle
    })
    .from(work)
    .innerJoin(workVersion, eq(work.currentVersionId, workVersion.id))
    .leftJoin(userProfile, eq(work.ownerUserId, userProfile.userId))
    .where(and(eq(work.slug, slug), eq(work.status, "published")))
    .limit(1);

  if (!entry) return NextResponse.json({ error: "Work not found." }, { status: 404 });
  return NextResponse.json({ work: entry });
}