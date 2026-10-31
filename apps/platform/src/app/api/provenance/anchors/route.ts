import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { db } from "@/db";
import { linkedWallet, provenanceAnchor, work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import {
  asBytes32Hash,
  deriveStoryIdentity,
  FANOVA_CHAIN_ID,
  nextPermissionVersion
} from "@/lib/provenance-intent";

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
      .where(eq(provenanceAnchor.idempotencyKey, input.idempotencyKey as string))
      .limit(1);
    if (existingIntent && existingIntent.actorUserId !== actor.userId) {
      return { kind: "key_conflict" as const };
    }

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

    const sourceHash = asBytes32Hash(version.sourceHash);
    const permissionHash = asBytes32Hash(version.permissionHash);
    if (!sourceHash || !permissionHash) return { kind: "invalid_hash" as const };

    let permissionVersion = 1;
    if (version.versionNumber > 1) {
      const previousRows = await tx.select({
        status: provenanceAnchor.status,
        chainId: provenanceAnchor.chainId,
        contractAddress: provenanceAnchor.contractAddress,
        expectedSignerAddress: provenanceAnchor.expectedSignerAddress,
        sourceHash: provenanceAnchor.sourceHash,
        permissionHash: provenanceAnchor.permissionHash,
        transactionHash: provenanceAnchor.transactionHash,
        eventName: provenanceAnchor.eventName,
        verifiedAt: provenanceAnchor.verifiedAt,
        verificationSnapshot: provenanceAnchor.verificationSnapshot,
        versionSourceHash: workVersion.sourceHash,
        versionPermissionHash: workVersion.permissionHash
      }).from(workVersion)
        .innerJoin(provenanceAnchor, eq(provenanceAnchor.workVersionId, workVersion.id))
        .where(and(
          eq(workVersion.workId, version.workId),
          eq(workVersion.versionNumber, version.versionNumber - 1)
        ));

      if (previousRows.length !== 1) return { kind: "previous_anchor_required" as const };
      const previous = previousRows[0];
      const previousSnapshot = previous.verificationSnapshot;
      const previousPermissionVersion = previousSnapshot?.permissionVersion ??
        (version.versionNumber - 1 === 1 ? 1 : null);

      if (
        previous.status !== "mainnet" ||
        previous.chainId !== FANOVA_CHAIN_ID ||
        previous.contractAddress.toLowerCase() !== contractAddress.toLowerCase() ||
        previous.expectedSignerAddress.toLowerCase() !== wallet.address.toLowerCase() ||
        !previous.transactionHash ||
        previous.eventName !== "StoryVersionRegistered" ||
        !previous.verifiedAt ||
        previous.sourceHash !== previous.versionSourceHash ||
        previous.permissionHash !== previous.versionPermissionHash ||
        !previousSnapshot ||
        previousSnapshot.chainId !== FANOVA_CHAIN_ID ||
        previousSnapshot.contractAddress.toLowerCase() !== contractAddress.toLowerCase()
      ) {
        return { kind: "previous_anchor_required" as const };
      }

      const next = nextPermissionVersion(
        version.permissionHash,
        previous.permissionHash ?? "",
        previousPermissionVersion ?? Number.NaN
      );
      if (next === null) return { kind: "previous_anchor_required" as const };
      permissionVersion = next;
    }

    const identity = deriveStoryIdentity(version.workId, wallet.address as Address);
    if (existingIntent) {
      if (existingIntent.workVersionId !== version.id) return { kind: "key_conflict" as const };
      if (
        existingIntent.expectedSignerAddress.toLowerCase() !== wallet.address.toLowerCase() ||
        existingIntent.chainId !== FANOVA_CHAIN_ID ||
        existingIntent.contractAddress.toLowerCase() !== contractAddress.toLowerCase() ||
        existingIntent.sourceHash !== version.sourceHash ||
        existingIntent.permissionHash !== version.permissionHash
      ) {
        return { kind: "intent_mismatch" as const };
      }
      return {
        kind: "existing" as const,
        anchor: existingIntent,
        creatorSalt: identity.creatorSalt,
        storyId: identity.storyId,
        sourceHash,
        permissionHash,
        sourceVersion: version.versionNumber,
        permissionVersion
      };
    }

    const [prior] = await tx.select({ id: provenanceAnchor.id })
      .from(provenanceAnchor)
      .where(eq(provenanceAnchor.workVersionId, version.id))
      .limit(1);
    if (prior) return { kind: "already_exists" as const };

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
      sourceVersion: version.versionNumber,
      permissionVersion
    };
  });

  if (result.kind === "key_conflict") return NextResponse.json({ error: "This idempotency key is already bound to another provenance request." }, { status: 409 });
  if (result.kind === "intent_mismatch") return NextResponse.json({ error: "The original provenance intent no longer matches the linked wallet, contract configuration, or published hashes. Create a new intent after reviewing the change." }, { status: 409 });
  if (result.kind === "not_found") return NextResponse.json({ error: "Work version not found." }, { status: 404 });
  if (result.kind === "not_current") return NextResponse.json({ error: "Only the current published version can be anchored." }, { status: 409 });
  if (result.kind === "previous_anchor_required") return NextResponse.json({ error: "The immediately preceding story version must have one confirmed Mainnet anchor from the same creator wallet and contract before this version can be registered." }, { status: 409 });
  if (result.kind === "invalid_hash") return NextResponse.json({ error: "Stored source or permission hash is not a bytes32 SHA-256 digest." }, { status: 422 });
  if (result.kind === "already_exists") return NextResponse.json({ error: "A provenance intent already exists for this work version." }, { status: 409 });

  const response = {
    anchor: result.anchor,
    status: "LOCAL",
    idempotent: result.kind === "existing",
    transaction: {
      functionName: "registerStoryVersion",
      args: [
        result.storyId,
        result.creatorSalt,
        BigInt(result.sourceVersion),
        result.sourceHash,
        BigInt(result.permissionVersion),
        result.permissionHash
      ].map((value) => typeof value === "bigint" ? value.toString() : value),
      chainId: FANOVA_CHAIN_ID,
      requiresUserSignature: true,
      submitted: false
    }
  };
  return NextResponse.json(response, { status: result.kind === "existing" ? 200 : 201 });
}
