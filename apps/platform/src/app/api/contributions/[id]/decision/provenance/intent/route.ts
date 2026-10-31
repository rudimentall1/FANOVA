import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAddress, keccak256, toBytes, type Address } from "viem";
import { db } from "@/db";
import { contribution, linkedWallet, provenanceAnchor, work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { deriveContributionIdentity, deriveStoryIdentity, FANOVA_CHAIN_ID } from "@/lib/provenance-intent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!actor.roles.includes("creator")) return NextResponse.json({ error: "Creator access required." }, { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 2_000) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
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

  const idempotencyKey = (payload as { idempotencyKey: string }).idempotencyKey;
  const result = await db.transaction(async (tx) => {
    const [existingByKey] = await tx.select().from(provenanceAnchor)
      .where(eq(provenanceAnchor.idempotencyKey, idempotencyKey)).limit(1);
    if (existingByKey && existingByKey.actorUserId !== actor.userId) return { kind: "key_conflict" as const };

    const [identity] = await tx.select({ workId: contribution.workId })
      .from(contribution).where(eq(contribution.id, id)).limit(1);
    if (!identity) return { kind: "not_found" as const };

    const [sourceWork] = await tx.select({
      ownerUserId: work.ownerUserId,
      currentVersionId: work.currentVersionId,
      status: work.status
    }).from(work).where(eq(work.id, identity.workId)).for("update");
    if (!sourceWork || sourceWork.ownerUserId !== actor.userId) return { kind: "not_found" as const };

    const [entry] = await tx.select({
      id: contribution.id,
      workId: contribution.workId,
      sourceVersionId: contribution.sourceVersionId,
      contributorUserId: contribution.contributorUserId,
      status: contribution.status,
      decidedBy: contribution.decidedBy,
      creatorFeedback: contribution.creatorFeedback,
      contentHash: contribution.contentHash,
      acknowledgedPermissionHash: contribution.acknowledgedPermissionHash
    }).from(contribution).where(eq(contribution.id, id)).for("update");
    if (!entry) return { kind: "not_found" as const };
    if (entry.status !== "approved" && entry.status !== "rejected") return { kind: "not_decided" as const };
    if (entry.decidedBy !== actor.userId) return { kind: "not_found" as const };
    if (sourceWork.status !== "published" || sourceWork.currentVersionId !== entry.sourceVersionId) return { kind: "stale" as const };

    const [version] = await tx.select({
      id: workVersion.id,
      versionNumber: workVersion.versionNumber,
      sourceHash: workVersion.sourceHash,
      permissionHash: workVersion.permissionHash
    }).from(workVersion).where(eq(workVersion.id, entry.sourceVersionId)).limit(1);
    if (!version) return { kind: "not_found" as const };

    const [creatorWallet] = await tx.select({ address: linkedWallet.address })
      .from(linkedWallet).where(and(
        eq(linkedWallet.userId, actor.userId),
        eq(linkedWallet.chainId, FANOVA_CHAIN_ID)
      )).limit(1);
    if (!creatorWallet || !isAddress(creatorWallet.address)) return { kind: "creator_wallet_missing" as const };

    const [storyAnchor] = await tx.select().from(provenanceAnchor).where(and(
      eq(provenanceAnchor.workVersionId, version.id),
      eq(provenanceAnchor.operationType, "work_version")
    )).limit(1);
    const storySnapshot = storyAnchor?.verificationSnapshot;
    const sourceVersion = storySnapshot?.sourceVersion ?? (version.versionNumber === 1 ? 1 : null);
    const permissionVersion = storySnapshot?.permissionVersion ?? (version.versionNumber === 1 ? 1 : null);
    if (!storyAnchor || storyAnchor.status !== "mainnet" || storyAnchor.chainId !== FANOVA_CHAIN_ID ||
        storyAnchor.contractAddress.toLowerCase() !== contractAddress.toLowerCase() ||
        storyAnchor.expectedSignerAddress.toLowerCase() !== creatorWallet.address.toLowerCase() ||
        !storyAnchor.transactionHash || storyAnchor.eventName !== "StoryVersionRegistered" || !storyAnchor.verifiedAt ||
        storyAnchor.sourceHash !== version.sourceHash || storyAnchor.permissionHash !== version.permissionHash ||
        !storySnapshot || storySnapshot.chainId !== FANOVA_CHAIN_ID ||
        storySnapshot.contractAddress.toLowerCase() !== contractAddress.toLowerCase() ||
        !Number.isSafeInteger(sourceVersion) || !sourceVersion || sourceVersion < 1 ||
        !Number.isSafeInteger(permissionVersion) || !permissionVersion || permissionVersion < 1) {
      return { kind: "story_anchor_required" as const };
    }

    const [contributionAnchor] = await tx.select().from(provenanceAnchor).where(and(
      eq(provenanceAnchor.contributionId, entry.id),
      eq(provenanceAnchor.operationType, "contribution")
    )).limit(1);
    if (!contributionAnchor || contributionAnchor.status !== "mainnet" ||
        contributionAnchor.chainId !== FANOVA_CHAIN_ID ||
        contributionAnchor.contractAddress.toLowerCase() !== contractAddress.toLowerCase() ||
        !contributionAnchor.transactionHash || contributionAnchor.eventName !== "ContributionRegistered" ||
        !contributionAnchor.verifiedAt || contributionAnchor.contributionHash !== entry.contentHash ||
        contributionAnchor.permissionHash !== entry.acknowledgedPermissionHash) {
      return { kind: "contribution_anchor_required" as const };
    }

    const [contributorWallet] = await tx.select({ address: linkedWallet.address })
      .from(linkedWallet).where(and(
        eq(linkedWallet.userId, entry.contributorUserId),
        eq(linkedWallet.chainId, FANOVA_CHAIN_ID)
      )).limit(1);
    if (!contributorWallet || !isAddress(contributorWallet.address) ||
        contributionAnchor.expectedSignerAddress.toLowerCase() !== contributorWallet.address.toLowerCase()) {
      return { kind: "contribution_anchor_required" as const };
    }

    const decisionApproved = entry.status === "approved";
    const reasonCode = keccak256(toBytes(entry.creatorFeedback ?? ""));
    const contributionIdentity = deriveContributionIdentity(entry.id);
    const expectedSnapshot = {
      decisionApproved,
      decisionReasonCode: reasonCode
    };

    if (existingByKey) {
      const snapshot = existingByKey.verificationSnapshot;
      if (existingByKey.operationType !== "creator_decision" ||
          existingByKey.contributionId !== entry.id ||
          existingByKey.expectedSignerAddress.toLowerCase() !== creatorWallet.address.toLowerCase() ||
          existingByKey.contractAddress.toLowerCase() !== contractAddress.toLowerCase() ||
          existingByKey.chainId !== FANOVA_CHAIN_ID ||
          snapshot?.decisionApproved !== decisionApproved ||
          snapshot?.decisionReasonCode?.toLowerCase() !== reasonCode.toLowerCase()) {
        return { kind: "intent_mismatch" as const };
      }
      return { kind: "existing" as const, anchor: existingByKey, contributionIdentity, decisionApproved, reasonCode };
    }

    const [prior] = await tx.select().from(provenanceAnchor).where(and(
      eq(provenanceAnchor.contributionId, entry.id),
      eq(provenanceAnchor.operationType, "creator_decision")
    )).limit(1);
    if (prior) return { kind: "already_exists" as const };

    const now = new Date();
    const [anchor] = await tx.insert(provenanceAnchor).values({
      id: randomUUID(),
      idempotencyKey,
      operationType: "creator_decision",
      status: "local",
      actorUserId: actor.userId,
      expectedSignerAddress: creatorWallet.address,
      chainId: FANOVA_CHAIN_ID,
      contractAddress,
      contributionId: entry.id,
      sourceHash: version.sourceHash,
      permissionHash: entry.acknowledgedPermissionHash,
      contributionHash: entry.contentHash,
      verificationSnapshot: { checkedAt: now.toISOString(), chainId: FANOVA_CHAIN_ID, contractAddress, expectedSigner: creatorWallet.address, expectedEntityId: contributionIdentity, ...expectedSnapshot },
      createdAt: now,
      updatedAt: now
    }).returning();
    return { kind: "created" as const, anchor, contributionIdentity, decisionApproved, reasonCode };
  });

  if (result.kind === "key_conflict") return NextResponse.json({ error: "This idempotency key is already bound to another provenance request." }, { status: 409 });
  if (result.kind === "intent_mismatch") return NextResponse.json({ error: "The original creator decision intent no longer matches the stored decision or creator wallet." }, { status: 409 });
  if (result.kind === "already_exists") return NextResponse.json({ error: "A creator decision provenance intent already exists for this contribution." }, { status: 409 });
  if (result.kind === "not_found") return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
  if (result.kind === "not_decided") return NextResponse.json({ error: "The contribution must be approved or rejected before recording its onchain decision." }, { status: 409 });
  if (result.kind === "stale") return NextResponse.json({ error: "The contribution references an older story version." }, { status: 409 });
  if (result.kind === "creator_wallet_missing") return NextResponse.json({ error: "Link and verify the creator's Soneium wallet first." }, { status: 409 });
  if (result.kind === "story_anchor_required") return NextResponse.json({ error: "The exact source story version must have a confirmed Mainnet provenance anchor." }, { status: 409 });
  if (result.kind === "contribution_anchor_required") return NextResponse.json({ error: "The contributor must first register this contribution on Soneium." }, { status: 409 });

  return NextResponse.json({
    anchor: {
      id: result.anchor.id,
      status: result.anchor.status,
      expectedSignerAddress: result.anchor.expectedSignerAddress,
      chainId: result.anchor.chainId,
      contractAddress: result.anchor.contractAddress,
      transactionHash: result.anchor.transactionHash
    },
    transaction: {
      args: [result.contributionIdentity, result.decisionApproved, result.reasonCode]
    }
  });
}
