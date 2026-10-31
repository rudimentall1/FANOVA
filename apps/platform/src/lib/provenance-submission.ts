import {
  decodeFunctionData,
  parseAbi,
  type Address,
  type Hex
} from "viem";

export const STORY_REGISTRATION_ABI = parseAbi([
  "function registerStoryVersion(bytes32 storyId, bytes32 creatorSalt, uint64 sourceVersion, bytes32 sourceHash, uint64 permissionVersion, bytes32 permissionHash)",
  "event StoryVersionRegistered(bytes32 indexed storyId, uint64 indexed sourceVersion, address indexed creator, bytes32 sourceHash, uint64 permissionVersion, bytes32 permissionHash)"
]);

export type ExpectedStoryRegistration = {
  storyId: Hex;
  creatorSalt: Hex;
  sourceVersion: bigint;
  sourceHash: Hex;
  permissionVersion: bigint;
  permissionHash: Hex;
};

export function matchesStoryRegistrationCall(input: Hex, expected: ExpectedStoryRegistration): boolean {
  try {
    const decoded = decodeFunctionData({ abi: STORY_REGISTRATION_ABI, data: input });
    if (decoded.functionName !== "registerStoryVersion") return false;
    const [storyId, creatorSalt, sourceVersion, sourceHash, permissionVersion, permissionHash] = decoded.args;
    return storyId.toLowerCase() === expected.storyId.toLowerCase() &&
      creatorSalt.toLowerCase() === expected.creatorSalt.toLowerCase() &&
      sourceVersion === expected.sourceVersion &&
      sourceHash.toLowerCase() === expected.sourceHash.toLowerCase() &&
      permissionVersion === expected.permissionVersion &&
      permissionHash.toLowerCase() === expected.permissionHash.toLowerCase();
  } catch {
    return false;
  }
}

export type ExpectedStoryVersionEvent = ExpectedStoryRegistration & {
  creator: Address;
};

export function matchesStoryVersionEvent(args: {
  storyId: Hex;
  sourceVersion: bigint;
  creator: Address;
  sourceHash: Hex;
  permissionVersion: bigint;
  permissionHash: Hex;
}, expected: ExpectedStoryVersionEvent): boolean {
  return args.storyId.toLowerCase() === expected.storyId.toLowerCase() &&
    args.sourceVersion === expected.sourceVersion &&
    args.creator.toLowerCase() === expected.creator.toLowerCase() &&
    args.sourceHash.toLowerCase() === expected.sourceHash.toLowerCase() &&
    args.permissionVersion === expected.permissionVersion &&
    args.permissionHash.toLowerCase() === expected.permissionHash.toLowerCase();
}

export const CONTRIBUTION_REGISTRATION_ABI = parseAbi([
  "function registerContribution(bytes32 contributionId, bytes32 storyId, uint64 sourceVersion, uint64 permissionVersion, bytes32 permissionHash, bytes32 contributionHash, bool permissionAcknowledged)",
  "event ContributionRegistered(bytes32 indexed contributionId, bytes32 indexed storyId, uint64 indexed sourceVersion, address contributor, bytes32 contributionHash, uint64 permissionVersion, bytes32 permissionHash, bool permissionAcknowledged)"
]);

export type ExpectedContributionRegistration = {
  contributionId: Hex;
  storyId: Hex;
  sourceVersion: bigint;
  permissionVersion: bigint;
  permissionHash: Hex;
  contributionHash: Hex;
  permissionAcknowledged: true;
};

export function matchesContributionRegistrationCall(
  input: Hex,
  expected: ExpectedContributionRegistration
): boolean {
  try {
    const decoded = decodeFunctionData({ abi: CONTRIBUTION_REGISTRATION_ABI, data: input });
    if (decoded.functionName !== "registerContribution") return false;
    const [contributionId, storyId, sourceVersion, permissionVersion, permissionHash, contributionHash, permissionAcknowledged] = decoded.args;
    return contributionId.toLowerCase() === expected.contributionId.toLowerCase() &&
      storyId.toLowerCase() === expected.storyId.toLowerCase() &&
      sourceVersion === expected.sourceVersion &&
      permissionVersion === expected.permissionVersion &&
      permissionHash.toLowerCase() === expected.permissionHash.toLowerCase() &&
      contributionHash.toLowerCase() === expected.contributionHash.toLowerCase() &&
      permissionAcknowledged === true;
  } catch {
    return false;
  }
}

export type ExpectedContributionRegisteredEvent = ExpectedContributionRegistration & {
  contributor: Address;
};

export function matchesContributionRegisteredEvent(args: {
  contributionId: Hex;
  storyId: Hex;
  sourceVersion: bigint;
  contributor: Address;
  contributionHash: Hex;
  permissionVersion: bigint;
  permissionHash: Hex;
  permissionAcknowledged: boolean;
}, expected: ExpectedContributionRegisteredEvent): boolean {
  return args.contributionId.toLowerCase() === expected.contributionId.toLowerCase() &&
    args.storyId.toLowerCase() === expected.storyId.toLowerCase() &&
    args.sourceVersion === expected.sourceVersion &&
    args.contributor.toLowerCase() === expected.contributor.toLowerCase() &&
    args.contributionHash.toLowerCase() === expected.contributionHash.toLowerCase() &&
    args.permissionVersion === expected.permissionVersion &&
    args.permissionHash.toLowerCase() === expected.permissionHash.toLowerCase() &&
    args.permissionAcknowledged === true;
}


export const CREATOR_DECISION_ABI = parseAbi([
  "function decideContribution(bytes32 contributionId, bool approved, bytes32 reasonCode)",
  "event ContributionDecided(bytes32 indexed contributionId, bytes32 indexed storyId, uint64 indexed sourceVersion, address reviewer, bool approved, bytes32 reasonCode, uint256 decidedAt)"
]);

export type ExpectedCreatorDecision = {
  contributionId: Hex;
  approved: boolean;
  reasonCode: Hex;
};

export function matchesCreatorDecisionCall(input: Hex, expected: ExpectedCreatorDecision): boolean {
  try {
    const decoded = decodeFunctionData({ abi: CREATOR_DECISION_ABI, data: input });
    if (decoded.functionName !== "decideContribution") return false;
    const [contributionId, approved, reasonCode] = decoded.args;
    return contributionId.toLowerCase() === expected.contributionId.toLowerCase() &&
      approved === expected.approved &&
      reasonCode.toLowerCase() === expected.reasonCode.toLowerCase();
  } catch {
    return false;
  }
}

export type ExpectedCreatorDecisionEvent = ExpectedCreatorDecision & {
  storyId: Hex;
  sourceVersion: bigint;
  reviewer: Address;
};

export function matchesCreatorDecisionEvent(args: {
  contributionId: Hex;
  storyId: Hex;
  sourceVersion: bigint;
  reviewer: Address;
  approved: boolean;
  reasonCode: Hex;
  decidedAt: bigint;
}, expected: ExpectedCreatorDecisionEvent): boolean {
  return args.contributionId.toLowerCase() === expected.contributionId.toLowerCase() &&
    args.storyId.toLowerCase() === expected.storyId.toLowerCase() &&
    args.sourceVersion === expected.sourceVersion &&
    args.reviewer.toLowerCase() === expected.reviewer.toLowerCase() &&
    args.approved === expected.approved &&
    args.reasonCode.toLowerCase() === expected.reasonCode.toLowerCase() &&
    args.decidedAt > BigInt(0);
}
