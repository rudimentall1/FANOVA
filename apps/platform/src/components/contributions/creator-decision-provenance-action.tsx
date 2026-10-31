"use client";

import { useState } from "react";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { CREATOR_DECISION_ABI } from "@/lib/provenance-submission";

type AnchorState = {
  id: string;
  status: string;
  expectedSignerAddress: string;
  contractAddress: string;
  transactionHash: string | null;
  blockNumber: string | null;
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

export function CreatorDecisionProvenanceAction({
  contributionId,
  approved,
  anchor: initialAnchor
}: {
  contributionId: string;
  approved: boolean;
  anchor: AnchorState;
}) {
  const [anchor, setAnchor] = useState<AnchorState>(initialAnchor);
  const [transactionHash, setTransactionHash] = useState(initialAnchor?.transactionHash ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function verify(hash: string) {
    const response = await fetch(`/api/contributions/${contributionId}/decision/provenance/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionHash: hash })
    });
    const result = await response.json() as { status?: string; error?: string; blockNumber?: string; explorerUrl?: string };
    if (response.status === 202) {
      setMessage(result.error ?? "Transaction is not indexed yet. Retry with the same hash.");
      setTransactionHash(hash);
      setAnchor((current) => current ? { ...current, status: "pending", transactionHash: hash } : current);
      localStorage.setItem(`fanova:decision:tx:${contributionId}`, hash);
      return;
    }
    if (result.status === "FAILED") {
      setTransactionHash(hash);
      setAnchor((current) => current ? { ...current, status: "failed", transactionHash: hash } : current);
      throw new Error(result.error ?? "The server rejected this transaction. Do not submit another transaction.");
    }
    if (!response.ok || result.status !== "MAINNET" || !result.explorerUrl) {
      throw new Error(result.error ?? "The server could not verify this creator decision.");
    }
    setAnchor((current) => current ? { ...current, status: "mainnet", transactionHash: hash, blockNumber: result.blockNumber ?? null } : current);
    localStorage.removeItem(`fanova:decision:intent:${contributionId}`);
    localStorage.removeItem(`fanova:decision:tx:${contributionId}`);
    setMessage(`Creator decision verified on Soneium in block ${result.blockNumber ?? "unknown"}.`);
  }

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const provider = rabbyProvider();
      if (!provider) throw new Error("Rabby was not detected. Install or enable Rabby, then reload this page.");
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") throw new Error("Rabby did not return an account.");
      const signer = accounts[0] as Address;
      let chainHex = await provider.request({ method: "eth_chainId" });
      let chainId = typeof chainHex === "string" ? Number.parseInt(chainHex, 16) : Number.NaN;
      if (chainId !== 1868) {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x74c" }] });
        chainHex = await provider.request({ method: "eth_chainId" });
        chainId = typeof chainHex === "string" ? Number.parseInt(chainHex, 16) : Number.NaN;
      }
      if (chainId !== 1868) throw new Error("Switch Rabby to Soneium Mainnet (Chain ID 1868).");

      if (anchor?.transactionHash) {
        if (signer.toLowerCase() !== anchor.expectedSignerAddress.toLowerCase()) {
          throw new Error("The connected Rabby account does not match the creator wallet linked to this FANOVA account.");
        }
        await verify(anchor.transactionHash);
        return;
      }

      const storageKey = `fanova:decision:intent:${contributionId}`;
      let idempotencyKey = localStorage.getItem(storageKey);
      if (!idempotencyKey) {
        idempotencyKey = crypto.randomUUID();
        localStorage.setItem(storageKey, idempotencyKey);
      }
      const intentResponse = await fetch(`/api/contributions/${contributionId}/decision/provenance/intent`, {
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
        throw new Error(intent.error ?? "Could not prepare the creator decision transaction.");
      }
      setAnchor(intent.anchor);
      if (signer.toLowerCase() !== intent.anchor.expectedSignerAddress.toLowerCase()) {
        throw new Error("The connected Rabby account does not match the creator wallet linked to this FANOVA account.");
      }

      const pendingHash = localStorage.getItem(`fanova:decision:tx:${contributionId}`);
      if (pendingHash && /^0x[0-9a-fA-F]{64}$/.test(pendingHash)) {
        setTransactionHash(pendingHash);
        await verify(pendingHash);
        return;
      }

      const args = intent.transaction.args;
      if (args.length !== 3 || typeof args[0] !== "string" || typeof args[1] !== "boolean" || typeof args[2] !== "string" || args[1] !== approved) {
        throw new Error("The server returned an invalid creator decision payload.");
      }
      const data = encodeFunctionData({
        abi: CREATOR_DECISION_ABI,
        functionName: "decideContribution",
        args: [args[0] as Hex, args[1], args[2] as Hex]
      });
      const sent = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: signer, to: intent.anchor.contractAddress as Address, data, value: "0x0" }]
      });
      if (typeof sent !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(sent)) throw new Error("Rabby did not return a valid transaction hash.");
      setTransactionHash(sent);
      localStorage.setItem(`fanova:decision:tx:${contributionId}`, sent);
      await verify(sent);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (anchor?.status === "mainnet" && anchor.transactionHash) {
    return <div className="provenance-action">
      <span className="work-status published">MAINNET VERIFIED</span>
      <p className="field-note">Creator {approved ? "approval" : "rejection"} recorded on Soneium in block {anchor.blockNumber ?? "recorded"}.</p>
      <a className="text-link" href={`https://soneium.blockscout.com/tx/${anchor.transactionHash}`} target="_blank" rel="noreferrer">View decision on Blockscout</a>
    </div>;
  }

  if (anchor?.status === "failed" && anchor.transactionHash) {
    return <div className="provenance-action">
      <span className="work-status">PROVENANCE FAILED</span>
      <p className="field-note">The server rejected this transaction. Do not submit another transaction for this decision.</p>
      <a className="text-link" href={`https://soneium.blockscout.com/tx/${anchor.transactionHash}`} target="_blank" rel="noreferrer">Inspect transaction on Blockscout</a>
    </div>;
  }

  return <div className="provenance-action">
    {anchor?.transactionHash ? <><span className="work-status">PENDING VERIFICATION</span><p className="field-note">Transaction hash: <code>{anchor.transactionHash}</code></p></> : <>
      <span className="panel-label">SONEIUM CREATOR DECISION</span>
      <p className="field-note">Record this {approved ? "approval" : "rejection"} on Soneium. Rabby will ask you to approve the transaction. FANOVA never receives your private key.</p>
    </>}
    <button className="secondary-button" type="button" onClick={submit} disabled={busy}>{busy ? "Waiting for Rabby…" : anchor?.transactionHash ? "Retry verification" : "Record decision on Soneium"}</button>
    {message ? <p className="form-status info" role="status">{message}</p> : null}
  </div>;
}
