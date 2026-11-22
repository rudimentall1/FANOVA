import { describe, expect, it } from "vitest";
import { isPublicAnchorVerified, matchesPublicAnchorIdentity, matchesPublicProofHashes, selectPublicAnchor, selectUniqueVerifiedAnchor } from "./provenance-anchor-selection";

type Attempt = { id: string; status: string; createdAt: Date };

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const HASH_D = "d".repeat(64);
const HASH_E = "e".repeat(64);
const prefixHashes = (hashes: Record<string, string>) => Object.fromEntries(
  Object.entries(hashes).map(([key, value]) => [key, `0x${value}`])
);

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
  const storyHashes = { sourceHash: HASH_A, permissionHash: HASH_B };

  it("accepts the exact operation-specific keys bound to authoritative values", () => {
    expect(matchesPublicProofHashes("StoryVersionRegistered", {
      expectedHashes: storyHashes,
      observedHashes: { sourceHash: `0x${HASH_A.toUpperCase()}`, permissionHash: `0x${HASH_B.toUpperCase()}` }
    }, storyHashes)).toBe(true);
  });

  it("normalizes 0x-prefixed on-chain bytes32 hashes against raw persisted SHA-256 hex", () => {
    const sourceHash = "a".repeat(64);
    const permissionHash = "b".repeat(64);
    expect(matchesPublicProofHashes("StoryVersionRegistered", {
      expectedHashes: {
        sourceHash: `0x${sourceHash.toUpperCase()}`,
        permissionHash: `0x${permissionHash.toUpperCase()}`
      },
      observedHashes: {
        sourceHash: `0x${sourceHash}`,
        permissionHash: `0x${permissionHash}`
      }
    }, { sourceHash, permissionHash })).toBe(true);
  });

  it("rejects missing required keys", () => {
    expect(matchesPublicProofHashes("StoryVersionRegistered", {
      expectedHashes: { sourceHash: HASH_A },
      observedHashes: { sourceHash: HASH_A }
    }, storyHashes)).toBe(false);
  });

  it("rejects extra keys even when required hashes match", () => {
    expect(matchesPublicProofHashes("StoryVersionRegistered", {
      expectedHashes: { ...storyHashes, unexpected: HASH_C },
      observedHashes: { ...storyHashes, unexpected: "0x123" }
    }, storyHashes)).toBe(false);
  });

  it("rejects snapshots that match each other but not the authoritative entity", () => {
    expect(matchesPublicProofHashes("StoryVersionRegistered", {
      expectedHashes: { sourceHash: HASH_C, permissionHash: HASH_B },
      observedHashes: { sourceHash: HASH_C, permissionHash: HASH_B }
    }, storyHashes)).toBe(false);
  });

  it("requires the decision reason hash in addition to contribution hashes", () => {
    expect(matchesPublicProofHashes("ContributionDecided", {
      expectedHashes: { sourceHash: HASH_A, permissionHash: HASH_B, contributionHash: HASH_C },
      observedHashes: { sourceHash: HASH_A, permissionHash: HASH_B, contributionHash: HASH_C }
    }, { sourceHash: HASH_A, permissionHash: HASH_B, contributionHash: HASH_C, reasonCode: HASH_D })).toBe(false);
  });

  it("accepts exact contribution registration hashes", () => {
    const hashes = { sourceHash: HASH_A, permissionHash: HASH_B, contributionHash: HASH_C };
    expect(matchesPublicProofHashes("ContributionRegistered", {
      expectedHashes: hashes,
      observedHashes: { sourceHash: `0x${HASH_A.toUpperCase()}`, permissionHash: `0x${HASH_B.toUpperCase()}`, contributionHash: `0x${HASH_C.toUpperCase()}` }
    }, hashes)).toBe(true);
  });

  it("accepts exact creator decision hashes including the reason code", () => {
    const hashes = { sourceHash: HASH_A, permissionHash: HASH_B, contributionHash: HASH_C, reasonCode: HASH_D };
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
  const hashes = { sourceHash: HASH_A, permissionHash: HASH_B };
  const snapshotHashes = prefixHashes(hashes);
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
      expectedHashes: snapshotHashes,
      observedHashes: snapshotHashes,
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

  it("keeps a historical proof valid after the linked wallet is replaced", () => {
    const replacementWallet = "0xReplacementWallet";
    expect(replacementWallet.toLowerCase()).not.toBe(anchor.expectedSignerAddress.toLowerCase());
    expect(isPublicAnchorVerified({
      ...input,
      // The public page resolves this from the immutable intent row, not linked_wallet.
      expectedSignerAddress: anchor.expectedSignerAddress
    })).toBe(true);
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

  it("requires complete entity and hash evidence for a contribution registration anchor", () => {
    const contributionHashes = {
      sourceHash: HASH_A,
      permissionHash: HASH_B,
      contributionHash: HASH_C
    };
    const contributionAnchor = {
      ...anchor,
      eventName: "ContributionRegistered",
      verificationSnapshot: {
        ...anchor.verificationSnapshot,
        eventName: "ContributionRegistered",
        expectedEntityId: "0xContributionId",
        observedEntityId: "0xContributionId",
        expectedHashes: prefixHashes(contributionHashes),
        observedHashes: prefixHashes(contributionHashes)
      }
    };
    const contributionInput = {
      ...input,
      anchor: contributionAnchor,
      expectedEvent: "ContributionRegistered",
      expectedEntityId: "0xContributionId",
      expectedHashes: contributionHashes
    };
    expect(isPublicAnchorVerified(contributionInput)).toBe(true);
    expect(isPublicAnchorVerified({
      ...contributionInput,
      anchor: {
        ...contributionAnchor,
        verificationSnapshot: {
          ...contributionAnchor.verificationSnapshot,
          observedEntityId: "0xOtherContribution"
        }
      }
    })).toBe(false);
    expect(isPublicAnchorVerified({
      ...contributionInput,
      anchor: {
        ...contributionAnchor,
        verificationSnapshot: {
          ...contributionAnchor.verificationSnapshot,
          observedHashes: { ...prefixHashes(contributionHashes), contributionHash: `0x${HASH_E}` }
        }
      }
    })).toBe(false);
  });

  it("requires the creator decision reason hash in historical anchor evidence", () => {
    const decisionHashes = {
      sourceHash: HASH_A,
      permissionHash: HASH_B,
      contributionHash: HASH_C,
      reasonCode: HASH_D
    };
    const decisionAnchor = {
      ...anchor,
      eventName: "ContributionDecided",
      verificationSnapshot: {
        ...anchor.verificationSnapshot,
        eventName: "ContributionDecided",
        expectedEntityId: "0xContributionId",
        observedEntityId: "0xContributionId",
        expectedHashes: prefixHashes(decisionHashes),
        observedHashes: prefixHashes(decisionHashes)
      }
    };
    expect(isPublicAnchorVerified({
      ...input,
      anchor: decisionAnchor,
      expectedEvent: "ContributionDecided",
      expectedEntityId: "0xContributionId",
      expectedHashes: decisionHashes
    })).toBe(true);
    expect(isPublicAnchorVerified({
      ...input,
      anchor: {
        ...decisionAnchor,
        verificationSnapshot: {
          ...decisionAnchor.verificationSnapshot,
          expectedHashes: { ...prefixHashes(decisionHashes), reasonCode: `0x${HASH_E}` }
        }
      },
      expectedEvent: "ContributionDecided",
      expectedEntityId: "0xContributionId",
      expectedHashes: decisionHashes
    })).toBe(false);
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
    expect(isPublicAnchorVerified({ ...input, expectedHashes: { sourceHash: HASH_A } })).toBe(false);
    expect(isPublicAnchorVerified({ ...input, expectedHashes: { ...hashes, permissionHash: HASH_E } })).toBe(false);
  });
});
