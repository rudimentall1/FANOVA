import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { contribution, work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { createContributionSchema } from "@/lib/contribution-validation";
import { hashContribution } from "@/lib/contribution-hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { slug } = await params;
  const [source] = await db
    .select({
      workId: work.id,
      ownerUserId: work.ownerUserId,
      versionId: workVersion.id,
      permissionHash: workVersion.permissionHash,
      permissions: workVersion.permissions
    })
    .from(work)
    .innerJoin(workVersion, eq(work.currentVersionId, workVersion.id))
    .where(and(eq(work.slug, slug), eq(work.status, "published")))
    .limit(1);

  if (!source) return NextResponse.json({ error: "Published work not found." }, { status: 404 });
  if (source.ownerUserId === actor.userId) {
    return NextResponse.json({ error: "You cannot submit a contribution to your own work." }, { status: 409 });
  }

  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  let payload: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 140_000) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = createContributionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({
      error: "Contribution details are invalid.",
      fields: parsed.error.flatten().fieldErrors
    }, { status: 422 });
  }

  const input = parsed.data;
  const permissionAllowed =
    input.type === "fan_art" ? source.permissions.fanArt :
    input.type === "translation" ? source.permissions.translations :
    source.permissions.adaptations;

  if (!permissionAllowed) {
    return NextResponse.json({ error: "This contribution type is not permitted by the creator." }, { status: 403 });
  }
  if (input.commercialIntent && !source.permissions.commercialUse) {
    return NextResponse.json({ error: "The creator has not permitted commercial use." }, { status: 403 });
  }

  const id = randomUUID();
  const now = new Date();
  const contentHash = hashContribution(input);

  await db.insert(contribution).values({
    id,
    workId: source.workId,
    sourceVersionId: source.versionId,
    contributorUserId: actor.userId,
    type: input.type,
    commercialIntent: input.commercialIntent,
    title: input.title,
    content: input.content,
    contentHash,
    acknowledgedPermissionHash: source.permissionHash,
    acknowledgedAt: now,
    status: "pending",
    isPublic: false,
    createdAt: now,
    updatedAt: now
  });

  return NextResponse.json({
    contribution: { id, status: "pending", sourceVersionId: source.versionId },
    contentHash,
    acknowledgedPermissionHash: source.permissionHash,
    onchain: "not_submitted"
  }, { status: 201 });
}