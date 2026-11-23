import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getAuthEmailDeliveryStatus } from "@/lib/email-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const email = getAuthEmailDeliveryStatus();
  const emailUnconfigured = email === "unconfigured";

  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      status: emailUnconfigured ? "degraded" : "ok",
      database: "ok",
      email
    }, { status: emailUnconfigured ? 503 : 200 });
  } catch {
    return NextResponse.json({
      status: "degraded",
      database: "unavailable",
      email
    }, { status: 503 });
  }
}