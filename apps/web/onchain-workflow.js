import { PROVENANCE_ABI } from "./provenance-abi.js";
const CONTRACT_ADDRESS = "0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880";
const CHAIN_ID = 1868n;
const CHAIN_HEX = "0x74c";
const STATE_KEY = "fanova.local.v2";
const META_KEY = "fanova.onchain.v1";
const ETHERS_URL = "https://cdn.jsdelivr.net/npm/ethers@6.15.0/+esm";
const ABI = PROVENANCE_ABI;

const status = document.querySelector("#onchain-action-status");
const detail = document.querySelector("#onchain-action-detail");
const walletLabel = document.querySelector("#wallet-address");
let ethersModule;
let lastAccount = null;

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function readState() { return readJson(STATE_KEY, { story: null, contributions: [] }); }
function readMeta() { return readJson(META_KEY, { stories: {}, contributions: {}, txs: [] }); }
function saveMeta(meta) { localStorage.setItem(META_KEY, JSON.stringify(meta)); }
function setStatus(label, message, error = false) {
  status.textContent = label;
  status.className = "proof-status" + (error ? " error" : " ok");
  detail.textContent = message;
}
function requireStory() {
  const story = readState().story;
  if (!story) throw new Error("Publish a local source story first.");
  return story;
}
function requireContribution() {
  const state = readState();
  const story = state.story;
  if (!story) throw new Error("Publish a local source story first.");
  const contribution = [...state.contributions].reverse().find(item => item.storyId === story.id);
  if (!contribution) throw new Error("Submit a local fan contribution first.");
  return { story, contribution };
}
function randomBytes32(ethers) { return ethers.hexlify(ethers.randomBytes(32)); }
function canonicalSource(story) { return JSON.stringify({ title: story.title, body: story.body }); }
function canonicalContribution(contribution) { return JSON.stringify({ title: contribution.title, body: contribution.body }); }

async function getWallet() {
  if (!window.ethereum) throw new Error("No injected wallet found. Install or enable MetaMask, then retry.");
  if (!ethersModule) ethersModule = await import(ETHERS_URL);
  const { BrowserProvider, Contract } = ethersModule;
  let chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId.toLowerCase() !== CHAIN_HEX) {
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
      chainId = await window.ethereum.request({ method: "eth_chainId" });
    } catch (error) {
      if (error?.code === 4001) throw new Error("Network switch was rejected. Select Soneium Mainnet (chain ID 1868) and retry.");
      throw new Error("Wallet is not on Soneium Mainnet (chain ID 1868). Switch networks in your wallet and retry.");
    }
  }
  if (chainId.toLowerCase() !== CHAIN_HEX) throw new Error("Wallet is not on Soneium Mainnet (chain ID 1868).");
  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const currentNetwork = await provider.getNetwork();
  if (currentNetwork.chainId !== CHAIN_ID) throw new Error("Wallet network changed; expected Soneium Mainnet (1868).");
  lastAccount = address;
  walletLabel.textContent = address;
  const contract = new Contract(CONTRACT_ADDRESS, ABI, signer);
  return { provider, signer, contract, address, ethers: ethersModule };
}
async function verifyReceipt(receipt, eventName, match) {
  const iface = new ethersModule.Interface(ABI);
  const found = receipt.logs.some(log => {
    if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) return false;
    try { const parsed = iface.parseLog(log); return parsed?.name === eventName && match(parsed.args); } catch { return false; }
  });
  if (!found) throw new Error("Transaction mined, but the expected contract event was not found. Check the receipt on Blockscout before retrying.");
}
async function sendAndVerify(tx, eventName, match) {
  setStatus("WALLET CONFIRMATION", "Review the transaction and gas fee in your wallet. No transaction is sent until you approve it.");
  const txResponse = await tx;
  setStatus("TRANSACTION PENDING", `Waiting for ${txResponse.hash} to be confirmed.`);
  const receipt = await txResponse.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Transaction failed onchain. Check the receipt before retrying.");
  await verifyReceipt(receipt, eventName, match);
  return { hash: txResponse.hash, blockNumber: receipt.blockNumber };
}
function rememberTx(meta, type, result, extra = {}) {
  meta.txs.push({ type, transactionHash: result.hash, blockNumber: result.blockNumber, chainId: Number(CHAIN_ID), contract: CONTRACT_ADDRESS, recordedAt: new Date().toISOString(), ...extra });
  saveMeta(meta);
}
function downloadBundle() {
  const state = readState();
  const meta = readMeta();
  const bundle = {
    format: "fanova-evidence-bundle-v1",
    exportedAt: new Date().toISOString(),
    network: { name: "Soneium Mainnet", chainId: Number(CHAIN_ID), rpc: "https://rpc.soneium.org/" },
    contract: CONTRACT_ADDRESS,
    claimLimit: "Hashes and emitted events support a provenance claim only. This bundle does not prove legal ownership, copyright clearance, or enforceable consent.",
    localStoryAndContributions: state,
    onchainMetadata: meta,
    hashDefinitions: {
      sourceHash: "keccak256(UTF8(JSON.stringify({title, body}))) using the exact exported title and body strings",
      permissionHash: "keccak256(UTF8(permission text)) using the exact exported permissions string",
      contributionHash: "keccak256(UTF8(JSON.stringify({title, body}))) using the exact exported contribution title and body strings",
      reasonCode: "keccak256(UTF8(decision reason)); if reason is empty, the UI hashes the outcome label"
    }
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fanova-evidence-bundle.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("BUNDLE EXPORTED", "Downloaded local story data, canonical hash inputs, and the transaction/event evidence recorded by this browser.");
}
async function registerStory() {
  const story = requireStory();
  const { contract, address, ethers } = await getWallet();
  const meta = readMeta();
  let record = meta.stories[story.id];
  if (record?.txHash) throw new Error("This local story already has a recorded registration transaction. Export evidence or inspect Blockscout before retrying.");
  if (!record) {
    record = { creatorSalt: randomBytes32(ethers), storyId: null, sourceHash: null, permissionHash: null };
    meta.stories[story.id] = record;
    saveMeta(meta);
  }
  const sourceHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalSource(story)));
  const permissionHash = ethers.keccak256(ethers.toUtf8Bytes(story.permissions));
  const storyId = await contract.computeStoryId(address, record.creatorSalt);
  const txResult = await sendAndVerify(
    contract.registerStoryVersion(storyId, record.creatorSalt, story.version, sourceHash, story.permissionVersion, permissionHash),
    "StoryVersionRegistered",
    args => args.storyId.toLowerCase() === storyId.toLowerCase() && args.creator.toLowerCase() === address.toLowerCase() && args.sourceHash.toLowerCase() === sourceHash.toLowerCase()
  );
  record.storyId = storyId;
  record.creatorAddress = address;
  record.sourceHash = sourceHash;
  record.permissionHash = permissionHash;
  record.txHash = txResult.hash;
  record.blockNumber = txResult.blockNumber;
  rememberTx(meta, "story-registration", txResult, { storyId, sourceHash, permissionHash, localStoryId: story.id });
  setStatus("STORY ANCHORED", `Story registration event verified in block ${txResult.blockNumber}. The story text remains offchain; export the evidence bundle to preserve the exact hash inputs.`);
}
async function registerContribution() {
  const { story, contribution } = requireContribution();
  const { contract, address, ethers } = await getWallet();
  const meta = readMeta();
  const storyRecord = meta.stories[story.id];
  if (!storyRecord?.txHash || !storyRecord.storyId) throw new Error("Register the source story onchain first. The creator wallet must have registered it.");
  if (storyRecord.creatorAddress.toLowerCase() === address.toLowerCase()) throw new Error("Use the fan wallet for contribution registration, not the creator wallet.");
  const existing = meta.contributions[contribution.id];
  if (existing?.txHash) throw new Error("This local contribution already has a recorded registration transaction. Inspect Blockscout before retrying.");
  const contributionId = existing?.contributionId || randomBytes32(ethers);
  const contributionHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalContribution(contribution)));
  const txResult = await sendAndVerify(
    contract.registerContribution(contributionId, storyRecord.storyId, contribution.sourceVersion, contribution.permissionVersion, storyRecord.permissionHash, contributionHash, contribution.permissionAcknowledged === true),
    "ContributionRegistered",
    args => args.contributionId.toLowerCase() === contributionId.toLowerCase() && args.storyId.toLowerCase() === storyRecord.storyId.toLowerCase() && args.contributor.toLowerCase() === address.toLowerCase() && args.contributionHash.toLowerCase() === contributionHash.toLowerCase()
  );
  meta.contributions[contribution.id] = { contributionId, storyId: storyRecord.storyId, contributorAddress: address, contributionHash, txHash: txResult.hash, blockNumber: txResult.blockNumber, localContributionId: contribution.id };
  rememberTx(meta, "contribution-registration", txResult, { contributionId, storyId: storyRecord.storyId, contributionHash, localContributionId: contribution.id });
  setStatus("CONTRIBUTION ANCHORED", `Contribution event verified in block ${txResult.blockNumber}. The fan wallet is recorded onchain; content remains offchain.`);
}
async function decideContribution() {
  const { story, contribution } = requireContribution();
  if (!["approved", "rejected"].includes(contribution.status)) throw new Error("Review the local contribution first. The local status must be approved or rejected.");
  const { contract, address, ethers } = await getWallet();
  const meta = readMeta();
  const storyRecord = meta.stories[story.id];
  const contributionRecord = meta.contributions[contribution.id];
  if (!storyRecord?.txHash || !contributionRecord?.txHash) throw new Error("Register the source story and this contribution onchain first.");
  if (storyRecord.creatorAddress.toLowerCase() !== address.toLowerCase()) throw new Error("Only the wallet that registered the source story can submit the final decision.");
  if (contributionRecord.decisionTxHash) throw new Error("A decision transaction is already recorded for this contribution. Inspect Blockscout before retrying.");
  const reasonInput = document.querySelector("#onchain-reason");
  const reason = (reasonInput?.value || "").trim();
  const outcomeLabel = contribution.status === "approved" ? "APPROVED" : "REJECTED";
  const reasonCode = ethers.keccak256(ethers.toUtf8Bytes(reason || outcomeLabel));
  const txResult = await sendAndVerify(
    contract.decideContribution(contributionRecord.contributionId, contribution.status === "approved", reasonCode),
    "ContributionDecided",
    args => args.contributionId.toLowerCase() === contributionRecord.contributionId.toLowerCase() && args.storyId.toLowerCase() === storyRecord.storyId.toLowerCase() && args.reviewer.toLowerCase() === address.toLowerCase() && args.approved === (contribution.status === "approved") && args.reasonCode.toLowerCase() === reasonCode.toLowerCase()
  );
  contributionRecord.decisionTxHash = txResult.hash;
  contributionRecord.decisionBlockNumber = txResult.blockNumber;
  contributionRecord.outcome = contribution.status;
  contributionRecord.reason = reason;
  contributionRecord.reasonCode = reasonCode;
  saveMeta(meta);
  rememberTx(meta, "creator-decision", txResult, { contributionId: contributionRecord.contributionId, storyId: storyRecord.storyId, outcome: contribution.status, reasonCode, localContributionId: contribution.id });
  setStatus("DECISION ANCHORED", `Decision event verified in block ${txResult.blockNumber}. Open the receipt on Blockscout or export the evidence bundle.`);
}
async function run(action) {
  try {
    if (action === "connect") {
      const { address } = await getWallet();
      setStatus("WALLET CONNECTED", `Connected ${address}. The wallet is on Soneium Mainnet (1868). Connecting does not send a transaction.`);
    } else if (action === "story") await registerStory();
    else if (action === "contribution") await registerContribution();
    else if (action === "decision") await decideContribution();
    else if (action === "export") downloadBundle();
  } catch (error) {
    const message = error?.code === 4001 || /user rejected|user denied/i.test(error?.message || "")
      ? "Wallet request was rejected. No successful transaction was recorded."
      : (error?.shortMessage || error?.reason || error?.message || "Unexpected wallet error.");
    setStatus("ACTION NOT COMPLETED", message, true);
  }
}
document.querySelectorAll("[data-onchain-action]").forEach(button => {
  button.addEventListener("click", () => run(button.dataset.onchainAction));
});
if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", accounts => {
    lastAccount = accounts?.[0] || null;
    walletLabel.textContent = lastAccount || "Not connected";
    setStatus("WALLET CHANGED", "Account changed in the wallet. Check the role and source registration before sending another transaction.");
  });
  window.ethereum.on?.("chainChanged", () => setStatus("NETWORK CHANGED", "Network changed. Reconnect and verify Soneium Mainnet before continuing.", true));
}
