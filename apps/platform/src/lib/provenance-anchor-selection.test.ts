import { describe, expect, it } from "vitest";
import { matchesPublicProofHashes, selectPublicAnchor, selectUniqueVerifiedAnchor } from "./provenance-anchor-selection";

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
