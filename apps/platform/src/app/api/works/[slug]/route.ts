import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { contribution, userProfile, work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { createWorkSchema } from "@/lib/work-validation";
import { hashWorkPermissions, hashWorkSource } from "@/lib/work-hash";

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

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!actor.roles.includes("creator")) {
    return NextResponse.json({ error: "Creator access is required." }, { status: 403 });
  }

  const { slug } = await params;
  const [existing] = await db
    .select({ id: work.id })
    .from(work)
    .where(and(eq(work.slug, slug), eq(work.ownerUserId, actor.userId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Work not found." }, { status: 404 });
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  let payload: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 220_000) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = createWorkSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({
      error: "Work details are invalid.",
      fields: parsed.error.flatten().fieldErrors
    }, { status: 422 });
  }

  const input = parsed.data;
  const versionId = randomUUID();
  const sourceHash = hashWorkSource(input);
  const permissionHash = hashWorkPermissions(input.permissions);
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [lockedWork] = await tx
      .select({ status: work.status })
      .from(work)
      .where(eq(work.id, existing.id))
      .for("update");

    if (!lockedWork) return { kind: "not_found" as const };
    if (lockedWork.status === "archived") return { kind: "archived" as const };

    const [latest] = await tx
      .select({ versionNumber: workVersion.versionNumber })
      .from(workVersion)
      .where(eq(workVersion.workId, existing.id))
      .orderBy(desc(workVersion.versionNumber))
      .limit(1);
    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    await tx.insert(workVersion).values({
      id: versionId,
      workId: existing.id,
      versionNumber,
      title: input.title,
      synopsis: input.synopsis,
      body: input.body,
      permissions: input.permissions,
      sourceHash,
      permissionHash,
      createdAt: now
    });

    if (input.publish) {
      await tx.update(work).set({
        currentVersionId: versionId,
        draftVersionId: null,
        status: "published",
        updatedAt: now,
        publishedAt: now
      }).where(eq(work.id, existing.id));

      await tx.update(contribution).set({
        status: "stale",
        updatedAt: now
      }).where(and(
        eq(contribution.workId, existing.id),
        eq(contribution.status, "pending")
      ));
    } else if (lockedWork.status === "draft") {
      await tx.update(work).set({
        currentVersionId: versionId,
        updatedAt: now
      }).where(eq(work.id, existing.id));
    } else {
      await tx.update(work).set({
        draftVersionId: versionId,
        updatedAt: now
      }).where(eq(work.id, existing.id));
    }

    return {
      kind: "saved" as const,
      versionNumber,
      status: input.publish ? "published" as const : lockedWork.status
    };
  });

  if (result.kind === "not_found") return NextResponse.json({ error: "Work not found." }, { status: 404 });
  if (result.kind === "archived") return NextResponse.json({ error: "Archived works cannot be edited." }, { status: 409 });

  return NextResponse.json({
    work: {
      id: existing.id,
      slug,
      status: result.status,
      versionNumber: result.versionNumber,
      published: input.publish
    },
    hashes: { sourceHash, permissionHash },
    staleContributionsMarked: input.publish,
    onchain: "not_submitted"
  });
}