import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { bindWalletAddress, verifyWalletSignature } from "./wallet-signature";

const account = privateKeyToAccount("0x0123456789012345678901234567890123456789012345678901234567890123");

describe("wallet signature verification", () => {
  it("binds the signer address into the server-issued challenge", () => {
    const message = bindWalletAddress("Sign in to FANOVA\n<wallet-address>\nChain ID: 1868", account.address);
    expect(message).toContain(account.address);
    expect(message).not.toContain("<wallet-address>");
  });

  it("rejects malformed addresses and templates", () => {
    expect(bindWalletAddress("hello", account.address)).toBeNull();
    expect(bindWalletAddress("<wallet-address>", "not-an-address")).toBeNull();
  });

  it("accepts a valid signature from the claimed address", async () => {
    const message = "FANOVA wallet linking test";
    const signature = await account.signMessage({ message });
    expect(await verifyWalletSignature(account.address, message, signature)).toBe(true);
  });

  it("rejects a signature claimed by a different address", async () => {
    const message = "FANOVA wallet linking test";
    const signature = await account.signMessage({ message });
    const other = privateKeyToAccount("0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd");
    expect(await verifyWalletSignature(other.address, message, signature)).toBe(false);
  });
});
