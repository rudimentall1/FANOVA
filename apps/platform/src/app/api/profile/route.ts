import { NextResponse } from "next/server";
import { db } from "@/db";
import { userProfile } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { updateProfileSchema } from "@/lib/profile-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  let payload: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 8_000) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = updateProfileSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({
      error: "Profile details are invalid.",
      fields: parsed.error.flatten().fieldErrors
    }, { status: 422 });
  }

  const input = parsed.data;
  try {
    const [profile] = await db.insert(userProfile).values({
      userId: actor.userId,
      handle: input.handle,
      displayName: input.displayName,
      bio: input.bio || null,
      isPublic: input.isPublic,
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: userProfile.userId,
      set: {
        handle: input.handle,
        displayName: input.displayName,
        bio: input.bio || null,
        isPublic: input.isPublic,
        updatedAt: new Date()
      }
    }).returning({
      handle: userProfile.handle,
      displayName: userProfile.displayName,
      bio: userProfile.bio,
      isPublic: userProfile.isPublic
    });

    return NextResponse.json({ profile });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "That public handle is already in use." }, { status: 409 });
    }
    throw error;
  }
}
