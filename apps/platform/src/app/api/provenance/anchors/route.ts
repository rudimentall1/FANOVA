import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { db } from "@/db";
import { linkedWallet, provenanceAnchor, work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { asBytes32Hash, deriveStoryIdentity, FANOVA_CHAIN_ID } from "@/lib/provenance-intent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_000;

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!actor.roles.includes("creator")) return NextResponse.json({ error: "Creator access is required." }, { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid provenance intent." }, { status: 422 });
  }
  const input = payload as Record<string, unknown>;
  if (typeof input.workVersionId !== "string" || input.workVersionId.length < 1 || input.workVersionId.length > 128 ||
      typeof input.idempotencyKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.idempotencyKey)) {
    return NextResponse.json({ error: "A workVersionId and UUIDv4 idempotencyKey are required." }, { status: 422 });
  }

  const contractAddress = process.env.FANOVA_PROVENANCE_CONTRACT;
  if (!contractAddress || !isAddress(contractAddress)) {
    return NextResponse.json({ error: "The Soneium provenance contract is not configured." }, { status: 503 });
  }

  const [wallet] = await db.select({
    address: linkedWallet.address,
    chainId: linkedWallet.chainId
  }).from(linkedWallet).where(and(
    eq(linkedWallet.userId, actor.userId),
    eq(linkedWallet.chainId, FANOVA_CHAIN_ID)
  )).limit(1);
  if (!wallet || !isAddress(wallet.address)) {
    return NextResponse.json({ error: "Link a verified Soneium wallet before creating a provenance intent." }, { status: 409 });
  }

  const result = await db.transaction(async (tx) => {
    const [existingIntent] = await tx.select().from(provenanceAnchor)
      .where(and(
        eq(provenanceAnchor.idempotencyKey, input.idempotencyKey as string),
        eq(provenanceAnchor.actorUserId, actor.userId)
      )).limit(1);
    if (existingIntent) return { kind: "existing" as const, anchor: existingIntent };

    const [version] = await tx.select({
      id: workVersion.id,
      workId: workVersion.workId,
      versionNumber: workVersion.versionNumber,
      sourceHash: workVersion.sourceHash,
      permissionHash: workVersion.permissionHash,
      ownerUserId: work.ownerUserId,
      status: work.status,
      currentVersionId: work.currentVersionId
    }).from(workVersion)
      .innerJoin(work, eq(workVersion.workId, work.id))
      .where(eq(workVersion.id, input.workVersionId as string))
      .for("update", { of: work })
      .limit(1);

    if (!version || version.ownerUserId !== actor.userId) return { kind: "not_found" as const };
    if (version.status !== "published" || version.currentVersionId !== version.id) return { kind: "not_current" as const };
    if (version.versionNumber !== 1) return { kind: "first_version_required" as const };

    const sourceHash = asBytes32Hash(version.sourceHash);
    const permissionHash = asBytes32Hash(version.permissionHash);
    if (!sourceHash || !permissionHash) return { kind: "invalid_hash" as const };

    const [prior] = await tx.select({ id: provenanceAnchor.id })
      .from(provenanceAnchor)
      .where(eq(provenanceAnchor.workVersionId, version.id))
      .limit(1);
    if (prior) return { kind: "already_exists" as const };

    const identity = deriveStoryIdentity(version.workId, wallet.address as Address);
    const now = new Date();
    const [anchor] = await tx.insert(provenanceAnchor).values({
      id: randomUUID(),
      idempotencyKey: input.idempotencyKey as string,
      operationType: "work_version",
      status: "local",
      actorUserId: actor.userId,
      expectedSignerAddress: wallet.address,
      chainId: FANOVA_CHAIN_ID,
      contractAddress,
      workVersionId: version.id,
      sourceHash: version.sourceHash,
      permissionHash: version.permissionHash,
      createdAt: now,
      updatedAt: now
    }).returning({
      id: provenanceAnchor.id,
      status: provenanceAnchor.status,
      expectedSignerAddress: provenanceAnchor.expectedSignerAddress,
      chainId: provenanceAnchor.chainId,
      contractAddress: provenanceAnchor.contractAddress,
      workVersionId: provenanceAnchor.workVersionId,
      createdAt: provenanceAnchor.createdAt
    });

    return {
      kind: "created" as const,
      anchor,
      creatorSalt: identity.creatorSalt,
      storyId: identity.storyId,
      sourceHash,
      permissionHash,
      sourceVersion: version.versionNumber
    };
  });

  if (result.kind === "not_found") return NextResponse.json({ error: "Work version not found." }, { status: 404 });
  if (result.kind === "not_current") return NextResponse.json({ error: "Only the current published version can be anchored." }, { status: 409 });
  if (result.kind === "first_version_required") return NextResponse.json({ error: "The initial story version must be registered first. Later versions require a confirmed preceding anchor." }, { status: 409 });
  if (result.kind === "invalid_hash") return NextResponse.json({ error: "Stored source or permission hash is not a bytes32 SHA-256 digest." }, { status: 422 });
  if (result.kind === "already_exists") return NextResponse.json({ error: "A provenance intent already exists for this work version." }, { status: 409 });

  if (result.kind === "existing") {
    return NextResponse.json({ anchor: result.anchor, status: "LOCAL", idempotent: true });
  }

  return NextResponse.json({
    anchor: result.anchor,
    status: "LOCAL",
    idempotent: false,
    transaction: {
      functionName: "registerStoryVersion",
      args: [result.storyId, result.creatorSalt, BigInt(result.sourceVersion), result.sourceHash, 1n, result.permissionHash].map((value) => typeof value === "bigint" ? value.toString() : value),
      chainId: FANOVA_CHAIN_ID,
      requiresUserSignature: true,
      submitted: false
    }
  }, { status: 201 });
}
