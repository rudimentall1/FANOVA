import test from "node:test";
import assert from "node:assert/strict";
import {
  captureStoryIntegrity,
  captureContributionIntegrity,
  verifyLocalContentCommitments
} from "./content-integrity.js";

function state() {
  return {
    story: {
      id: "story-1", title: "The Last Signal", body: "Original story.",
      permissions: "Fans may add continuations."
    },
    contributions: [{
      id: "contribution-1", title: "Someone", body: "A reply."
    }]
  };
}

test("creation-time SHA-256 checksums verify unchanged story, permissions, and contribution", async () => {
  const value = state();
  value.story.integrityCommitment = await captureStoryIntegrity(value.story);
  value.contributions[0].integrityCommitment = await captureContributionIntegrity(value.contributions[0]);
  const result = await verifyLocalContentCommitments(value);
  assert.equal(result.checks.length, 2);
  assert.ok(result.incompleteEvidence.some(item => item.includes("same browser-local data")));
});

test("detects story body changed after its checksum was captured", async () => {
  const value = state();
  value.story.integrityCommitment = await captureStoryIntegrity(value.story);
  value.story.body = "Tampered story.";
  await assert.rejects(verifyLocalContentCommitments(value), /source story content does not match/i);
});

test("detects permission text changed after its checksum was captured", async () => {
  const value = state();
  value.story.integrityCommitment = await captureStoryIntegrity(value.story);
  value.story.permissions = "Different rules.";
  await assert.rejects(verifyLocalContentCommitments(value), /permission text does not match/i);
});

test("detects contribution body changed after its checksum was captured", async () => {
  const value = state();
  value.story.integrityCommitment = await captureStoryIntegrity(value.story);
  value.contributions[0].integrityCommitment = await captureContributionIntegrity(value.contributions[0]);
  value.contributions[0].body = "Tampered contribution.";
  await assert.rejects(verifyLocalContentCommitments(value), /contribution content does not match/i);
});

test("legacy bundles without checksums remain incomplete rather than failed", async () => {
  const result = await verifyLocalContentCommitments(state());
  assert.equal(result.checks.length, 0);
  assert.ok(result.incompleteEvidence.some(item => item.includes("No creation-time source-story checksum")));
});
