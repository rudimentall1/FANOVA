import test from "node:test";
import assert from "node:assert/strict";
import { compareEventCoverage } from "./event-coverage.js";

const storyId = "0x" + "ab".repeat(32);
const txStory = "0x" + "11".repeat(32);
const txContribution = "0x" + "22".repeat(32);
const txDecision = "0x" + "33".repeat(32);

function fixture() {
  const localStory = { id: "local-story", version: 1 };
  const contribution = { id: "local-contribution", title: "Fan scene", body: "Text" };
  const record = {
    contributionId: "0x" + "01".repeat(32),
    storyId,
    txHash: txContribution,
    decisionTxHash: txDecision,
    localContributionId: contribution.id
  };
  return {
    args: {
      storyId,
      storyRecord: { storyId, txHash: txStory },
      story: localStory,
      storyVersionEvents: [{ args: { storyId, sourceVersion: 1 }, transactionHash: txStory, blockNumber: 10 }],
      contributionEvents: [{ args: { contributionId: record.contributionId, storyId }, transactionHash: txContribution, blockNumber: 11 }],
      decisionEvents: [{ args: { contributionId: record.contributionId, storyId }, transactionHash: txDecision, blockNumber: 12 }],
      bundle: {
        localStoryAndContributions: { story: localStory, contributions: [contribution] },
        onchainMetadata: { contributions: { [contribution.id]: record } }
      }
    }
  };
}

test("complete event history matches the exported bundle", () => {
  const { args } = fixture();
  const result = compareEventCoverage(args);
  assert.deepEqual(result.incompleteEvidence, []);
  assert.match(result.checks[0], /1 story versions, 1 contributions, and 1 decisions/);
});

test("detects an onchain contribution omitted from the bundle", () => {
  const { args } = fixture();
  args.contributionEvents.push({
    args: { contributionId: "0x" + "02".repeat(32), storyId },
    transactionHash: "0x" + "44".repeat(32),
    blockNumber: 13
  });
  const result = compareEventCoverage(args);
  assert.ok(result.incompleteEvidence.some(item => item.includes("missing from this exported bundle")));
});

test("detects an onchain decision omitted from the bundle", () => {
  const { args } = fixture();
  args.bundle.onchainMetadata.contributions["local-contribution"].decisionTxHash = null;
  const result = compareEventCoverage(args);
  assert.ok(result.incompleteEvidence.some(item => item.includes("decision") && item.includes("missing from this exported bundle")));
});

test("flags historical story versions absent from the bundle", () => {
  const { args } = fixture();
  args.storyVersionEvents.push({
    args: { storyId, sourceVersion: 2 },
    transactionHash: "0x" + "55".repeat(32),
    blockNumber: 14
  });
  const result = compareEventCoverage(args);
  assert.ok(result.incompleteEvidence.some(item => item.includes("story versions")));
});

test("rejects bundle contribution metadata without a matching chain event", () => {
  const { args } = fixture();
  args.bundle.onchainMetadata.contributions["extra"] = {
    contributionId: "0x" + "99".repeat(32), storyId, txHash: "0x" + "66".repeat(32)
  };
  assert.throws(() => compareEventCoverage(args), /registration event was not found/);
});

test("ignores a locally prepared contribution that has no submitted transaction", () => {
  const { args } = fixture();
  args.bundle.onchainMetadata.contributions["pending-local"] = {
    contributionId: "0x" + "77".repeat(32),
    storyId,
    localContributionId: "pending-local"
  };
  const result = compareEventCoverage(args);
  assert.deepEqual(result.incompleteEvidence, []);
});
