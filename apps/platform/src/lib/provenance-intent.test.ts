import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { asBytes32Hash, deriveStoryIdentity } from "./provenance-intent";

const creator = privateKeyToAccount("0x0123456789012345678901234567890123456789012345678901234567890123");

describe("provenance intent identity", () => {
  it("derives a stable story identity bound to the creator wallet and work", () => {
    const first = deriveStoryIdentity("work-123", creator.address);
    expect(deriveStoryIdentity("work-123", creator.address)).toEqual(first);
    expect(first.creatorSalt).toMatch(/^0x[0-9a-f]{64}$/);
    expect(first.storyId).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("does not reuse a story identity across creator wallets or works", () => {
    const other = privateKeyToAccount("0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd");
    expect(deriveStoryIdentity("work-123", other.address).storyId).not.toBe(deriveStoryIdentity("work-123", creator.address).storyId);
    expect(deriveStoryIdentity("work-456", creator.address).storyId).not.toBe(deriveStoryIdentity("work-123", creator.address).storyId);
  });

  it("converts only exact SHA-256 digests to bytes32", () => {
    expect(asBytes32Hash("a".repeat(64))).toBe(`0x${"a".repeat(64)}`);
    expect(asBytes32Hash("0x" + "a".repeat(64))).toBeNull();
    expect(asBytes32Hash("a".repeat(63))).toBeNull();
  });
});
