import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isAddress, type Address, type Hex } from "viem";
import { verifyWalletSignature } from "@/lib/wallet-signature";
import { validateWalletUnlinkChallenge } from "@/lib/wallet-unlink";
import { db } from "@/db";
import { linkedWallet, walletUnlinkChallenge } from "@/db/schema";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIN_ID = 1868;
const MAX_BODY_BYTES = 12_000;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
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
    return NextResponse.json({ error: "Invalid wallet unlink payload." }, { status: 400 });
  }
  const input = payload as Record<string, unknown>;
  if (typeof input.message !== "string" || typeof input.signature !== "string" ||
      input.message.length > 8_000 || !/^0x[0-9a-fA-F]{130}$/.test(input.signature)) {
    return NextResponse.json({ error: "An unlink challenge and 65-byte signature are required." }, { status: 422 });
  }

  const nonceMatch = input.message.match(/^Nonce: ([A-Za-z0-9_-]{32})$/m);
  const addressMatch = input.message.match(/^0x[a-fA-F0-9]{40}$/m);
  if (!nonceMatch || !addressMatch || !isAddress(addressMatch[0])) {
    return NextResponse.json({ error: "Malformed wallet unlink challenge." }, { status: 422 });
  }
  const nonce = nonceMatch[1];
  const address = addressMatch[0] as Address;

  const [challenge] = await db.select().from(walletUnlinkChallenge)
    .where(and(
      eq(walletUnlinkChallenge.nonce, nonce),
      eq(walletUnlinkChallenge.userId, session.user.id),
      eq(walletUnlinkChallenge.sessionId, session.session.id),
      eq(walletUnlinkChallenge.chainId, CHAIN_ID)
    ))
    .limit(1);

  if (!challenge || challenge.message !== input.message ||
      !validateWalletUnlinkChallenge(input.message, challenge, address) ||
      challenge.walletId.length === 0) {
    return NextResponse.json({ error: "Wallet unlink challenge is invalid, expired, or already used." }, { status: 409 });
  }

  const [wallet] = await db.select().from(linkedWallet)
    .where(and(
      eq(linkedWallet.id, challenge.walletId),
      eq(linkedWallet.userId, session.user.id),
      eq(linkedWallet.chainId, CHAIN_ID)
    ))
    .limit(1);
  if (!wallet || wallet.addressLower !== address.toLowerCase()) {
    return NextResponse.json({ error: "The linked wallet changed. Request a new unlink challenge." }, { status: 409 });
  }

  const valid = await verifyWalletSignature(address, input.message, input.signature as Hex);
  if (!valid) return NextResponse.json({ error: "Wallet signature verification failed." }, { status: 401 });

  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      const consumed = await tx.update(walletUnlinkChallenge)
        .set({ consumedAt: now })
        .where(and(
          eq(walletUnlinkChallenge.id, challenge.id),
          eq(walletUnlinkChallenge.userId, session.user.id),
          eq(walletUnlinkChallenge.sessionId, session.session.id),
          isNull(walletUnlinkChallenge.consumedAt),
          gt(walletUnlinkChallenge.expiresAt, now)
        ))
        .returning({ id: walletUnlinkChallenge.id });
      if (consumed.length !== 1) throw new Error("UNLINK_CHALLENGE_ALREADY_USED");

      const deleted = await tx.delete(linkedWallet)
        .where(and(
          eq(linkedWallet.id, challenge.walletId),
          eq(linkedWallet.userId, session.user.id),
          eq(linkedWallet.chainId, CHAIN_ID),
          eq(linkedWallet.addressLower, address.toLowerCase())
        ))
        .returning({ id: linkedWallet.id });
      if (deleted.length !== 1) throw new Error("LINKED_WALLET_CHANGED");
    });
    return NextResponse.json({ wallet: null, status: "unlinked" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNLINK_CHALLENGE_ALREADY_USED" || message === "LINKED_WALLET_CHANGED") {
      return NextResponse.json({ error: "Wallet unlink challenge is no longer valid. Refresh and try again." }, { status: 409 });
    }
    return NextResponse.json({ error: "Wallet could not be unlinked. Refresh and try again." }, { status: 409 });
  }
}
