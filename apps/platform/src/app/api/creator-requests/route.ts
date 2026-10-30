import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { creatorAccessRequest } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { creatorRequestSchema } from "@/lib/creator-request-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const requests = await db
    .select({
      id: creatorAccessRequest.id,
      portfolioUrl: creatorAccessRequest.portfolioUrl,
      statement: creatorAccessRequest.statement,
      status: creatorAccessRequest.status,
      createdAt: creatorAccessRequest.createdAt,
      reviewedAt: creatorAccessRequest.reviewedAt
    })
    .from(creatorAccessRequest)
    .where(eq(creatorAccessRequest.userId, actor.userId))
    .orderBy(desc(creatorAccessRequest.createdAt))
    .limit(10);

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (actor.roles.includes("creator")) {
    return NextResponse.json({ error: "This account already has creator access." }, { status: 409 });
  }

  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  let payload: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 12_000) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = creatorRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({
      error: "Creator application details are invalid.",
      fields: parsed.error.flatten().fieldErrors
    }, { status: 422 });
  }

  const [pending] = await db
    .select({ id: creatorAccessRequest.id })
    .from(creatorAccessRequest)
    .where(and(
      eq(creatorAccessRequest.userId, actor.userId),
      eq(creatorAccessRequest.status, "pending")
    ))
    .limit(1);

  if (pending) return NextResponse.json({ error: "You already have a pending creator application." }, { status: 409 });

  const id = randomUUID();
  await db.insert(creatorAccessRequest).values({
    id,
    userId: actor.userId,
    portfolioUrl: parsed.data.portfolioUrl || null,
    statement: parsed.data.statement,
    status: "pending"
  });

  return NextResponse.json({ request: { id, status: "pending" } }, { status: 201 });
}