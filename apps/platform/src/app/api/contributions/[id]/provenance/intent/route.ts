import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { db } from "@/db";
import { contribution, linkedWallet, provenanceAnchor, work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { asBytes32Hash, deriveContributionIdentity, deriveStoryIdentity, FANOVA_CHAIN_ID } from "@/lib/provenance-intent";
import { hashContribution } from "@/lib/contribution-hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2_000;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
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
  if (!payload || typeof payload !== "object" ||
      typeof (payload as Record<string, unknown>).idempotencyKey !== "string" ||
      !UUID_V4_RE.test((payload as Record<string, string>).idempotencyKey)) {
    return NextResponse.json({ error: "A UUIDv4 idempotencyKey is required." }, { status: 422 });
  }

  const { id } = await params;
  if (!id || id.length > 128) return NextResponse.json({ error: "Invalid contribution ID." }, { status: 400 });

  const contractAddress = process.env.FANOVA_PROVENANCE_CONTRACT;
  if (!contractAddress || !isAddress(contractAddress)) {
    return NextResponse.json({ error: "The Soneium provenance contract is not configured." }, { status: 503 });
  }

  const [contributorWallet] = await db.select({
    address: linkedWallet.address,
    verifiedAt: linkedWallet.verifiedAt
  }).from(linkedWallet).where(and(
    eq(linkedWallet.userId, actor.userId),
    eq(linkedWallet.chainId, FANOVA_CHAIN_ID)
  )).limit(1);
  if (!contributorWallet || !isAddress(contributorWallet.address)) {
    return NextResponse.json({ error: "Link and verify your Soneium wallet before registering a contribution." }, { status: 409 });
  }

  const idempotencyKey = (payload as { idempotencyKey: string }).idempotencyKey;
  const result = await db.transaction(async (tx) => {
    const [existingIntent] = await tx.select().from(provenanceAnchor)
      .where(eq(provenanceAnchor.idempotencyKey, idempotencyKey))
      .limit(1);
    if (existingIntent && existingIntent.actorUserId !== actor.userId) {
      return { kind: "key_conflict" as const };
    }

    const [identity] = await tx.select({ workId: contribution.workId })
      .from(contribution)
      .where(eq(contribution.id, id))
      .limit(1);
    if (!identity) return { kind: "not_found" as const };

    // Lock order matches publication and creator review: work, then contribution.
    const [sourceWork] = await tx.select({
      id: work.id,
      ownerUserId: work.ownerUserId,
      status: work.status,
      currentVersionId: work.currentVersionId
    }).from(work).where(eq(work.id, identity.workId)).for("update");
    if (!sourceWork) return { kind: "not_found" as const };
    if (sourceWork.ownerUserId === actor.userId) return { kind: "own_work" as const };

    const [entry] = await tx.select({
      id: contribution.id,
      workId: contribution.workId,
      sourceVersionId: contribution.sourceVersionId,
      contributorUserId: contribution.contributorUserId,
      type: contribution.type,
      commercialIntent: contribution.commercialIntent,
      title: contribution.title,
      content: contribution.content,
      contentHash: contribution.contentHash,
      acknowledgedPermissionHash: contribution.acknowledgedPermissionHash,
      status: contribution.status
    }).from(contribution).where(eq(contribution.id, id)).for("update");
    if (!entry || entry.contributorUserId !== actor.userId) return { kind: "not_found" as const };
    if (entry.status === "stale") return { kind: "stale" as const };
    if (sourceWork.status !== "published" || sourceWork.currentVersionId !== entry.sourceVersionId) {
      return { kind: "stale" as const };
    }

    const [sourceVersion] = await tx.select({
      id: workVersion.id,
      versionNumber: workVersion.versionNumber,
      sourceHash: workVersion.sourceHash,
      permissionHash: workVersion.permissionHash
    }).from(workVersion).where(eq(workVersion.id, entry.sourceVersionId)).limit(1);
    if (!sourceVersion) return { kind: "not_found" as const };

    const contentHash = hashContribution({
      type: entry.type,
      title: entry.title,
      content: entry.content,
      commercialIntent: entry.commercialIntent
    });
    if (contentHash !== entry.contentHash) return { kind: "content_hash_mismatch" as const };
    if (entry.acknowledgedPermissionHash !== sourceVersion.permissionHash) return { kind: "permission_hash_mismatch" as const };

    const sourceHash = asBytes32Hash(sourceVersion.sourceHash);
    const permissionHash = asBytes32Hash(entry.acknowledgedPermissionHash);
    const contributionHash = asBytes32Hash(entry.contentHash);
    if (!sourceHash || !permissionHash || !contributionHash) return { kind: "invalid_hash" as const };

    const [creatorWallet] = await tx.select({
      address: linkedWallet.address,
      verifiedAt: linkedWallet.verifiedAt
    }).from(linkedWallet).where(and(
      eq(linkedWallet.userId, sourceWork.ownerUserId),
      eq(linkedWallet.chainId, FANOVA_CHAIN_ID)
    )).limit(1);
    if (!creatorWallet || !isAddress(creatorWallet.address)) return { kind: "creator_wallet_missing" as const };

    const storyAnchors = await tx.select().from(provenanceAnchor)
      .where(and(
        eq(provenanceAnchor.workVersionId, sourceVersion.id),
        eq(provenanceAnchor.operationType, "work_version")
      ));
    if (storyAnchors.length !== 1) return { kind: "story_anchor_required" as const };
    const storyAnchor = storyAnchors[0];
    const storySnapshot = storyAnchor.verificationSnapshot;
    const sourceVersionNumber = storySnapshot?.sourceVersion ??
      (sourceVersion.versionNumber === 1 ? 1 : null);
    const permissionVersion = storySnapshot?.permissionVersion ??
      (sourceVersion.versionNumber === 1 ? 1 : null);

    if (
      storyAnchor.status !== "mainnet" ||
      storyAnchor.chainId !== FANOVA_CHAIN_ID ||
      storyAnchor.contractAddress.toLowerCase() !== contractAddress.toLowerCase() ||
      storyAnchor.expectedSignerAddress.toLowerCase() !== creatorWallet.address.toLowerCase() ||
      !storyAnchor.transactionHash ||
      storyAnchor.eventName !== "StoryVersionRegistered" ||
      !storyAnchor.verifiedAt ||
      storyAnchor.sourceHash !== sourceVersion.sourceHash ||
      storyAnchor.permissionHash !== sourceVersion.permissionHash ||
      !storySnapshot ||
      storySnapshot.chainId !== FANOVA_CHAIN_ID ||
      storySnapshot.contractAddress.toLowerCase() !== contractAddress.toLowerCase() ||
      !Number.isSafeInteger(sourceVersionNumber) || !sourceVersionNumber ||
      !Number.isSafeInteger(permissionVersion) || !permissionVersion
    ) {
      return { kind: "story_anchor_required" as const };
    }

    const story = deriveStoryIdentity(entry.workId, creatorWallet.address as Address);
    const contributionIdentity = deriveContributionIdentity(entry.id);

    if (existingIntent) {
      if (
        existingIntent.operationType !== "contribution" ||
        existingIntent.contributionId !== entry.id ||
        existingIntent.contributionHash !== entry.contentHash ||
        existingIntent.permissionHash !== entry.acknowledgedPermissionHash ||
        existingIntent.expectedSignerAddress.toLowerCase() !== contributorWallet.address.toLowerCase() ||
        existingIntent.contractAddress.toLowerCase() !== contractAddress.toLowerCase() ||
        existingIntent.chainId !== FANOVA_CHAIN_ID
      ) {
        return { kind: "intent_mismatch" as const };
      }
      return {
        kind: "existing" as const,
        anchor: existingIntent,
        contributionIdentity,
        storyId: story.storyId,
        sourceVersion: sourceVersionNumber,
        permissionVersion,
        permissionHash,
        contributionHash
      };
    }

    const [prior] = await tx.select({ id: provenanceAnchor.id })
      .from(provenanceAnchor)
      .where(eq(provenanceAnchor.contributionId, entry.id))
      .limit(1);
    if (prior) return { kind: "already_exists" as const };

    const now = new Date();
    const [anchor] = await tx.insert(provenanceAnchor).values({
      id: randomUUID(),
      idempotencyKey,
      operationType: "contribution",
      status: "local",
      actorUserId: actor.userId,
      expectedSignerAddress: contributorWallet.address,
      chainId: FANOVA_CHAIN_ID,
      contractAddress,
      contributionId: entry.id,
      sourceHash: sourceVersion.sourceHash,
      permissionHash: entry.acknowledgedPermissionHash,
      contributionHash: entry.contentHash,
      createdAt: now,
      updatedAt: now
    }).returning({
      id: provenanceAnchor.id,
      status: provenanceAnchor.status,
      expectedSignerAddress: provenanceAnchor.expectedSignerAddress,
      chainId: provenanceAnchor.chainId,
      contractAddress: provenanceAnchor.contractAddress,
      contributionId: provenanceAnchor.contributionId,
      createdAt: provenanceAnchor.createdAt
    });

    return {
      kind: "created" as const,
      anchor,
      contributionIdentity,
      storyId: story.storyId,
      sourceVersion: sourceVersionNumber,
      permissionVersion,
      permissionHash,
      contributionHash
    };
  });

  if (result.kind === "key_conflict") return NextResponse.json({ error: "This idempotency key is already bound to another provenance request." }, { status: 409 });
  if (result.kind === "intent_mismatch") return NextResponse.json({ error: "The original contribution intent no longer matches the contributor wallet, contract, or stored hashes." }, { status: 409 });
  if (result.kind === "not_found") return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
  if (result.kind === "own_work") return NextResponse.json({ error: "Creators cannot register a fan contribution to their own work." }, { status: 409 });
    if (result.kind === "stale") return NextResponse.json({ error: "This contribution references an older story version and cannot be registered." }, { status: 409 });
  if (result.kind === "content_hash_mismatch") return NextResponse.json({ error: "The stored contribution content no longer matches its submission hash." }, { status: 409 });
  if (result.kind === "permission_hash_mismatch") return NextResponse.json({ error: "The contribution's acknowledged permissions do not match its source version." }, { status: 409 });
  if (result.kind === "invalid_hash") return NextResponse.json({ error: "A stored contribution or permission hash is not a bytes32 SHA-256 digest." }, { status: 422 });
  if (result.kind === "creator_wallet_missing") return NextResponse.json({ error: "The creator has not linked a verified Soneium wallet." }, { status: 409 });
  if (result.kind === "story_anchor_required") return NextResponse.json({ error: "The exact source story version must have one confirmed Mainnet provenance anchor before a fan contribution can be registered." }, { status: 409 });
  if (result.kind === "already_exists") return NextResponse.json({ error: "A provenance intent already exists for this contribution." }, { status: 409 });

  return NextResponse.json({
    anchor: result.anchor,
    status: "LOCAL",
    idempotent: result.kind === "existing",
    transaction: {
      functionName: "registerContribution",
      args: [
        result.contributionIdentity,
        result.storyId,
        BigInt(result.sourceVersion),
        BigInt(result.permissionVersion),
        result.permissionHash,
        result.contributionHash,
        true
      ].map((value) => typeof value === "bigint" ? value.toString() : value),
      sourceVersion: result.sourceVersion,
      permissionVersion: result.permissionVersion,
      chainId: FANOVA_CHAIN_ID,
      requiresUserSignature: true,
      submitted: false
    }
  }, { status: result.kind === "existing" ? 200 : 201 });
}
