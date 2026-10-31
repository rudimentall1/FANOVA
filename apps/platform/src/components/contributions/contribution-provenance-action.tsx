"use client";

import { useState } from "react";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { CONTRIBUTION_REGISTRATION_ABI } from "@/lib/provenance-submission";

type AnchorState = {
  id: string;
  status: string;
  contractAddress: string;
  expectedSignerAddress: string;
  transactionHash?: string | null;
  blockNumber?: string | null;
  storyProvenanceVersion?: string | null;
} | null;

type Provider = {
  isRabby?: boolean;
  providers?: Provider[];
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

function rabbyProvider(): Provider | null {
  const injected = (window as unknown as { ethereum?: Provider }).ethereum;
  if (!injected) return null;
  if (injected.providers?.length) return injected.providers.find((provider) => provider.isRabby) ?? null;
  return injected.isRabby ? injected : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The wallet operation failed. Check Rabby and try again.";
}

export function ContributionProvenanceAction({
  contributionId,
  sourceVersionNumber,
  anchor: initialAnchor
}: {
  contributionId: string;
  sourceVersionNumber: number;
  anchor: AnchorState;
}) {
  const [anchor, setAnchor] = useState<AnchorState>(initialAnchor);
  const [transactionHash, setTransactionHash] = useState(initialAnchor?.transactionHash ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<"info" | "success" | "error">("info");

  async function verifySubmitted(hash: string) {
    setKind("info");
    setMessage("Transaction submitted. FANOVA is checking the contribution event and source permissions.");
    const response = await fetch(`/api/contributions/${contributionId}/provenance/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionHash: hash })
    });
    const result = await response.json() as {
      status?: string; error?: string; blockNumber?: string; sourceVersion?: number; explorerUrl?: string;
    };
    if (response.status === 202) {
      setKind("info");
      setMessage(result.error ?? "Transaction is not indexed yet. Retry verification with the same hash.");
      setTransactionHash(hash);
      setAnchor((current) => current ? { ...current, status: "pending", transactionHash: hash } : current);
      localStorage.setItem(`fanova:contribution:tx:${contributionId}`, hash);
      return;
    }
    if (result.status === "FAILED") {
      setTransactionHash(hash);
      setAnchor((current) => current ? { ...current, status: "failed", transactionHash: hash } : current);
      throw new Error(result.error ?? "The server rejected this transaction. Do not submit another transaction for this contribution.");
    }
    if (!response.ok || result.status !== "MAINNET" || !result.explorerUrl) {
      throw new Error(result.error ?? "The server could not verify this contribution transaction.");
    }
    setAnchor((current) => current ? {
      ...current,
      status: "mainnet",
      transactionHash: hash,
      blockNumber: result.blockNumber ?? null,
      storyProvenanceVersion: result.sourceVersion?.toString() ?? current.storyProvenanceVersion ?? null
    } : current);
    localStorage.removeItem(`fanova:contribution:intent:${contributionId}`);
    localStorage.removeItem(`fanova:contribution:tx:${contributionId}`);
    setKind("success");
    setMessage(`Contribution registered on Soneium in block ${result.blockNumber ?? "unknown"}.`);
  }

  async function registerContribution() {
    setBusy(true);
    setMessage("");
    try {
      const provider = rabbyProvider();
      if (!provider) throw new Error("Rabby was not detected. Install or enable Rabby, then reload this page.");
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") throw new Error("Rabby did not return an account.");
      const signer = accounts[0] as Address;
      const chainHex = await provider.request({ method: "eth_chainId" });
      let chainId = typeof chainHex === "string" ? Number.parseInt(chainHex, 16) : Number.NaN;
      if (chainId !== 1868) {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x74c" }] });
        const switched = await provider.request({ method: "eth_chainId" });
        chainId = typeof switched === "string" ? Number.parseInt(switched, 16) : Number.NaN;
      }
      if (chainId !== 1868) throw new Error("Switch Rabby to Soneium Mainnet (Chain ID 1868).");

      if (anchor?.transactionHash) {
        if (signer.toLowerCase() !== anchor.expectedSignerAddress.toLowerCase()) {
          throw new Error("The connected Rabby account does not match the wallet linked to this FANOVA account.");
        }
        await verifySubmitted(anchor.transactionHash);
        return;
      }

      const storageKey = `fanova:contribution:intent:${contributionId}`;
      let idempotencyKey = localStorage.getItem(storageKey);
      if (!idempotencyKey) {
        idempotencyKey = crypto.randomUUID();
        localStorage.setItem(storageKey, idempotencyKey);
      }
      const intentResponse = await fetch(`/api/contributions/${contributionId}/provenance/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey })
      });
      const intent = await intentResponse.json() as {
        anchor?: NonNullable<AnchorState>;
        transaction?: { args?: unknown[] };
        error?: string;
      };
      if (!intentResponse.ok || !intent.anchor || !Array.isArray(intent.transaction?.args)) {
        throw new Error(intent.error ?? "Could not prepare the contribution registration transaction.");
      }
      const activeAnchor = intent.anchor;
      setAnchor(activeAnchor);
      if (signer.toLowerCase() !== activeAnchor.expectedSignerAddress.toLowerCase()) {
        throw new Error("The connected Rabby account does not match the wallet linked to this FANOVA account.");
      }

      const pendingHash = localStorage.getItem(`fanova:contribution:tx:${contributionId}`);
      if (pendingHash && /^0x[0-9a-fA-F]{64}$/.test(pendingHash)) {
        setTransactionHash(pendingHash);
        await verifySubmitted(pendingHash);
        return;
      }

      const args = intent.transaction.args;
      if (args.length !== 7 || args.slice(0, 6).some((value) => typeof value !== "string") || args[6] !== true) {
        throw new Error("The server returned an invalid contribution registration payload.");
      }
      const data = encodeFunctionData({
        abi: CONTRIBUTION_REGISTRATION_ABI,
        functionName: "registerContribution",
        args: [
          args[0] as Hex,
          args[1] as Hex,
          BigInt(args[2] as string),
          BigInt(args[3] as string),
          args[4] as Hex,
          args[5] as Hex,
          true
        ]
      });
      const sent = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: signer, to: activeAnchor.contractAddress as Address, data, value: "0x0" }]
      });
      if (typeof sent !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(sent)) {
        throw new Error("Rabby did not return a valid transaction hash.");
      }
      setTransactionHash(sent);
      localStorage.setItem(`fanova:contribution:tx:${contributionId}`, sent);
      await verifySubmitted(sent);
    } catch (error) {
      setKind("error");
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function retryVerification() {
    if (!anchor?.id || !transactionHash) return;
    setBusy(true);
    try {
      await verifySubmitted(transactionHash);
    } catch (error) {
      setKind("error");
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (anchor?.status === "mainnet" && anchor.transactionHash) {
    return (
      <div className="provenance-action">
        <span className="work-status published">MAINNET VERIFIED</span>
        <p className="field-note">Contribution for source app version {sourceVersionNumber} registered against story provenance sequence {anchor.storyProvenanceVersion ?? "recorded"} in Soneium block {anchor.blockNumber ?? "recorded"}.</p>
        <a className="text-link" href={`https://soneium.blockscout.com/tx/${anchor.transactionHash}`} target="_blank" rel="noreferrer">View transaction on Blockscout</a>
      </div>
    );
  }

  if (anchor?.status === "failed" && anchor.transactionHash) {
    return (
      <div className="provenance-action">
        <span className="work-status">PROVENANCE FAILED</span>
        <p className="field-note">The server rejected this transaction. Do not send another transaction for this contribution. Contact support before proceeding.</p>
        <p className="field-note">Transaction hash: <code>{anchor.transactionHash}</code></p>
        <a className="text-link" href={`https://soneium.blockscout.com/tx/${anchor.transactionHash}`} target="_blank" rel="noreferrer">Inspect transaction on Blockscout</a>
      </div>
    );
  }

  return (
    <div className="provenance-action">
      {anchor?.transactionHash ? (
        <>
          <span className="work-status">PENDING VERIFICATION</span>
          <p className="field-note">Transaction hash: <code>{anchor.transactionHash}</code></p>
          <button className="secondary-button" type="button" onClick={retryVerification} disabled={busy}>
            {busy ? "Checking…" : "Retry verification"}
          </button>
        </>
      ) : (
        <>
          <span className="panel-label">SONEIUM CONTRIBUTION PROVENANCE</span>
          <p className="field-note">Register your contribution against the creator's confirmed story version {sourceVersionNumber}. Rabby will ask you to approve the transaction. FANOVA never receives your private key.</p>
          <button className="primary-button" type="button" onClick={registerContribution} disabled={busy}>
            {busy ? "Waiting for Rabby…" : "Register contribution on Soneium"}
          </button>
        </>
      )}
      {message ? <p className={`form-status ${kind}`} role="status">{message}</p> : null}
    </div>
  );
}
