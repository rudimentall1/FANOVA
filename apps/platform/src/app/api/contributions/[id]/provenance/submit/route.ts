import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  createPublicClient,
  decodeEventLog,
  http,
  isAddress,
  type Address,
  type Hex
} from "viem";
import { db } from "@/db";
import { contribution, linkedWallet, provenanceAnchor, work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import {
  asBytes32Hash,
  deriveContributionIdentity,
  deriveStoryIdentity,
  FANOVA_CHAIN_ID
} from "@/lib/provenance-intent";
import { hashContribution } from "@/lib/contribution-hash";
import {
  CONTRIBUTION_REGISTRATION_ABI,
  matchesContributionRegisteredEvent,
  matchesContributionRegistrationCall
} from "@/lib/provenance-submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const publicClient = createPublicClient({
  transport: http(process.env.SONEIUM_RPC_URL || "https://rpc.soneium.org/")
});

type RouteContext = { params: Promise<{ id: string }> };

function sameHex(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

export async function POST(request: Request, context: RouteContext) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await context.params;
  if (!id || id.length > 128) return NextResponse.json({ error: "Invalid contribution ID." }, { status: 400 });
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 2_000) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
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
    type: contribution.type,
    commercialIntent: contribution.commercialIntent,
    title: contribution.title,
    content: contribution.content,
    contentHash: contribution.contentHash,
    acknowledgedPermissionHash: contribution.acknowledgedPermissionHash,
    contributionStatus: contribution.status,
    ownerUserId: work.ownerUserId,
    workStatus: work.status,
    currentVersionId: work.currentVersionId,
    versionNumber: workVersion.versionNumber,
    sourceHash: workVersion.sourceHash,
    permissionHash: workVersion.permissionHash
  }).from(provenanceAnchor)
    .innerJoin(contribution, eq(provenanceAnchor.contributionId, contribution.id))
    .innerJoin(work, eq(contribution.workId, work.id))
    .innerJoin(workVersion, eq(contribution.sourceVersionId, workVersion.id))
    .where(and(
      eq(provenanceAnchor.id, id),
      eq(provenanceAnchor.actorUserId, actor.userId),
      eq(contribution.contributorUserId, actor.userId)
    ))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Contribution provenance anchor not found." }, { status: 404 });
  if (row.anchor.operationType !== "contribution" || row.anchor.chainId !== FANOVA_CHAIN_ID ||
      !isAddress(row.anchor.contractAddress) || !isAddress(row.anchor.expectedSignerAddress)) {
    return NextResponse.json({ error: "This anchor is not a supported Soneium contribution registration." }, { status: 409 });
  }

  if (row.anchor.transactionHash && !sameHex(row.anchor.transactionHash, transactionHash)) {
    return NextResponse.json({ error: "A different transaction hash is already bound to this contribution intent." }, { status: 409 });
  }
  if (!row.anchor.transactionHash) {
    const now = new Date();
    await db.update(provenanceAnchor).set({
      transactionHash,
      status: "pending",
      submittedAt: now,
      updatedAt: now
    }).where(and(
      eq(provenanceAnchor.id, id),
      eq(provenanceAnchor.actorUserId, actor.userId),
      isNull(provenanceAnchor.transactionHash)
    ));
    const [bound] = await db.select({ transactionHash: provenanceAnchor.transactionHash })
      .from(provenanceAnchor)
      .where(and(eq(provenanceAnchor.id, id), eq(provenanceAnchor.actorUserId, actor.userId)))
      .limit(1);
    if (!bound || !bound.transactionHash || !sameHex(bound.transactionHash, transactionHash)) {
      return NextResponse.json({ error: "A different transaction hash was concurrently bound to this contribution intent." }, { status: 409 });
    }
  }

  let networkChainId: number;
  try {
    networkChainId = await publicClient.getChainId();
  } catch {
    return NextResponse.json({ anchorId: id, transactionHash, status: "PENDING", error: "Soneium RPC is temporarily unavailable; retry verification with the same transaction hash." }, { status: 202 });
  }
  if (networkChainId !== FANOVA_CHAIN_ID) {
    return NextResponse.json({ error: "Configured RPC did not report Soneium Mainnet chain ID 1868." }, { status: 503 });
  }

  let tx;
  let receipt;
  try {
    tx = await publicClient.getTransaction({ hash: transactionHash });
    receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });
  } catch {
    return NextResponse.json({ anchorId: id, transactionHash, status: "PENDING", error: "Transaction is not yet available or mined. Retry with the same transaction hash." }, { status: 202 });
  }

  const fail = async (failureCode: string, message: string) => {
    const checkedAt = new Date().toISOString();
    await db.update(provenanceAnchor).set({
      status: "failed",
      verificationSnapshot: {
        checkedAt,
        chainId: FANOVA_CHAIN_ID,
        contractAddress: row.anchor.contractAddress,
        transactionHash,
        expectedSigner: row.anchor.expectedSignerAddress,
        expectedEntityId: deriveContributionIdentity(row.contributionId),
        failureCode
      },
      updatedAt: new Date()
    }).where(and(eq(provenanceAnchor.id, id), eq(provenanceAnchor.actorUserId, actor.userId)));
    return NextResponse.json({ anchorId: id, transactionHash, status: "FAILED", error: message }, { status: 422 });
  };

  if (receipt.status !== "success") return fail("TRANSACTION_REVERTED", "The submitted contribution registration reverted on Soneium.");
  if (!tx.to || !sameHex(tx.to, row.anchor.contractAddress) ||
      !sameHex(tx.from, row.anchor.expectedSignerAddress) ||
      !tx.chainId || tx.chainId !== FANOVA_CHAIN_ID) {
    return fail("TRANSACTION_ENVELOPE_MISMATCH", "Transaction sender, destination, or chain does not match the stored contribution intent.");
  }

  if (row.contributionStatus !== "pending" || row.workStatus !== "published" || row.currentVersionId !== row.sourceVersionId) {
    return fail("CONTRIBUTION_STALE", "The contribution is no longer pending against the current published story version.");
  }

  const [creatorWallet] = await db.select({
    address: linkedWallet.address
  }).from(linkedWallet).where(and(
    eq(linkedWallet.userId, row.ownerUserId),
    eq(linkedWallet.chainId, FANOVA_CHAIN_ID)
  )).limit(1);
  if (!creatorWallet || !isAddress(creatorWallet.address)) {
    return fail("CREATOR_WALLET_MISSING", "The creator's linked Soneium wallet is no longer available.");
  }

  const storyAnchors = await db.select().from(provenanceAnchor)
    .where(and(
      eq(provenanceAnchor.workVersionId, row.sourceVersionId),
      eq(provenanceAnchor.operationType, "work_version")
    ));
  if (storyAnchors.length !== 1) {
    return fail("STORY_ANCHOR_MISSING", "The exact source story version does not have one unique Mainnet provenance anchor.");
  }
  const storyAnchor = storyAnchors[0];
  const storySnapshot = storyAnchor.verificationSnapshot;
  const sourceVersion = storySnapshot?.sourceVersion ??
    (row.versionNumber === 1 ? 1 : null);
  const permissionVersion = storySnapshot?.permissionVersion ??
    (row.versionNumber === 1 ? 1 : null);

  if (
    storyAnchor.status !== "mainnet" ||
    storyAnchor.chainId !== FANOVA_CHAIN_ID ||
    !sameHex(storyAnchor.contractAddress, row.anchor.contractAddress) ||
    !sameHex(storyAnchor.expectedSignerAddress, creatorWallet.address) ||
    !storyAnchor.transactionHash ||
    storyAnchor.eventName !== "StoryVersionRegistered" ||
    !storyAnchor.verifiedAt ||
    storyAnchor.sourceHash !== row.sourceHash ||
    storyAnchor.permissionHash !== row.permissionHash ||
    !storySnapshot ||
    storySnapshot.chainId !== FANOVA_CHAIN_ID ||
    !sameHex(storySnapshot.contractAddress, row.anchor.contractAddress) ||
    !Number.isSafeInteger(sourceVersion) || !sourceVersion ||
    !Number.isSafeInteger(permissionVersion) || !permissionVersion
  ) {
    return fail("STORY_ANCHOR_INVALID", "The source story version is not confirmed under the creator's linked wallet and the expected provenance contract.");
  }

  const expectedSourceHash = asBytes32Hash(row.sourceHash);
  const permissionHash = asBytes32Hash(row.acknowledgedPermissionHash);
  const contributionHash = asBytes32Hash(row.contentHash);
  const recalculatedHash = hashContribution({
    type: row.type,
    title: row.title,
    content: row.content,
    commercialIntent: row.commercialIntent
  });
  if (!expectedSourceHash || !permissionHash || !contributionHash ||
      recalculatedHash !== row.contentHash ||
      row.acknowledgedPermissionHash !== row.permissionHash ||
      row.anchor.sourceHash !== row.sourceHash ||
      row.anchor.permissionHash !== row.acknowledgedPermissionHash ||
      row.anchor.contributionHash !== row.contentHash) {
    return fail("CONTRIBUTION_HASH_MISMATCH", "Stored contribution content or acknowledged permission hashes do not match the prepared intent.");
  }

  const story = deriveStoryIdentity(row.workId, creatorWallet.address as Address);
  const contributionIdentity = deriveContributionIdentity(row.contributionId);
  const expected = {
    contributionId: contributionIdentity,
    storyId: story.storyId,
    sourceVersion: BigInt(sourceVersion),
    permissionVersion: BigInt(permissionVersion),
    permissionHash,
    contributionHash,
    permissionAcknowledged: true as const
  };

  if (!matchesContributionRegistrationCall(tx.input, expected)) {
    return fail("CALLDATA_MISMATCH", "Transaction calldata does not match the expected contribution ID, story, source version, permission version, and hashes.");
  }

  let matchingLog: (typeof receipt.logs)[number] | undefined;
  for (const log of receipt.logs) {
    if (!sameHex(log.address, row.anchor.contractAddress)) continue;
    try {
      const event = decodeEventLog({ abi: CONTRIBUTION_REGISTRATION_ABI, data: log.data, topics: log.topics });
      if (event.eventName !== "ContributionRegistered") continue;
      if (matchesContributionRegisteredEvent(event.args, {
        ...expected,
        contributor: row.anchor.expectedSignerAddress as Address
      })) {
        matchingLog = log;
        break;
      }
    } catch {
      // Ignore unrelated or malformed logs; only the exact expected event is accepted.
    }
  }
  if (!matchingLog) return fail("EXPECTED_EVENT_MISSING", "Successful transaction receipt does not contain the exact expected ContributionRegistered event.");

  const checkedAt = new Date().toISOString();
  const snapshot = {
    checkedAt,
    chainId: FANOVA_CHAIN_ID,
    contractAddress: row.anchor.contractAddress,
    transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    transactionIndex: receipt.transactionIndex,
    logIndex: matchingLog.logIndex,
    eventName: "ContributionRegistered",
    sourceVersion,
    permissionVersion,
    expectedSigner: row.anchor.expectedSignerAddress,
    observedSigner: tx.from,
    expectedEntityId: contributionIdentity,
    observedEntityId: contributionIdentity,
    expectedHashes: { sourceHash: expectedSourceHash, permissionHash, contributionHash },
    observedHashes: { sourceHash: expectedSourceHash, permissionHash, contributionHash },
    confirmations: 1
  };

  await db.update(provenanceAnchor).set({
    status: "mainnet",
    blockNumber: receipt.blockNumber,
    transactionIndex: receipt.transactionIndex,
    logIndex: matchingLog.logIndex,
    eventName: "ContributionRegistered",
    verificationSnapshot: snapshot,
    verifiedAt: new Date(),
    updatedAt: new Date()
  }).where(and(eq(provenanceAnchor.id, id), eq(provenanceAnchor.actorUserId, actor.userId)));

  return NextResponse.json({
    anchorId: id,
    status: "MAINNET",
    verified: true,
    transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    transactionIndex: receipt.transactionIndex,
    logIndex: matchingLog.logIndex,
    eventName: "ContributionRegistered",
    sourceVersion,
    permissionVersion,
    explorerUrl: `https://soneium.blockscout.com/tx/${transactionHash}`
  });
}
