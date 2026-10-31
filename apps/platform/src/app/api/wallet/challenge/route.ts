import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { walletChallenge } from "@/db/schema";
import { getCurrentActor } from "@/lib/server-auth";

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
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const origin = configuredOrigin();
  if (!origin) {
    return NextResponse.json({ error: "Wallet linking is not configured on this deployment." }, { status: 503 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
  const nonce = randomBytes(24).toString("base64url");
  const id = randomUUID();

  // EIP-4361 message. The exact server-issued message is persisted and must be
  // returned byte-for-byte by the client during verification.
  const message = [
    `${origin.domain} wants you to sign in with your Ethereum account:`,
    "<wallet-address>",
    "",
    "Sign in to FANOVA and link this wallet to your account.",
    "",
    `URI: ${origin.uri}`,
    "Version: 1",
    `Chain ID: ${CHAIN_ID}`,
    `Nonce: ${nonce}`,
    `Issued At: ${now.toISOString()}`,
    `Expiration Time: ${expiresAt.toISOString()}`
  ].join("\n");

  await db.insert(walletChallenge).values({
    id,
    userId: actor.userId,
    nonce,
    message,
    chainId: CHAIN_ID,
    expiresAt,
    createdAt: now
  });

  return NextResponse.json({ nonce, messageTemplate: message, expiresAt: expiresAt.toISOString(), chainId: CHAIN_ID });
}
