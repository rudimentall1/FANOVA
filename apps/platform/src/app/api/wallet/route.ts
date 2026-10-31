import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { linkedWallet } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const [wallet] = await db.select({
    address: linkedWallet.address,
    chainId: linkedWallet.chainId,
    verifiedAt: linkedWallet.verifiedAt
  }).from(linkedWallet).where(eq(linkedWallet.userId, actor.userId)).limit(1);
  return NextResponse.json({ wallet: wallet ?? null });
}
