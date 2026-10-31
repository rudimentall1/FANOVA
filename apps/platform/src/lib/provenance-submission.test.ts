import { describe, expect, it } from "vitest";
import { encodeFunctionData, type Address, type Hex } from "viem";
import {
  matchesStoryRegistrationCall,
  matchesStoryVersionEvent,
  STORY_REGISTRATION_ABI,
  type ExpectedStoryRegistration
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

import {
  CONTRIBUTION_REGISTRATION_ABI,
  matchesContributionRegisteredEvent,
  matchesContributionRegistrationCall,
  type ExpectedContributionRegistration
} from "./provenance-submission";

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
    expect(matchesContributionRegistrationCall(input, {
      ...expectedContribution,
      permissionAcknowledged: false as true
    })).toBe(false);
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
