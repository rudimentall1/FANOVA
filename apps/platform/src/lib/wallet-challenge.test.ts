import { describe, expect, it } from "vitest";
import { validateWalletChallenge } from "./wallet-challenge";

const address = "0x1234567890123456789012345678901234567890";
const now = Date.parse("2026-10-31T10:00:00.000Z");

function makeChallenge(overrides: Partial<{
  message: string;
  chainId: number;
  expiresAt: Date;
  consumedAt: Date | null;
}> = {}) {
  return {
    message: [
      "fanova.example wants you to sign in with your Ethereum account:",
      "<wallet-address>",
      "",
      "Link this wallet to FANOVA.",
      "",
      "URI: https://fanova.example",
      "Version: 1",
      "Chain ID: 1868",
      "Nonce: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "Issued At: 2026-10-31T09:59:00.000Z",
      "Expiration Time: 2026-10-31T10:05:00.000Z"
    ].join("\n"),
    chainId: 1868,
    expiresAt: new Date(now + 5 * 60 * 1000),
    consumedAt: null,
    ...overrides
  };
}

function messageFor(template: string) {
  return template.replace("<wallet-address>", address);
}

describe("wallet challenge validation", () => {
  it("accepts the exact server-issued message and address", () => {
    const challenge = makeChallenge();
    expect(validateWalletChallenge(messageFor(challenge.message), challenge, now)).toBe(address);
  });

  it("rejects a message modified after challenge issuance", () => {
    const challenge = makeChallenge();
    const changed = messageFor(challenge.message).replace("Link this wallet", "Log in");
    expect(validateWalletChallenge(changed, challenge, now)).toBeNull();
  });

  it("rejects a challenge for another chain", () => {
    const challenge = makeChallenge({ chainId: 1 });
    expect(validateWalletChallenge(messageFor(challenge.message), challenge, now)).toBeNull();
  });

  it("rejects an expired challenge", () => {
    const challenge = makeChallenge({ expiresAt: new Date(now) });
    expect(validateWalletChallenge(messageFor(challenge.message), challenge, now)).toBeNull();
  });

  it("rejects a consumed challenge", () => {
    const challenge = makeChallenge({ consumedAt: new Date(now - 1000) });
    expect(validateWalletChallenge(messageFor(challenge.message), challenge, now)).toBeNull();
  });

  it("rejects a different nonce", () => {
    const challenge = makeChallenge();
    const changed = messageFor(challenge.message).replace("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB");
    expect(validateWalletChallenge(changed, challenge, now)).toBeNull();
  });

  it("rejects malformed wallet addresses", () => {
    const challenge = makeChallenge();
    const changed = challenge.message.replace("<wallet-address>", "not-a-wallet");
    expect(validateWalletChallenge(changed, challenge, now)).toBeNull();
  });
});
