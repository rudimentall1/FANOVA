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
