import { isAddress, type Address } from "viem";

export interface WalletChallengeForVerification {
  message: string;
  chainId: number;
  expiresAt: Date;
  consumedAt: Date | null;
}

export function validateWalletChallenge(
  message: string,
  challenge: WalletChallengeForVerification,
  now = Date.now()
): Address | null {
  if (challenge.chainId !== 1868) return null;
  if (challenge.consumedAt !== null || challenge.expiresAt.getTime() <= now) return null;

  const nonce = message.match(/^Nonce: ([A-Za-z0-9_-]{32})$/m)?.[1];
  const address = message.match(/^0x[a-fA-F0-9]{40}$/m)?.[0];
  if (!nonce || !address || !isAddress(address)) return null;

  const expectedNonce = challenge.message.match(/^Nonce: ([A-Za-z0-9_-]{32})$/m)?.[1];
  if (!expectedNonce || nonce !== expectedNonce) return null;

  const expectedMessage = challenge.message.replace("<wallet-address>", address);
  if (expectedMessage === challenge.message || message !== expectedMessage) return null;

  return address as Address;
}
