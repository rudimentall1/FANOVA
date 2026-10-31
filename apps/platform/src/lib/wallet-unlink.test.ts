import { describe, expect, it } from "vitest";
import { validateWalletUnlinkChallenge } from "./wallet-unlink";

const address = "0x1234567890123456789012345678901234567890";
const otherAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
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
      "Unlink this wallet from your FANOVA account.",
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

describe("wallet unlink challenge", () => {
  it("accepts the exact challenge signed by the currently linked wallet", () => {
    const challenge = makeChallenge();
    const message = challenge.message.replace("<wallet-address>", address);
    expect(validateWalletUnlinkChallenge(message, challenge, address, now)).toBe(true);
  });

  it("rejects a signature message for a different wallet", () => {
    const challenge = makeChallenge();
    const message = challenge.message.replace("<wallet-address>", otherAddress);
    expect(validateWalletUnlinkChallenge(message, challenge, address, now)).toBe(false);
  });

  it("rejects a modified purpose or message", () => {
    const challenge = makeChallenge();
    const message = challenge.message.replace("<wallet-address>", address).replace("Unlink this wallet", "Link this wallet");
    expect(validateWalletUnlinkChallenge(message, challenge, address, now)).toBe(false);
  });

  it("rejects expired, consumed, and wrong-chain challenges", () => {
    const challenge = makeChallenge();
    const message = challenge.message.replace("<wallet-address>", address);
    expect(validateWalletUnlinkChallenge(message, { ...challenge, expiresAt: new Date(now) }, address, now)).toBe(false);
    expect(validateWalletUnlinkChallenge(message, { ...challenge, consumedAt: new Date(now - 1) }, address, now)).toBe(false);
    expect(validateWalletUnlinkChallenge(message, { ...challenge, chainId: 1 }, address, now)).toBe(false);
  });
});
