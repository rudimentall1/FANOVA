import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createPublicClient, decodeEventLog, http, isAddress, keccak256, toBytes, type Address, type Hex } from "viem";
import { db } from "@/db";
import { contribution, linkedWallet, provenanceAnchor, work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import { deriveContributionIdentity, deriveStoryIdentity, FANOVA_CHAIN_ID } from "@/lib/provenance-intent";
import { CREATOR_DECISION_ABI, matchesCreatorDecisionCall, matchesCreatorDecisionEvent } from "@/lib/provenance-submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const publicClient = createPublicClient({
  transport: http(process.env.SONEIUM_RPC_URL || "https://rpc.soneium.org/")
});

function sameHex(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!actor.roles.includes("creator")) return NextResponse.json({ error: "Creator access required." }, { status: 403 });
  const { id } = await params;
  if (!id || id.length > 128) return NextResponse.json({ error: "Invalid contribution ID." }, { status: 400 });
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
  if (!payload || typeof payload !== "object" || typeof (payload as Record<string, unknown>).transactionHash !== "string" ||
      !TX_HASH_RE.test((payload as Record<string, string>).transactionHash)) {
    return NextResponse.json({ error: "A valid transactionHash is required." }, { status: 422 });
  }
  const transactionHash = (payload as { transactionHash: Hex }).transactionHash.toLowerCase() as Hex;

  const [row] = await db.select({
    anchor: provenanceAnchor,
    contributionId: contribution.id,
    workId: contribution.workId,
    sourceVersionId: contribution.sourceVersionId,
    contributorUserId: contribution.contributorUserId,
    status: contribution.status,
    decidedBy: contribution.decidedBy,
    creatorFeedback: contribution.creatorFeedback,
    contentHash: contribution.contentHash,
    acknowledgedPermissionHash: contribution.acknowledgedPermissionHash,
    versionNumber: workVersion.versionNumber,
    sourceHash: workVersion.sourceHash,
    permissionHash: workVersion.permissionHash,
    ownerUserId: work.ownerUserId,
    currentVersionId: work.currentVersionId,
    workStatus: work.status
  }).from(provenanceAnchor)
    .innerJoin(contribution, eq(provenanceAnchor.contributionId, contribution.id))
    .innerJoin(workVersion, eq(contribution.sourceVersionId, workVersion.id))
    .innerJoin(work, eq(contribution.workId, work.id))
    .where(and(
      eq(provenanceAnchor.contributionId, id),
      eq(provenanceAnchor.operationType, "creator_decision"),
      eq(provenanceAnchor.actorUserId, actor.userId),
      eq(contribution.decidedBy, actor.userId),
      eq(work.ownerUserId, actor.userId)
    )).limit(1);

  if (!row) return NextResponse.json({ error: "Creator decision provenance intent not found." }, { status: 404 });
  if (row.anchor.chainId !== FANOVA_CHAIN_ID || !isAddress(row.anchor.contractAddress) ||
      !isAddress(row.anchor.expectedSignerAddress)) {
    return NextResponse.json({ error: "This is not a supported Soneium creator decision intent." }, { status: 409 });
  }
  if (row.status !== "approved" && row.status !== "rejected") {
    return NextResponse.json({ error: "The contribution has no final creator decision." }, { status: 409 });
  }
  if (row.workStatus !== "published" || row.currentVersionId !== row.sourceVersionId) {
    return NextResponse.json({ error: "The contribution's source version is no longer current." }, { status: 409 });
  }
  if (row.anchor.transactionHash && !sameHex(row.anchor.transactionHash, transactionHash)) {
    return NextResponse.json({ error: "A different transaction hash is already bound to this decision intent." }, { status: 409 });
  }
  if (!row.anchor.transactionHash) {
    const now = new Date();
    await db.update(provenanceAnchor).set({ transactionHash, status: "pending", submittedAt: now, updatedAt: now })
      .where(and(eq(provenanceAnchor.id, row.anchor.id), eq(provenanceAnchor.actorUserId, actor.userId), isNull(provenanceAnchor.transactionHash)));
    const [bound] = await db.select({ transactionHash: provenanceAnchor.transactionHash })
      .from(provenanceAnchor).where(eq(provenanceAnchor.id, row.anchor.id)).limit(1);
    if (!bound?.transactionHash || !sameHex(bound.transactionHash, transactionHash)) {
      return NextResponse.json({ error: "A different transaction hash was concurrently bound to this decision intent." }, { status: 409 });
    }
  }

  const fail = async (failureCode: string, message: string) => {
    await db.update(provenanceAnchor).set({
      status: "failed",
      verificationSnapshot: {
        ...(row.anchor.verificationSnapshot ?? {}),
        checkedAt: new Date().toISOString(),
        chainId: FANOVA_CHAIN_ID,
        contractAddress: row.anchor.contractAddress,
        transactionHash,
        expectedSigner: row.anchor.expectedSignerAddress,
        expectedEntityId: deriveContributionIdentity(row.contributionId),
        failureCode
      },
      updatedAt: new Date()
    }).where(eq(provenanceAnchor.id, row.anchor.id));
    return NextResponse.json({ anchorId: row.anchor.id, transactionHash, status: "FAILED", error: message }, { status: 422 });
  };

  let networkChainId: number;
  let tx;
  let receipt;
  try {
    networkChainId = await publicClient.getChainId();
    if (networkChainId !== FANOVA_CHAIN_ID) return NextResponse.json({ error: "Configured RPC did not report Soneium Mainnet chain ID 1868." }, { status: 503 });
    tx = await publicClient.getTransaction({ hash: transactionHash });
    receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });
  } catch {
    return NextResponse.json({ anchorId: row.anchor.id, transactionHash, status: "PENDING", error: "Transaction is not yet available or mined. Retry with the same hash." }, { status: 202 });
  }
  if (receipt.status !== "success") return fail("TRANSACTION_REVERTED", "The creator decision transaction reverted on Soneium.");
  if (!tx.to || !sameHex(tx.to, row.anchor.contractAddress) ||
      !sameHex(tx.from, row.anchor.expectedSignerAddress) || tx.chainId !== FANOVA_CHAIN_ID) {
    return fail("TRANSACTION_ENVELOPE_MISMATCH", "Transaction sender, destination, or chain does not match the stored creator decision intent.");
  }

  const [creatorWallet] = await db.select({ address: linkedWallet.address }).from(linkedWallet).where(and(
    eq(linkedWallet.userId, actor.userId), eq(linkedWallet.chainId, FANOVA_CHAIN_ID)
  )).limit(1);
  if (!creatorWallet || !isAddress(creatorWallet.address) ||
      !sameHex(creatorWallet.address, row.anchor.expectedSignerAddress)) {
    return fail("CREATOR_WALLET_MISMATCH", "The creator's currently linked Soneium wallet no longer matches this intent.");
  }

  const [sourceAnchor] = await db.select().from(provenanceAnchor).where(and(
    eq(provenanceAnchor.workVersionId, row.sourceVersionId),
    eq(provenanceAnchor.operationType, "work_version")
  )).limit(1);
  const sourceSnapshot = sourceAnchor?.verificationSnapshot;
  const sourceVersion = sourceSnapshot?.sourceVersion ?? (row.versionNumber === 1 ? 1 : null);
  const permissionVersion = sourceSnapshot?.permissionVersion ?? (row.versionNumber === 1 ? 1 : null);
  if (!sourceAnchor || sourceAnchor.status !== "mainnet" || sourceAnchor.chainId !== FANOVA_CHAIN_ID ||
      !sameHex(sourceAnchor.contractAddress, row.anchor.contractAddress) ||
      !sameHex(sourceAnchor.expectedSignerAddress, row.anchor.expectedSignerAddress) ||
      !sourceAnchor.transactionHash || sourceAnchor.eventName !== "StoryVersionRegistered" ||
      sourceAnchor.sourceHash !== row.sourceHash || sourceAnchor.permissionHash !== row.permissionHash ||
      !sourceSnapshot || !Number.isSafeInteger(sourceVersion) || !sourceVersion ||
      !Number.isSafeInteger(permissionVersion) || !permissionVersion) {
    return fail("SOURCE_STORY_ANCHOR_INVALID", "The exact source story version is not confirmed under this creator wallet.");
  }

  const [registeredContribution] = await db.select().from(provenanceAnchor).where(and(
    eq(provenanceAnchor.contributionId, row.contributionId),
    eq(provenanceAnchor.operationType, "contribution")
  )).limit(1);
  if (!registeredContribution || registeredContribution.status !== "mainnet" ||
      registeredContribution.chainId !== FANOVA_CHAIN_ID ||
      !sameHex(registeredContribution.contractAddress, row.anchor.contractAddress) ||
      !registeredContribution.transactionHash || registeredContribution.eventName !== "ContributionRegistered" ||
      registeredContribution.contributionHash !== row.contentHash ||
      registeredContribution.permissionHash !== row.acknowledgedPermissionHash) {
    return fail("CONTRIBUTION_REGISTRATION_INVALID", "The contribution does not have a matching verified Mainnet registration.");
  }

  const approved = row.status === "approved";
  const reasonCode = keccak256(toBytes(row.creatorFeedback ?? ""));
  const savedSnapshot = row.anchor.verificationSnapshot;
  if (savedSnapshot?.decisionApproved !== approved ||
      !savedSnapshot.decisionReasonCode || !sameHex(savedSnapshot.decisionReasonCode, reasonCode)) {
    return fail("DECISION_INTENT_MISMATCH", "The stored creator decision changed after this intent was prepared.");
  }
  const contributionIdentity = deriveContributionIdentity(row.contributionId);
  if (!matchesCreatorDecisionCall(tx.input, { contributionId: contributionIdentity, approved, reasonCode })) {
    return fail("CALLDATA_MISMATCH", "Transaction calldata does not match the expected contribution decision and reason hash.");
  }

  const storyIdentity = deriveStoryIdentity(row.workId, creatorWallet.address as Address);
  let matchingLog: (typeof receipt.logs)[number] | undefined;
  for (const log of receipt.logs) {
    if (!sameHex(log.address, row.anchor.contractAddress)) continue;
    try {
      const event = decodeEventLog({ abi: CREATOR_DECISION_ABI, data: log.data, topics: log.topics });
      if (event.eventName === "ContributionDecided" && matchesCreatorDecisionEvent(event.args, {
        contributionId: contributionIdentity,
        storyId: storyIdentity.storyId,
        sourceVersion: BigInt(sourceVersion),
        reviewer: creatorWallet.address as Address,
        approved,
        reasonCode
      })) {
        matchingLog = log;
        break;
      }
    } catch {
      // Ignore unrelated or malformed logs.
    }
  }
  if (!matchingLog) return fail("EXPECTED_EVENT_MISSING", "The receipt does not contain the exact expected ContributionDecided event.");

  const snapshot = {
    ...savedSnapshot,
    checkedAt: new Date().toISOString(),
    chainId: FANOVA_CHAIN_ID,
    contractAddress: row.anchor.contractAddress,
    transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    transactionIndex: receipt.transactionIndex,
    logIndex: matchingLog.logIndex,
    eventName: "ContributionDecided",
    sourceVersion,
    permissionVersion,
    expectedSigner: row.anchor.expectedSignerAddress,
    observedSigner: tx.from,
    expectedEntityId: contributionIdentity,
    observedEntityId: contributionIdentity,
    expectedHashes: { sourceHash: row.sourceHash, permissionHash: row.acknowledgedPermissionHash, contributionHash: row.contentHash, reasonCode },
    observedHashes: { sourceHash: row.sourceHash, permissionHash: row.acknowledgedPermissionHash, contributionHash: row.contentHash, reasonCode },
    confirmations: 1
  };
  await db.update(provenanceAnchor).set({
    status: "mainnet",
    blockNumber: receipt.blockNumber,
    transactionIndex: receipt.transactionIndex,
    logIndex: matchingLog.logIndex,
    eventName: "ContributionDecided",
    verificationSnapshot: snapshot,
    verifiedAt: new Date(),
    updatedAt: new Date()
  }).where(eq(provenanceAnchor.id, row.anchor.id));

  return NextResponse.json({
    anchorId: row.anchor.id,
    status: "MAINNET",
    verified: true,
    transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    transactionIndex: receipt.transactionIndex,
    logIndex: matchingLog.logIndex,
    eventName: "ContributionDecided",
    explorerUrl: `https://soneium.blockscout.com/tx/${transactionHash}`
  });
}
