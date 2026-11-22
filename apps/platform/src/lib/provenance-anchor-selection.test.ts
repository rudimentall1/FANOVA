import { describe, expect, it } from "vitest";
import { isPublicAnchorVerified, matchesPublicAnchorIdentity, matchesPublicProofHashes, selectPublicAnchor, selectUniqueVerifiedAnchor } from "./provenance-anchor-selection";

type Attempt = { id: string; status: string; createdAt: Date };

const attempt = (id: string, status: string, day: number): Attempt => ({
  id,
  status,
  createdAt: new Date(`2026-11-${String(day).padStart(2, "0")}T12:00:00.000Z`)
});

describe("provenance anchor selection", () => {
  it("returns no public attempt when no anchors exist", () => {
    expect(selectPublicAnchor<Attempt>([])).toEqual({ anchor: null, ambiguous: false });
    expect(selectUniqueVerifiedAnchor<Attempt>([])).toBeNull();
  });

  it("selects the only verified anchor even when a newer failed retry exists", () => {
    const verified = attempt("verified", "mainnet", 10);
    const failedRetry = attempt("failed-retry", "failed", 11);

    expect(selectPublicAnchor([failedRetry, verified])).toEqual({
      anchor: verified,
      ambiguous: false
    });
    expect(selectUniqueVerifiedAnchor([failedRetry, verified])).toBe(verified);
  });

  it("fails closed when more than one verified anchor exists", () => {
    const first = attempt("verified-1", "mainnet", 10);
    const second = attempt("verified-2", "mainnet", 11);

    expect(selectPublicAnchor([first, second])).toEqual({
      anchor: null,
      ambiguous: true
    });
    expect(selectUniqueVerifiedAnchor([first, second])).toBeNull();
    expect(selectPublicAnchor([first], 2)).toEqual({ anchor: null, ambiguous: true });
  });

  it("shows the newest non-verified attempt when no verified anchor exists", () => {
    const older = attempt("pending", "pending", 10);
    const newer = attempt("failed", "failed", 11);

    expect(selectPublicAnchor([older, newer])).toEqual({
      anchor: newer,
      ambiguous: false
    });
    expect(selectUniqueVerifiedAnchor([older, newer])).toBeNull();
  });
});

describe("public provenance hash validation", () => {
  const storyHashes = { sourceHash: "0xabc", permissionHash: "0xdef" };

  it("accepts the exact operation-specific keys bound to authoritative values", () => {
    expect(matchesPublicProofHashes("StoryVersionRegistered", {
      expectedHashes: storyHashes,
      observedHashes: { sourceHash: "0xABC", permissionHash: "0xDEF" }
    }, storyHashes)).toBe(true);
  });

  it("rejects missing required keys", () => {
    expect(matchesPublicProofHashes("StoryVersionRegistered", {
      expectedHashes: { sourceHash: "0xabc" },
      observedHashes: { sourceHash: "0xabc" }
    }, storyHashes)).toBe(false);
  });

  it("rejects extra keys even when required hashes match", () => {
    expect(matchesPublicProofHashes("StoryVersionRegistered", {
      expectedHashes: { ...storyHashes, unexpected: "0x123" },
      observedHashes: { ...storyHashes, unexpected: "0x123" }
    }, storyHashes)).toBe(false);
  });

  it("rejects snapshots that match each other but not the authoritative entity", () => {
    expect(matchesPublicProofHashes("StoryVersionRegistered", {
      expectedHashes: { sourceHash: "0x111", permissionHash: "0xdef" },
      observedHashes: { sourceHash: "0x111", permissionHash: "0xdef" }
    }, storyHashes)).toBe(false);
  });

  it("requires the decision reason hash in addition to contribution hashes", () => {
    expect(matchesPublicProofHashes("ContributionDecided", {
      expectedHashes: { sourceHash: "0xa", permissionHash: "0xb", contributionHash: "0xc" },
      observedHashes: { sourceHash: "0xa", permissionHash: "0xb", contributionHash: "0xc" }
    }, { sourceHash: "0xa", permissionHash: "0xb", contributionHash: "0xc", reasonCode: "0xd" })).toBe(false);
  });

  it("accepts exact contribution registration hashes", () => {
    const hashes = { sourceHash: "0xa", permissionHash: "0xb", contributionHash: "0xc" };
    expect(matchesPublicProofHashes("ContributionRegistered", {
      expectedHashes: hashes,
      observedHashes: { sourceHash: "0xA", permissionHash: "0xB", contributionHash: "0xC" }
    }, hashes)).toBe(true);
  });

  it("accepts exact creator decision hashes including the reason code", () => {
    const hashes = { sourceHash: "0xa", permissionHash: "0xb", contributionHash: "0xc", reasonCode: "0xd" };
    expect(matchesPublicProofHashes("ContributionDecided", {
      expectedHashes: hashes,
      observedHashes: hashes
    }, hashes)).toBe(true);
  });

  it("rejects an unknown event with no defined hash contract", () => {
    expect(matchesPublicProofHashes("UnknownEvent", {
      expectedHashes: storyHashes,
      observedHashes: storyHashes
    }, storyHashes)).toBe(false);
  });
});


describe("public provenance identity validation", () => {
  const valid = {
    expectedSignerAddress: "0xAbCd",
    expectedEntityId: "0x1234",
    anchorSignerAddress: "0xabcd",
    snapshot: {
      expectedSigner: "0xABCD",
      observedSigner: "0xabcd",
      expectedEntityId: "0x1234",
      observedEntityId: "0x1234"
    }
  };

  it("accepts signer and entity identities bound to authoritative values", () => {
    expect(matchesPublicAnchorIdentity(valid)).toBe(true);
  });

  it("rejects an anchor signer that differs from the authoritative linked wallet", () => {
    expect(matchesPublicAnchorIdentity({ ...valid, anchorSignerAddress: "0x9999" })).toBe(false);
  });

  it("rejects a snapshot signer that differs from the authoritative linked wallet", () => {
    expect(matchesPublicAnchorIdentity({
      ...valid,
      snapshot: { ...valid.snapshot, observedSigner: "0x9999" }
    })).toBe(false);
  });

  it("rejects an entity ID that differs from the authoritative record identity", () => {
    expect(matchesPublicAnchorIdentity({
      ...valid,
      snapshot: { ...valid.snapshot, observedEntityId: "0x9999" }
    })).toBe(false);
  });

  it("fails closed when the authoritative wallet or entity identity is unavailable", () => {
    expect(matchesPublicAnchorIdentity({ ...valid, expectedSignerAddress: null })).toBe(false);
    expect(matchesPublicAnchorIdentity({ ...valid, expectedEntityId: null })).toBe(false);
  });
});


describe("public Mainnet verification predicate", () => {
  const hashes = { sourceHash: "0xaaa", permissionHash: "0xbbb" };
  const anchor = {
    status: "mainnet",
    chainId: 1868,
    contractAddress: "0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880",
    expectedSignerAddress: "0xCreator",
    transactionHash: "0xTransaction",
    blockNumber: "12345",
    verifiedAt: "2026-11-22T12:00:00.000Z",
    eventName: "StoryVersionRegistered",
    verificationSnapshot: {
      chainId: 1868,
      contractAddress: "0x3a302cbb8570a76e8e7e1dc15a763552a3c40880",
      eventName: "StoryVersionRegistered",
      expectedSigner: "0xCreator",
      observedSigner: "0xcreator",
      expectedEntityId: "0xStory",
      observedEntityId: "0xstory",
      expectedHashes: hashes,
      observedHashes: hashes,
      transactionHash: "0xtransaction",
      blockNumber: "12345"
    }
  };
  const input = {
    anchor,
    expectedEvent: "StoryVersionRegistered",
    expectedContractAddress: "0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880",
    expectedSignerAddress: "0xCREATOR",
    expectedEntityId: "0xSTORY",
    expectedHashes: hashes
  };

  it("accepts a complete synthetic verified proof", () => {
    expect(isPublicAnchorVerified(input)).toBe(true);
  });

  it("rejects a persisted contract address that differs from the configured FANOVA contract", () => {
    expect(isPublicAnchorVerified({
      ...input,
      anchor: { ...anchor, contractAddress: "0x0000000000000000000000000000000000000001" }
    })).toBe(false);
  });

  it("fails closed when the canonical contract is not configured", () => {
    expect(isPublicAnchorVerified({ ...input, expectedContractAddress: null })).toBe(false);
  });

  it("rejects a malformed canonical contract configuration", () => {
    expect(isPublicAnchorVerified({ ...input, expectedContractAddress: "0xContract" })).toBe(false);
  });

  it("rejects a persisted chain ID mismatch", () => {
    expect(isPublicAnchorVerified({ ...input, anchor: { ...anchor, chainId: 1 } })).toBe(false);
  });

  it("rejects a snapshot chain ID mismatch", () => {
    expect(isPublicAnchorVerified({ ...input, anchor: { ...anchor, verificationSnapshot: { ...anchor.verificationSnapshot, chainId: 1 } } })).toBe(false);
  });

  it("rejects an event mismatch", () => {
    expect(isPublicAnchorVerified({ ...input, anchor: { ...anchor, eventName: "OtherEvent" } })).toBe(false);
  });

  it("rejects a signer mismatch", () => {
    expect(isPublicAnchorVerified({ ...input, anchor: { ...anchor, expectedSignerAddress: "0xAttacker" } })).toBe(false);
  });

  it("rejects an entity mismatch", () => {
    expect(isPublicAnchorVerified({ ...input, expectedEntityId: "0xOtherStory" })).toBe(false);
  });

  it("rejects transaction and block mismatches", () => {
    expect(isPublicAnchorVerified({ ...input, anchor: { ...anchor, transactionHash: "0xOtherTransaction" } })).toBe(false);
    expect(isPublicAnchorVerified({ ...input, anchor: { ...anchor, blockNumber: "12346" } })).toBe(false);
  });

  it("rejects missing or mismatched authoritative hashes", () => {
    expect(isPublicAnchorVerified({ ...input, expectedHashes: { sourceHash: "0xaaa" } })).toBe(false);
    expect(isPublicAnchorVerified({ ...input, expectedHashes: { ...hashes, permissionHash: "0xwrong" } })).toBe(false);
  });
});
