import test from "node:test";
import assert from "node:assert/strict";
import { inspectLocalBundle } from "./evidence-validation.js";

function bundle() {
  return {
    format: "fanova-evidence-bundle-v1",
    network: { chainId: 1868 },
    contract: "0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880",
    localStoryAndContributions: {
      story: {
        id: "story-1", creatorId: "creator-demo", title: "The Last Signal", body: "Original story.",
        permissions: "Fans may add continuations.", permissionVersion: 1, version: 1
      },
      contributions: [{
        id: "contribution-1", storyId: "story-1", sourceVersion: 1, permissionVersion: 1,
        permissionSnapshot: "Fans may add continuations.", permissionAcknowledged: true,
        title: "Someone", body: "A reply.", status: "approved",
        decision: { outcome: "approved", reviewerId: "creator-demo" }
      }]
    },
    onchainMetadata: { stories: {}, contributions: {}, txs: [] }
  };
}

test("valid local-only evidence is partial, not failed", () => {
  const result = inspectLocalBundle(bundle());
  assert.equal(result.localOnly, true);
  assert.ok(result.incompleteEvidence.some(item => item.includes("No onchain registration")));
});

test("rejects a contribution linked to another story", () => {
  const value = bundle();
  value.localStoryAndContributions.contributions[0].storyId = "other-story";
  assert.throws(() => inspectLocalBundle(value), /not linked/);
});

test("rejects stale source or permission versions", () => {
  const value = bundle();
  value.localStoryAndContributions.contributions[0].sourceVersion = 2;
  assert.throws(() => inspectLocalBundle(value), /different source version/);
  const second = bundle();
  second.localStoryAndContributions.contributions[0].permissionSnapshot = "Changed terms.";
  assert.throws(() => inspectLocalBundle(second), /permission version and text/);
});

test("rejects missing permission acknowledgement", () => {
  const value = bundle();
  value.localStoryAndContributions.contributions[0].permissionAcknowledged = false;
  assert.throws(() => inspectLocalBundle(value), /no permission acknowledgement/);
});

test("rejects inconsistent local decision reviewer or outcome", () => {
  const value = bundle();
  value.localStoryAndContributions.contributions[0].decision.reviewerId = "fan-demo";
  assert.throws(() => inspectLocalBundle(value), /decision consistency/);
});

test("rejects orphaned onchain evidence instead of downgrading it to partial", () => {
  const value = bundle();
  value.onchainMetadata.txs.push("0x" + "1".repeat(64));
  assert.throws(() => inspectLocalBundle(value), /source story metadata is missing/);
});
