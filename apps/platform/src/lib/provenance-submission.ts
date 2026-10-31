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
