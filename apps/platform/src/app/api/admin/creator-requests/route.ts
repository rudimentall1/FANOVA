import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { creatorAccessRequest, user, userProfile } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { canReviewCreatorRequests } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canReviewCreatorRequests(actor)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const requests = await db
    .select({
      id: creatorAccessRequest.id,
      userId: creatorAccessRequest.userId,
      email: user.email,
      displayName: userProfile.displayName,
      handle: userProfile.handle,
      portfolioUrl: creatorAccessRequest.portfolioUrl,
      statement: creatorAccessRequest.statement,
      createdAt: creatorAccessRequest.createdAt
    })
    .from(creatorAccessRequest)
    .innerJoin(user, eq(creatorAccessRequest.userId, user.id))
    .leftJoin(userProfile, eq(creatorAccessRequest.userId, userProfile.userId))
    .where(eq(creatorAccessRequest.status, "pending"))
    .orderBy(asc(creatorAccessRequest.createdAt))
    .limit(100);

  return NextResponse.json({ requests });
}