import { isPublicAnchorVerified } from "@/lib/provenance-anchor-selection";

type AnchorEvidence = {
  status: string;
  transactionHash: string | null;
  blockNumber: string | null;
  verifiedAt: string | null;
  eventName: string | null;
  chainId: number;
  contractAddress: string;
  expectedSignerAddress: string;
  verificationSnapshot: {
    chainId?: number;
    contractAddress?: string;
    eventName?: string;
    expectedSigner?: string;
    observedSigner?: string;
    observedEntityId?: string;
    expectedEntityId?: string;
    expectedHashes?: Record<string, string>;
    observedHashes?: Record<string, string>;
    transactionHash?: string;
    blockNumber?: string;
  } | null;
} | null;

const EXPLORER_TX = "https://soneium.blockscout.com/tx/";

export function PublicAnchorEvidence({
  label,
  expectedEvent,
  expectedContractAddress,
  anchor,
  ambiguous = false,
  expectedHashes,
  expectedSignerAddress,
  expectedEntityId
}: {
  label: string;
  expectedEvent: string;
  expectedContractAddress: string | null;
  anchor: AnchorEvidence;
  ambiguous?: boolean;
  expectedHashes: Record<string, string | null | undefined>;
  expectedSignerAddress: string | null;
  expectedEntityId: string | null;
}) {
  const verified = isPublicAnchorVerified({
    anchor,
    expectedEvent,
    expectedContractAddress,
    expectedSignerAddress,
    expectedEntityId,
    expectedHashes
  });

  let state = "LOCAL · NOT ANCHORED";
  if (ambiguous) {
    state = "AMBIGUOUS · REVIEW REQUIRED";
  } else if (anchor) {
    if (verified) state = "MAINNET · VERIFIED";
    else if (anchor.status === "failed") state = "FAILED";
    else if (anchor.status === "stale") state = "STALE";
    else if (anchor.status === "pending" || (anchor.transactionHash && !anchor.verifiedAt)) state = "PENDING · NOT VERIFIED";
    else if (anchor.status === "partially_verified" || anchor.status === "mainnet") state = "PARTIALLY VERIFIED";
    else if (anchor.status === "local") state = "LOCAL";
  }

  return (
    <div className="proof-reference">
      <p className="eyebrow">{label}</p>
      <p><strong>{state}</strong></p>
      {verified && anchor ? (
        <>
          <p>Chain ID 1868 · Block {anchor.blockNumber} · Event {expectedEvent}</p>
          <p>Signer: <code>{anchor.expectedSignerAddress}</code></p>
          <a className="text-link" href={EXPLORER_TX + anchor.transactionHash} target="_blank" rel="noreferrer">
            Verify transaction on Blockscout
          </a>
        </>
      ) : !ambiguous && anchor?.transactionHash ? (
        <>
          <p>Transaction is recorded but the expected event has not passed all public-proof checks.</p>
          <code>{anchor.transactionHash}</code>
          <a className="text-link" href={EXPLORER_TX + anchor.transactionHash} target="_blank" rel="noreferrer">
            Inspect transaction on Blockscout
          </a>
        </>
      ) : (
        <p className="field-note">{ambiguous
          ? "Multiple verified anchors exist for this record. Public verification is withheld pending reconciliation."
          : "No verified Soneium transaction is published for this record."}</p>
      )}
    </div>
  );
}
