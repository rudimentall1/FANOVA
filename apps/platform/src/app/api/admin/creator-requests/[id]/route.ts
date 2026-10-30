import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { creatorAccessRequest, userRole } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { canReviewCreatorRequests } from "@/lib/authz";
import { creatorDecisionSchema } from "@/lib/creator-request-validation";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canReviewCreatorRequests(actor)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const { id } = await params;
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  let payload: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 2_000) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = creatorDecisionSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Decision must be approve or reject." }, { status: 422 });

  const decision = parsed.data.decision === "approve" ? "approved" : "rejected";
  const now = new Date();

  const updated = await db.transaction(async (tx) => {
    const [requestRow] = await tx.update(creatorAccessRequest).set({
      status: decision,
      reviewedBy: actor.userId,
      reviewedAt: now,
      updatedAt: now
    }).where(and(
      eq(creatorAccessRequest.id, id),
      eq(creatorAccessRequest.status, "pending")
    )).returning({
      id: creatorAccessRequest.id,
      userId: creatorAccessRequest.userId
    });

    if (!requestRow) return null;

    if (decision === "approved") {
      await tx.insert(userRole).values({
        id: randomUUID(),
        userId: requestRow.userId,
        role: "creator",
        assignedBy: actor.userId
      }).onConflictDoNothing();
    }

    return requestRow;
  });

  if (!updated) return NextResponse.json({ error: "Pending creator request not found or already reviewed." }, { status: 409 });
  return NextResponse.json({ request: { id: updated.id, status: decision } });
}