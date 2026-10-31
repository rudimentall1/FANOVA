import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAddress, verifyMessage, type Address, type Hex } from "viem";
import { db } from "@/db";
import { linkedWallet, walletChallenge } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIN_ID = 1868;
const MAX_BODY_BYTES = 12_000;

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!request.headers.get("content-type")?.includes("application/json")) {
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
    return NextResponse.json({ error: "Invalid wallet verification payload." }, { status: 400 });
  }
  const input = payload as Record<string, unknown>;
  if (typeof input.message !== "string" || typeof input.signature !== "string" ||
      input.message.length > 8_000 || !/^0x[0-9a-fA-F]{130}$/.test(input.signature)) {
    return NextResponse.json({ error: "A SIWE message and 65-byte signature are required." }, { status: 422 });
  }

  const nonceMatch = input.message.match(/^Nonce: ([A-Za-z0-9_-]{32})$/m);
  const addressMatch = input.message.match(/^0x[a-fA-F0-9]{40}$/m);
  if (!nonceMatch || !addressMatch) {
    return NextResponse.json({ error: "Malformed wallet challenge message." }, { status: 422 });
  }
  const nonce = nonceMatch[1];
  const address = addressMatch[0] as Address;
  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 422 });
  }

  const [challenge] = await db.select().from(walletChallenge)
    .where(and(eq(walletChallenge.nonce, nonce), eq(walletChallenge.userId, actor.userId)))
    .limit(1);

  if (!challenge || challenge.chainId !== CHAIN_ID || challenge.expiresAt.getTime() <= Date.now() ||
      challenge.consumedAt !== null || input.message !== challenge.message.replace("<wallet-address>", address)) {
    return NextResponse.json({ error: "Wallet challenge is invalid, expired, or already used." }, { status: 409 });
  }

  let valid = false;
  try {
    valid = await verifyMessage({
      address,
      message: input.message,
      signature: input.signature as Hex
    });
  } catch {
    valid = false;
  }
  if (!valid) return NextResponse.json({ error: "Wallet signature verification failed." }, { status: 401 });

  const now = new Date();
  try {
    const result = await db.transaction(async (tx) => {
      const consumed = await tx.update(walletChallenge)
        .set({ consumedAt: now })
        .where(and(
          eq(walletChallenge.id, challenge.id),
          eq(walletChallenge.userId, actor.userId),
          isNull(walletChallenge.consumedAt),
          gt(walletChallenge.expiresAt, now)
        ))
        .returning({ id: walletChallenge.id });
      if (consumed.length !== 1) throw new Error("CHALLENGE_ALREADY_USED");

      const [wallet] = await tx.insert(linkedWallet).values({
        id: randomUUID(),
        userId: actor.userId,
        chainId: CHAIN_ID,
        address,
        addressLower: address.toLowerCase(),
        verifiedAt: now,
        createdAt: now
      }).returning({
        address: linkedWallet.address,
        chainId: linkedWallet.chainId,
        verifiedAt: linkedWallet.verifiedAt
      });
      return wallet;
    });
    return NextResponse.json({ wallet: result, status: "verified" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "CHALLENGE_ALREADY_USED") {
      return NextResponse.json({ error: "Wallet challenge has already been consumed." }, { status: 409 });
    }
    // Unique constraints prevent one wallet being claimed by two accounts and
    // prevent one account linking multiple wallets on the same chain.
    return NextResponse.json({ error: "This wallet or account is already linked." }, { status: 409 });
  }
}
