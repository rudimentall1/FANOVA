import { validateWalletChallenge, type WalletChallengeForVerification } from "./wallet-challenge";

export function validateWalletUnlinkChallenge(
  message: string,
  challenge: WalletChallengeForVerification,
  expectedWalletAddress: string,
  now = Date.now()
): boolean {
  const address = validateWalletChallenge(message, challenge, now);
  return address !== null && address.toLowerCase() === expectedWalletAddress.toLowerCase();
}
