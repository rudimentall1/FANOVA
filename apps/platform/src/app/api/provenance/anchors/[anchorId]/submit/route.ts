import { and, desc, eq, isNull, lt } from "drizzle-orm";
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
import { provenanceAnchor, work, workVersion } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";
import {
  deriveStoryIdentity,
  FANOVA_CHAIN_ID,
  asBytes32Hash,
  nextPermissionVersion,
  nextProvenanceVersion
} from "@/lib/provenance-intent";
import { STORY_REGISTRATION_ABI, matchesStoryRegistrationCall, matchesStoryVersionEvent } from "@/lib/provenance-submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const publicClient = createPublicClient({
  transport: http(process.env.SONEIUM_RPC_URL || "https://rpc.soneium.org/")
});

type RouteContext = { params: Promise<{ anchorId: string }> };

function sameHex(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

export async function POST(request: Request, context: RouteContext) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { anchorId } = await context.params;
  if (!anchorId || anchorId.length > 128) {
    return NextResponse.json({ error: "Invalid provenance anchor ID." }, { status: 400 });
  }
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
    workVersionId: workVersion.id,
    workId: workVersion.workId,
    versionNumber: workVersion.versionNumber,
    sourceHash: workVersion.sourceHash,
    permissionHash: workVersion.permissionHash,
    ownerUserId: work.ownerUserId
  }).from(provenanceAnchor)
    .innerJoin(workVersion, eq(provenanceAnchor.workVersionId, workVersion.id))
    .innerJoin(work, eq(workVersion.workId, work.id))
    .where(and(eq(provenanceAnchor.id, anchorId), eq(provenanceAnchor.actorUserId, actor.userId)))
    .limit(1);

  if (!row || row.ownerUserId !== actor.userId) {
    return NextResponse.json({ error: "Provenance anchor not found." }, { status: 404 });
  }
  if (row.anchor.operationType !== "work_version" || row.anchor.chainId !== FANOVA_CHAIN_ID ||
      !isAddress(row.anchor.contractAddress) || !isAddress(row.anchor.expectedSignerAddress)) {
    return NextResponse.json({ error: "This anchor is not a supported Soneium story registration." }, { status: 409 });
  }

  if (row.anchor.transactionHash && !sameHex(row.anchor.transactionHash, transactionHash)) {
    return NextResponse.json({ error: "A different transaction hash is already bound to this provenance intent." }, { status: 409 });
  }
  if (!row.anchor.transactionHash) {
    const now = new Date();
    await db.update(provenanceAnchor).set({
      transactionHash,
      status: "pending",
      submittedAt: now,
      updatedAt: now
    }).where(and(
      eq(provenanceAnchor.id, anchorId),
      eq(provenanceAnchor.actorUserId, actor.userId),
      isNull(provenanceAnchor.transactionHash)
    ));
    const [bound] = await db.select({ transactionHash: provenanceAnchor.transactionHash })
      .from(provenanceAnchor)
      .where(and(eq(provenanceAnchor.id, anchorId), eq(provenanceAnchor.actorUserId, actor.userId)))
      .limit(1);
    if (!bound || !bound.transactionHash || !sameHex(bound.transactionHash, transactionHash)) {
      return NextResponse.json({ error: "A different transaction hash was concurrently bound to this provenance intent." }, { status: 409 });
    }
  }

  let networkChainId: number;
  try {
    networkChainId = await publicClient.getChainId();
  } catch {
    return NextResponse.json({ anchorId, transactionHash, status: "PENDING", error: "Soneium RPC is temporarily unavailable; retry verification with the same transaction hash." }, { status: 202 });
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
    return NextResponse.json({ anchorId, transactionHash, status: "PENDING", error: "Transaction is not yet available or mined. Retry with the same transaction hash." }, { status: 202 });
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
        failureCode
      },
      updatedAt: new Date()
    }).where(and(eq(provenanceAnchor.id, anchorId), eq(provenanceAnchor.actorUserId, actor.userId)));
    return NextResponse.json({ anchorId, transactionHash, status: "FAILED", error: message }, { status: 422 });
  };

  if (receipt.status !== "success") return fail("TRANSACTION_REVERTED", "The submitted transaction reverted on Soneium.");
  if (!tx.to || !sameHex(tx.to, row.anchor.contractAddress) ||
      !sameHex(tx.from, row.anchor.expectedSignerAddress) ||
      !tx.chainId || tx.chainId !== FANOVA_CHAIN_ID) {
    return fail("TRANSACTION_ENVELOPE_MISMATCH", "Transaction sender, destination, or chain does not match the stored provenance intent.");
  }

  const sourceHash = asBytes32Hash(row.sourceHash);
  const permissionHash = asBytes32Hash(row.permissionHash);
  if (!sourceHash || !permissionHash) return fail("STORED_HASH_INVALID", "Stored source or permission hash is invalid.");

  // Saved draft revisions increment workVersion.versionNumber but are not
  // necessarily written to the contract. Continue from the latest confirmed
  // provenance anchor, not from the application database's version counter.
  let sourceVersion = 1;
  let permissionVersion = 1;
  const previousRows = await db.select({
    versionNumber: workVersion.versionNumber,
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
      eq(workVersion.workId, row.workId),
      lt(workVersion.versionNumber, row.versionNumber)
    ))
    .orderBy(desc(workVersion.versionNumber))
    .limit(2);

  if (previousRows.length > 0) {
    const previous = previousRows[0];
    if (previousRows[1]?.versionNumber === previous.versionNumber) {
      return fail("PREVIOUS_ANCHOR_AMBIGUOUS", "The latest preceding story version has multiple provenance anchors. Contact support before proceeding.");
    }
    const previousSnapshot = previous.verificationSnapshot;
    const previousSourceVersion = previousSnapshot?.sourceVersion ??
      (previous.versionNumber === 1 ? 1 : null);
    const previousPermissionVersion = previousSnapshot?.permissionVersion ??
      (previous.versionNumber === 1 ? 1 : null);

    if (
      previous.status !== "mainnet" ||
      previous.chainId !== FANOVA_CHAIN_ID ||
      !sameHex(previous.contractAddress, row.anchor.contractAddress) ||
      !sameHex(previous.expectedSignerAddress, row.anchor.expectedSignerAddress) ||
      !previous.transactionHash ||
      previous.eventName !== "StoryVersionRegistered" ||
      !previous.verifiedAt ||
      previous.sourceHash !== previous.versionSourceHash ||
      previous.permissionHash !== previous.versionPermissionHash ||
      !previousSnapshot ||
      previousSnapshot.chainId !== FANOVA_CHAIN_ID ||
      !sameHex(previousSnapshot.contractAddress, row.anchor.contractAddress)
    ) {
      return fail("PREVIOUS_VERSION_NOT_VERIFIED", "The latest preceding provenance anchor is not confirmed under the same creator wallet and contract.");
    }

    const nextSource = nextProvenanceVersion(previousSourceVersion ?? Number.NaN);
    const nextPermission = nextPermissionVersion(
      row.permissionHash,
      previous.permissionHash ?? "",
      previousPermissionVersion ?? Number.NaN
    );
    if (nextSource === null || nextPermission === null) {
      return fail("PREVIOUS_VERSION_METADATA_MISSING", "The previous anchor lacks a trustworthy provenance or permission version. Do not submit another transaction.");
    }
    sourceVersion = nextSource;
    permissionVersion = nextPermission;
  }

  const identity = deriveStoryIdentity(row.workId, row.anchor.expectedSignerAddress as Address);
  const expected = {
    storyId: identity.storyId,
    creatorSalt: identity.creatorSalt,
    sourceVersion: BigInt(sourceVersion),
    sourceHash,
    permissionVersion: BigInt(permissionVersion),
    permissionHash
  };
  if (!matchesStoryRegistrationCall(tx.input, expected)) {
    return fail("CALLDATA_MISMATCH", "Transaction calldata does not match the expected provenance sequence, permission version, hashes, and creator identity.");
  }

  let matchingLog: (typeof receipt.logs)[number] | undefined;
  for (const log of receipt.logs) {
    if (!sameHex(log.address, row.anchor.contractAddress)) continue;
    try {
      const event = decodeEventLog({ abi: STORY_REGISTRATION_ABI, data: log.data, topics: log.topics });
      if (event.eventName !== "StoryVersionRegistered") continue;
      if (matchesStoryVersionEvent(event.args, { ...expected, creator: row.anchor.expectedSignerAddress as Address })) {
        matchingLog = log;
        break;
      }
    } catch {
      // Ignore unrelated or malformed logs; only the exact expected event is accepted.
    }
  }
  if (!matchingLog) return fail("EXPECTED_EVENT_MISSING", "Successful transaction receipt does not contain the exact expected StoryVersionRegistered event.");

  const checkedAt = new Date().toISOString();
  const snapshot = {
    checkedAt,
    chainId: FANOVA_CHAIN_ID,
    contractAddress: row.anchor.contractAddress,
    transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    transactionIndex: receipt.transactionIndex,
    logIndex: matchingLog.logIndex,
    eventName: "StoryVersionRegistered",
    sourceVersion,
    permissionVersion,
    expectedSigner: row.anchor.expectedSignerAddress,
    observedSigner: tx.from,
    expectedEntityId: identity.storyId,
    observedEntityId: identity.storyId,
    expectedHashes: { sourceHash, permissionHash },
    observedHashes: { sourceHash, permissionHash },
    confirmations: 1
  };

  await db.update(provenanceAnchor).set({
    status: "mainnet",
    blockNumber: receipt.blockNumber,
    transactionIndex: receipt.transactionIndex,
    logIndex: matchingLog.logIndex,
    eventName: "StoryVersionRegistered",
    verificationSnapshot: snapshot,
    verifiedAt: new Date(),
    updatedAt: new Date()
  }).where(and(eq(provenanceAnchor.id, anchorId), eq(provenanceAnchor.actorUserId, actor.userId)));

  return NextResponse.json({
    anchorId,
    status: "MAINNET",
    verified: true,
    transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    transactionIndex: receipt.transactionIndex,
    logIndex: matchingLog.logIndex,
    eventName: "StoryVersionRegistered",
    sourceVersion,
    permissionVersion,
    explorerUrl: `https://soneium.blockscout.com/tx/${transactionHash}`
  });
}
