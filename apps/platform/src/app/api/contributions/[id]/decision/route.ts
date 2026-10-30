import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { contribution, work } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { canManageOwnWork } from "@/lib/authz";
import { contributionDecisionSchema } from "@/lib/contribution-validation";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!actor.roles.includes("creator")) return NextResponse.json({ error: "Creator access required." }, { status: 403 });

  const { id } = await params;
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  let payload: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 4_000) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = contributionDecisionSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Decision details are invalid." }, { status: 422 });

  const result = await db.transaction(async (tx) => {
    const [identity] = await tx
      .select({ workId: contribution.workId })
      .from(contribution)
      .where(eq(contribution.id, id))
      .limit(1);

    if (!identity) return { kind: "not_found" as const };

    // Lock in the same order as version publication: work first, contribution second.
    const [sourceWork] = await tx
      .select({
        ownerUserId: work.ownerUserId,
        currentVersionId: work.currentVersionId
      })
      .from(work)
      .where(eq(work.id, identity.workId))
      .for("update");

    if (!sourceWork || !canManageOwnWork(actor, sourceWork.ownerUserId)) {
      return { kind: "not_found" as const };
    }

    const [row] = await tx
      .select({
        status: contribution.status,
        sourceVersionId: contribution.sourceVersionId
      })
      .from(contribution)
      .where(eq(contribution.id, id))
      .for("update");

    if (!row) return { kind: "not_found" as const };
    if (row.status !== "pending") return { kind: "already_reviewed" as const };

    if (row.sourceVersionId !== sourceWork.currentVersionId) {
      await tx.update(contribution).set({
        status: "stale",
        updatedAt: new Date()
      }).where(and(eq(contribution.id, id), eq(contribution.status, "pending")));
      return { kind: "stale" as const };
    }

    const now = new Date();
    const status = parsed.data.decision === "approve" ? "approved" : "rejected";
    const [updated] = await tx.update(contribution).set({
      status,
      creatorFeedback: parsed.data.feedback || null,
      isPublic: status === "approved" && parsed.data.makePublic,
      decidedBy: actor.userId,
      decidedAt: now,
      updatedAt: now
    }).where(and(
      eq(contribution.id, id),
      eq(contribution.status, "pending"),
      eq(contribution.sourceVersionId, sourceWork.currentVersionId ?? "")
    )).returning({ id: contribution.id });

    return updated ? { kind: "decided" as const, status } : { kind: "already_reviewed" as const };
  });

  if (result.kind === "not_found") return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
  if (result.kind === "already_reviewed") return NextResponse.json({ error: "This contribution has already been reviewed." }, { status: 409 });
  if (result.kind === "stale") return NextResponse.json({ error: "The source work has changed. This contribution is now stale." }, { status: 409 });
  return NextResponse.json({ contribution: { id, status: result.status } });
}