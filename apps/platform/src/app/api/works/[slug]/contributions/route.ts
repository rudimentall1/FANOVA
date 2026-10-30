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
  const permissionAllowed = (permissions: {
    fanArt: boolean;
    translations: boolean;
    adaptations: boolean;
    commercialUse: boolean;
  }) => input.type === "fan_art" ? permissions.fanArt :
    input.type === "translation" ? permissions.translations :
    permissions.adaptations;

  const id = randomUUID();
  const now = new Date();
  const contentHash = hashContribution(input);

  const result = await db.transaction(async (tx) => {
    // Lock the work before reading its live version. Publication takes the same lock.
    const [sourceWork] = await tx
      .select({
        id: work.id,
        ownerUserId: work.ownerUserId,
        currentVersionId: work.currentVersionId
      })
      .from(work)
      .where(and(eq(work.slug, slug), eq(work.status, "published")))
      .for("update");

    if (!sourceWork || !sourceWork.currentVersionId) return { kind: "not_found" as const };
    if (sourceWork.ownerUserId === actor.userId) return { kind: "own_work" as const };

    const [sourceVersion] = await tx
      .select({
        id: workVersion.id,
        permissionHash: workVersion.permissionHash,
        permissions: workVersion.permissions
      })
      .from(workVersion)
      .where(eq(workVersion.id, sourceWork.currentVersionId))
      .limit(1);

    if (!sourceVersion) return { kind: "not_found" as const };
    if (!permissionAllowed(sourceVersion.permissions)) return { kind: "type_not_permitted" as const };
    if (input.commercialIntent && !sourceVersion.permissions.commercialUse) {
      return { kind: "commercial_not_permitted" as const };
    }

    await tx.insert(contribution).values({
      id,
      workId: sourceWork.id,
      sourceVersionId: sourceVersion.id,
      contributorUserId: actor.userId,
      type: input.type,
      commercialIntent: input.commercialIntent,
      title: input.title,
      content: input.content,
      contentHash,
      acknowledgedPermissionHash: sourceVersion.permissionHash,
      acknowledgedAt: now,
      status: "pending",
      isPublic: false,
      createdAt: now,
      updatedAt: now
    });

    return {
      kind: "created" as const,
      sourceVersionId: sourceVersion.id,
      permissionHash: sourceVersion.permissionHash
    };
  });

  if (result.kind === "not_found") return NextResponse.json({ error: "Published work not found." }, { status: 404 });
  if (result.kind === "own_work") return NextResponse.json({ error: "You cannot submit a contribution to your own work." }, { status: 409 });
  if (result.kind === "type_not_permitted") return NextResponse.json({ error: "This contribution type is not permitted by the creator." }, { status: 403 });
  if (result.kind === "commercial_not_permitted") return NextResponse.json({ error: "The creator has not permitted commercial use." }, { status: 403 });

  return NextResponse.json({
    contribution: { id, status: "pending", sourceVersionId: result.sourceVersionId },
    contentHash,
    acknowledgedPermissionHash: result.permissionHash,
    onchain: "not_submitted"
  }, { status: 201 });
}