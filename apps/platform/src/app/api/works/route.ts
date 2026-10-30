import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { createWorkSchema } from "@/lib/work-validation";
import { hashWorkPermissions, hashWorkSource } from "@/lib/work-hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim().slice(0, 100);

  const filters = [eq(work.status, "published")];
  if (query) {
    const escapedQuery = query.replace(/[\\%_]/g, "\\  if (query) {
    filters.push(or(
      ilike(workVersion.title, `%${query}%`),
      ilike(workVersion.synopsis, `%${query}%`)
    ) as typeof filters[number]);
  }");
    filters.push(or(
      ilike(workVersion.title, `%${escapedQuery}%`),
      ilike(workVersion.synopsis, `%${escapedQuery}%`)
    ) as typeof filters[number]);
  }

  const rows = await db
    .select({
      slug: work.slug,
      title: workVersion.title,
      synopsis: workVersion.synopsis,
      permissions: workVersion.permissions,
      publishedAt: work.publishedAt,
      versionNumber: workVersion.versionNumber
    })
    .from(work)
    .innerJoin(workVersion, eq(work.currentVersionId, workVersion.id))
    .where(and(...filters))
    .orderBy(desc(work.publishedAt))
    .limit(50);

  return NextResponse.json({ works: rows });
}

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!actor.roles.includes("creator")) {
    return NextResponse.json({ error: "Creator access is required to publish work." }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
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
  const id = randomUUID();
  const versionId = randomUUID();
  const slugBase = input.title.toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "work";
  const slug = `${slugBase}-${id.slice(0, 8)}`;
  const sourceHash = hashWorkSource(input);
  const permissionHash = hashWorkPermissions(input.permissions);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(work).values({
      id,
      ownerUserId: actor.userId,
      slug,
      status: input.publish ? "published" : "draft",
      currentVersionId: versionId,
      createdAt: now,
      updatedAt: now,
      publishedAt: input.publish ? now : null
    });
    await tx.insert(workVersion).values({
      id: versionId,
      workId: id,
      versionNumber: 1,
      title: input.title,
      synopsis: input.synopsis,
      body: input.body,
      permissions: input.permissions,
      sourceHash,
      permissionHash,
      createdAt: now
    });
  });

  return NextResponse.json({
    work: { id, slug, status: input.publish ? "published" : "draft", versionNumber: 1 },
    hashes: { sourceHash, permissionHash },
    onchain: "not_submitted"
  }, { status: 201 });
}