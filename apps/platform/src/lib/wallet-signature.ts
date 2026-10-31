import { isAddress, verifyMessage, type Address, type Hex } from "viem";

export function bindWalletAddress(messageTemplate: string, address: string): string | null {
  if (!isAddress(address) || (messageTemplate.match(/<wallet-address>/g) ?? []).length !== 1) return null;
  return messageTemplate.replace("<wallet-address>", address);
}

export async function verifyWalletSignature(
  address: Address,
  message: string,
  signature: Hex
): Promise<boolean> {
  try {
    return await verifyMessage({ address, message, signature });
  } catch {
    return false;
  }
}
