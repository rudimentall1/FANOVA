import {
  encodeAbiParameters,
  keccak256,
  toBytes,
  type Address,
  type Hex
} from "viem";

export const FANOVA_CHAIN_ID = 1868;

export function deriveStoryIdentity(workId: string, creatorAddress: Address): {
  creatorSalt: Hex;
  storyId: Hex;
} {
  const creatorSalt = keccak256(toBytes(`fanova:work:${workId}`));
  const storyId = keccak256(encodeAbiParameters(
    [{ type: "address" }, { type: "bytes32" }],
    [creatorAddress, creatorSalt]
  ));
  return { creatorSalt, storyId };
}

export function asBytes32Hash(hash: string): Hex | null {
  if (!/^[0-9a-f]{64}$/i.test(hash)) return null;
  return `0x${hash}` as Hex;
}

/**
 * Permission versions advance only when the permission hash changes.
 * Returns null for invalid or exhausted prior versions.
 */
export function nextPermissionVersion(
  currentPermissionHash: string,
  previousPermissionHash: string,
  previousPermissionVersion: number
): number | null {
  if (!Number.isSafeInteger(previousPermissionVersion) ||
      previousPermissionVersion < 1 ||
      previousPermissionVersion >= Number.MAX_SAFE_INTEGER) return null;
  return currentPermissionHash.toLowerCase() === previousPermissionHash.toLowerCase()
    ? previousPermissionVersion
    : previousPermissionVersion + 1;
}

/**
 * Contract story versions count successful provenance registrations, not saved drafts.
 */
export function nextProvenanceVersion(previousProvenanceVersion: number): number | null {
  if (!Number.isSafeInteger(previousProvenanceVersion) ||
      previousProvenanceVersion < 1 ||
      previousProvenanceVersion >= Number.MAX_SAFE_INTEGER) return null;
  return previousProvenanceVersion + 1;
}

export function deriveContributionIdentity(contributionId: string): Hex {
  return keccak256(toBytes(`fanova:contribution:${contributionId}`));
}
