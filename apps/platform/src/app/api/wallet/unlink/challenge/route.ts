import { randomBytes, randomUUID } from "node:crypto";
import { and, count, eq, gt, isNull, isNotNull, lte, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { linkedWallet, walletUnlinkChallenge } from "@/db/schema";
import { auth } from "@/lib/auth";
import { MAX_ACTIVE_WALLET_UNLINK_CHALLENGES } from "@/lib/wallet-unlink-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIN_ID = 1868;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function configuredOrigin() {
  const domain = process.env.FANOVA_SIWE_DOMAIN;
  const uri = process.env.FANOVA_SIWE_URI;
  if (!domain || !uri) return null;
  try {
    const parsed = new URL(uri);
    if (parsed.host !== domain || !["https:", "http:"].includes(parsed.protocol)) return null;
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") return null;
    return { domain, uri };
  } catch {
    return null;
  }
}

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const origin = configuredOrigin();
  if (!origin) {
    return NextResponse.json({ error: "Wallet unlinking is not configured on this deployment." }, { status: 503 });
  }

  const [wallet] = await db.select().from(linkedWallet)
    .where(and(eq(linkedWallet.userId, session.user.id), eq(linkedWallet.chainId, CHAIN_ID)))
    .limit(1);
  if (!wallet) return NextResponse.json({ error: "No linked Soneium wallet was found." }, { status: 404 });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
  const nonce = randomBytes(24).toString("base64url");
  const id = randomUUID();
  const message = [
    `${origin.domain} wants you to sign in with your Ethereum account:`,
    "<wallet-address>",
    "",
    "Unlink this wallet from your FANOVA account.",
    "",
    `URI: ${origin.uri}`,
    "Version: 1",
    `Chain ID: ${CHAIN_ID}`,
    `Nonce: ${nonce}`,
    `Issued At: ${now.toISOString()}`,
    `Expiration Time: ${expiresAt.toISOString()}`
  ].join("\n");

  const admitted = await db.transaction(async (tx) => {
    // Serialize challenge issuance per authenticated user/session so concurrent requests cannot bypass the cap.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${session.user.id}), ${CHAIN_ID})`);

    // Retain only live, unused challenges. This also bounds historical table growth on active traffic.
    await tx.delete(walletUnlinkChallenge).where(and(
      eq(walletUnlinkChallenge.userId, session.user.id),
      or(isNotNull(walletUnlinkChallenge.consumedAt), lte(walletUnlinkChallenge.expiresAt, now))
    ));

    const [active] = await tx.select({ value: count() }).from(walletUnlinkChallenge)
      .where(and(
        eq(walletUnlinkChallenge.userId, session.user.id),
        isNull(walletUnlinkChallenge.consumedAt),
        gt(walletUnlinkChallenge.expiresAt, now)
      ));
    if (Number(active?.value ?? 0) >= MAX_ACTIVE_WALLET_UNLINK_CHALLENGES) return false;

    await tx.insert(walletUnlinkChallenge).values({
      id,
      userId: session.user.id,
      sessionId: session.session.id,
      walletId: wallet.id,
      nonce,
      message,
      chainId: CHAIN_ID,
      expiresAt,
      createdAt: now
    });
    return true;
  });

  if (!admitted) {
    return NextResponse.json(
      { error: "Too many active wallet unlink challenges. Wait for an existing challenge to expire." },
      { status: 429 }
    );
  }

  return NextResponse.json({ nonce, messageTemplate: message, expiresAt: expiresAt.toISOString(), chainId: CHAIN_ID });
}
