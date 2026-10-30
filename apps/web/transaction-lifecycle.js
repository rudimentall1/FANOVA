export async function confirmWalletTransaction(txResponse, { onSubmitted, onPending } = {}) {
  const hash = txResponse?.hash;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash || "")) {
    throw new Error("Wallet did not return a valid transaction hash.");
  }

  try {
    onSubmitted?.(hash);
  } catch (error) {
    throw new Error(`Transaction ${hash} was submitted, but its recovery reference could not be saved locally: ${error?.message || "storage error"}`);
  }

  onPending?.(hash);
  const receipt = await txResponse.wait();
  if (!receipt || receipt.status !== 1) {
    throw new Error(`Transaction ${hash} failed onchain. Inspect the receipt before retrying.`);
  }

  return { hash, blockNumber: receipt.blockNumber };
}
