"use client";

import { useEffect, useState } from "react";
import { stringToHex, type Address } from "viem";

type WalletRecord = { address: string; chainId: number; verifiedAt: string } | null;
type Status = { kind: "error" | "success" | "info"; message: string } | null;
type Eip1193Provider = {
  isRabby?: boolean;
  providers?: Eip1193Provider[];
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};
declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

function getRabbyProvider(): Eip1193Provider | null {
  const injected = window.ethereum;
  if (!injected) return null;
  if (injected.providers?.length) return injected.providers.find((provider) => provider.isRabby) ?? null;
  return injected.isRabby ? injected : null;
}

export function WalletLinkPanel() {
  const [wallet, setWallet] = useState<WalletRecord>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function refreshWallet() {
    try {
      const response = await fetch("/api/wallet", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the linked wallet.");
      const data = await response.json() as { wallet: WalletRecord };
      setWallet(data.wallet);
    } catch {
      setStatus({ kind: "error", message: "Could not load wallet status. Refresh the page and try again." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refreshWallet(); }, []);

  async function unlinkWallet() {
    if (!wallet) return;
    setBusy(true);
    setStatus({ kind: "info", message: "Confirm the unlink request by signing a message with the currently linked wallet. No transaction will be sent." });
    try {
      const provider = getRabbyProvider();
      if (!provider) throw new Error("Rabby was not detected. Install or enable the Rabby browser extension, then reload this page.");

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string" ||
          accounts[0].toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error("Select the currently linked wallet in Rabby before unlinking it.");
      }

      const chainHex = await provider.request({ method: "eth_chainId" });
      const chainId = typeof chainHex === "string" ? Number.parseInt(chainHex, 16) : Number.NaN;
      if (chainId !== 1868) {
        try {
          await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x74c" }] });
        } catch {
          throw new Error("Switch Rabby to Soneium Mainnet (Chain ID 1868), then try again.");
        }
        const switchedChain = await provider.request({ method: "eth_chainId" });
        if (typeof switchedChain !== "string" || Number.parseInt(switchedChain, 16) !== 1868) {
          throw new Error("Rabby is not connected to Soneium Mainnet (Chain ID 1868).");
        }
      }

      const challengeResponse = await fetch("/api/wallet/unlink/challenge", { method: "POST" });
      const challenge = await challengeResponse.json() as { message?: string; error?: string };
      if (!challengeResponse.ok || !challenge.message) {
        throw new Error(challenge.error ?? "Could not create a wallet unlink challenge.");
      }

      const signature = await provider.request({
        method: "personal_sign",
        params: [stringToHex(challenge.message), wallet.address]
      });
      if (typeof signature !== "string") throw new Error("The wallet did not return a signature.");

      const unlinkResponse = await fetch("/api/wallet/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: challenge.message, signature })
      });
      const result = await unlinkResponse.json() as { status?: string; error?: string };
      if (!unlinkResponse.ok || result.status !== "unlinked") {
        throw new Error(result.error ?? "The server could not verify this unlink request.");
      }
      setWallet(null);
      setStatus({ kind: "success", message: "Wallet safely unlinked. You can now connect another Soneium wallet." });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Wallet unlinking failed. Try again."
      });
    } finally {
      setBusy(false);
    }
  }

  async function connectWallet() {
    setBusy(true);
    setStatus({ kind: "info", message: "Connect your wallet. FANOVA will request a message signature only, never a transaction." });
    try {
      const provider = getRabbyProvider();
      if (!provider) throw new Error("Rabby was not detected. Install or enable the Rabby browser extension, then reload this page.");

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        throw new Error("The wallet did not return an account.");
      }
      const address = accounts[0] as Address;

      const chainHex = await provider.request({ method: "eth_chainId" });
      const chainId = typeof chainHex === "string" ? Number.parseInt(chainHex, 16) : Number.NaN;
      if (chainId !== 1868) {
        try {
          await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x74c" }] });
        } catch {
          throw new Error("Switch Rabby to Soneium Mainnet (Chain ID 1868), then try again.");
        }
        const switchedChain = await provider.request({ method: "eth_chainId" });
        if (typeof switchedChain !== "string" || Number.parseInt(switchedChain, 16) !== 1868) {
          throw new Error("Rabby is not connected to Soneium Mainnet (Chain ID 1868).");
        }
      }

      const challengeResponse = await fetch("/api/wallet/challenge", { method: "POST" });
      const challenge = await challengeResponse.json() as { messageTemplate?: string; error?: string };
      if (!challengeResponse.ok || !challenge.messageTemplate) {
        throw new Error(challenge.error ?? "Could not create a wallet challenge.");
      }

      const message = challenge.messageTemplate.replace("<wallet-address>", address);
      const signature = await provider.request({
        method: "personal_sign",
        params: [stringToHex(message), address]
      });
      if (typeof signature !== "string") throw new Error("The wallet did not return a signature.");

      const verifyResponse = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature })
      });
      const verification = await verifyResponse.json() as { wallet?: WalletRecord; error?: string };
      if (!verifyResponse.ok || !verification.wallet) {
        throw new Error(verification.error ?? "The server could not verify this wallet.");
      }
      setWallet(verification.wallet);
      setStatus({ kind: "success", message: "Wallet signature verified and linked to this FANOVA account." });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Wallet linking failed. Try again."
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-panel wallet-panel" aria-labelledby="wallet-heading">
      <div>
        <span className="panel-label">S O N E I U M · 1868</span>
        <h2 id="wallet-heading">Wallet identity</h2>
        <p className="field-note">Link one wallet to prove which Soneium address represents this FANOVA account. Your private key stays in Rabby.</p>
      </div>
      {loading ? <p className="field-note">Loading wallet status…</p> : wallet ? (
        <div>
          <span className="panel-label">VERIFIED WALLET</span>
          <strong className="wallet-address">{wallet.address}</strong>
          <p className="field-note">Verified {new Date(wallet.verifiedAt).toLocaleString()} · Soneium Mainnet</p>
        </div>
      ) : (
        <div>
          <span className="panel-label">NO WALLET LINKED</span>
          <p className="field-note">Connect Rabby to start. The signature proves wallet control and does not authorize spending.</p>
        </div>
      )}
      {!wallet && <button className="primary-button wallet-connect" onClick={connectWallet} disabled={busy || loading}>
        {busy ? "Waiting for wallet…" : "Connect Rabby"}
      </button>}
      {wallet && <div>
        <p className="field-note">To replace this wallet, first unlink it by signing a fresh message with this same address. Then connect the replacement wallet.</p>
        <button className="secondary-button wallet-unlink" onClick={unlinkWallet} disabled={busy || loading}>
          {busy ? "Waiting for wallet…" : "Unlink wallet"}
        </button>
      </div>}
      {status && <p className={`form-status ${status.kind}`} role="status">{status.message}</p>}
      <p className="field-note">FANOVA will never ask for a seed phrase, private key, token approval, or transfer for wallet linking.</p>
    </section>
  );
}
