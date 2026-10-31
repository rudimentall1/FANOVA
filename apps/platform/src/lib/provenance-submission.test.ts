import { describe, expect, it } from "vitest";
import { encodeFunctionData, type Address, type Hex } from "viem";
import {
  matchesStoryRegistrationCall,
  matchesStoryVersionEvent,
  STORY_REGISTRATION_ABI,
  type ExpectedStoryRegistration,
  CONTRIBUTION_REGISTRATION_ABI,
  matchesContributionRegisteredEvent,
  matchesContributionRegistrationCall,
  type ExpectedContributionRegistration,
  CREATOR_DECISION_ABI,
  matchesCreatorDecisionCall,
  matchesCreatorDecisionEvent,
  type ExpectedCreatorDecision
} from "./provenance-submission";

const expected: ExpectedStoryRegistration = {
  storyId: `0x${"11".repeat(32)}` as Hex,
  creatorSalt: `0x${"22".repeat(32)}` as Hex,
  sourceVersion: BigInt(1),
  sourceHash: `0x${"33".repeat(32)}` as Hex,
  permissionVersion: BigInt(1),
  permissionHash: `0x${"44".repeat(32)}` as Hex
};
const creator = "0x1234567890123456789012345678901234567890" as Address;

describe("server-side story registration verification", () => {
  it("accepts calldata only when every argument matches the stored intent", () => {
    const input = encodeFunctionData({
      abi: STORY_REGISTRATION_ABI,
      functionName: "registerStoryVersion",
      args: [expected.storyId, expected.creatorSalt, expected.sourceVersion, expected.sourceHash, expected.permissionVersion, expected.permissionHash]
    });
    expect(matchesStoryRegistrationCall(input, expected)).toBe(true);
    expect(matchesStoryRegistrationCall(input, { ...expected, permissionHash: `0x${"55".repeat(32)}` as Hex })).toBe(false);
    expect(matchesStoryRegistrationCall("0x1234" as Hex, expected)).toBe(false);
  });

  it("accepts only the exact expected StoryVersionRegistered event fields", () => {
    const event = {
      storyId: expected.storyId,
      sourceVersion: expected.sourceVersion,
      creator,
      sourceHash: expected.sourceHash,
      permissionVersion: expected.permissionVersion,
      permissionHash: expected.permissionHash
    };
    expect(matchesStoryVersionEvent(event, { ...expected, creator })).toBe(true);
    expect(matchesStoryVersionEvent({ ...event, creator: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Address }, { ...expected, creator })).toBe(false);
    expect(matchesStoryVersionEvent({ ...event, sourceVersion: BigInt(2) }, { ...expected, creator })).toBe(false);
  });
});


const expectedContribution: ExpectedContributionRegistration = {
  contributionId: `0x${"55".repeat(32)}` as Hex,
  storyId: `0x${"11".repeat(32)}` as Hex,
  sourceVersion: BigInt(2),
  permissionVersion: BigInt(1),
  permissionHash: `0x${"44".repeat(32)}` as Hex,
  contributionHash: `0x${"66".repeat(32)}` as Hex,
  permissionAcknowledged: true
};

describe("server-side contribution registration verification", () => {
  it("accepts calldata only when every contribution and permission field matches", () => {
    const input = encodeFunctionData({
      abi: CONTRIBUTION_REGISTRATION_ABI,
      functionName: "registerContribution",
      args: [
        expectedContribution.contributionId,
        expectedContribution.storyId,
        expectedContribution.sourceVersion,
        expectedContribution.permissionVersion,
        expectedContribution.permissionHash,
        expectedContribution.contributionHash,
        true
      ]
    });
    expect(matchesContributionRegistrationCall(input, expectedContribution)).toBe(true);
    expect(matchesContributionRegistrationCall(input, {
      ...expectedContribution,
      contributionHash: `0x${"77".repeat(32)}` as Hex
    })).toBe(false);
    const unacknowledgedInput = encodeFunctionData({
      abi: CONTRIBUTION_REGISTRATION_ABI,
      functionName: "registerContribution",
      args: [
        expectedContribution.contributionId,
        expectedContribution.storyId,
        expectedContribution.sourceVersion,
        expectedContribution.permissionVersion,
        expectedContribution.permissionHash,
        expectedContribution.contributionHash,
        false
      ]
    });
    expect(matchesContributionRegistrationCall(unacknowledgedInput, expectedContribution)).toBe(false);
    expect(matchesContributionRegistrationCall("0x1234" as Hex, expectedContribution)).toBe(false);
  });

  it("accepts only the exact expected ContributionRegistered event", () => {
    const event = {
      ...expectedContribution,
      contributor: creator,
      permissionAcknowledged: true
    };
    expect(matchesContributionRegisteredEvent(event, { ...expectedContribution, contributor: creator })).toBe(true);
    expect(matchesContributionRegisteredEvent({ ...event, contributor: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Address }, { ...expectedContribution, contributor: creator })).toBe(false);
    expect(matchesContributionRegisteredEvent({ ...event, permissionAcknowledged: false }, { ...expectedContribution, contributor: creator })).toBe(false);
  });
});


const expectedDecision: ExpectedCreatorDecision = {
  contributionId: `0x${"88".repeat(32)}` as Hex,
  approved: false,
  reasonCode: `0x${"99".repeat(32)}` as Hex
};

describe("server-side creator decision verification", () => {
  it("accepts calldata only when contribution, decision, and reason hash match", () => {
    const input = encodeFunctionData({
      abi: CREATOR_DECISION_ABI,
      functionName: "decideContribution",
      args: [expectedDecision.contributionId, expectedDecision.approved, expectedDecision.reasonCode]
    });
    expect(matchesCreatorDecisionCall(input, expectedDecision)).toBe(true);
    expect(matchesCreatorDecisionCall(input, { ...expectedDecision, approved: true })).toBe(false);
    expect(matchesCreatorDecisionCall(input, { ...expectedDecision, reasonCode: `0x${"aa".repeat(32)}` as Hex })).toBe(false);
    expect(matchesCreatorDecisionCall("0x1234" as Hex, expectedDecision)).toBe(false);
  });

  it("accepts only the exact expected ContributionDecided event", () => {
    const event = {
      ...expectedDecision,
      storyId: `0x${"11".repeat(32)}` as Hex,
      sourceVersion: BigInt(2),
      reviewer: creator,
      decidedAt: BigInt(1)
    };
    const expected = { ...expectedDecision, storyId: event.storyId, sourceVersion: 2n, reviewer: creator };
    expect(matchesCreatorDecisionEvent(event, expected)).toBe(true);
    expect(matchesCreatorDecisionEvent({ ...event, reviewer: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Address }, expected)).toBe(false);
    expect(matchesCreatorDecisionEvent({ ...event, approved: true }, expected)).toBe(false);
    expect(matchesCreatorDecisionEvent({ ...event, decidedAt: BigInt(0) }, expected)).toBe(false);
  });
});
