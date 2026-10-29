const CONTRACT_ADDRESS = "0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880";
const RPC_URL = "https://rpc.soneium.org/";
const CHAIN_ID = 1868n;
const ABI = [
  "function computeStoryId(address creator, bytes32 creatorSalt) view returns (bytes32)",
  "event StoryVersionRegistered(bytes32 indexed storyId, uint64 indexed sourceVersion, address indexed creator, bytes32 sourceHash, uint64 permissionVersion, bytes32 permissionHash)",
  "event ContributionRegistered(bytes32 indexed contributionId, bytes32 indexed storyId, uint64 indexed sourceVersion, address contributor, bytes32 contributionHash, uint64 permissionVersion, bytes32 permissionHash, bool permissionAcknowledged)",
  "event ContributionDecided(bytes32 indexed contributionId, bytes32 indexed storyId, uint64 indexed sourceVersion, address reviewer, bool approved, bytes32 reasonCode, uint256 decidedAt)"
];
const fileInput = document.querySelector("#evidence-file");
const verifyButton = document.querySelector("#verify-evidence");
const status = document.querySelector("#evidence-verify-status");
const detail = document.querySelector("#evidence-verify-detail");
let ethersModule;

function report(label, message, error = false) {
  status.textContent = label;
  status.className = "proof-status" + (error ? " error" : " ok");
  detail.textContent = message;
}
function same(a, b) { return String(a).toLowerCase() === String(b).toLowerCase(); }
function canonicalSource(story) { return JSON.stringify({ title: story.title, body: story.body }); }
function canonicalContribution(contribution) { return JSON.stringify({ title: contribution.title, body: contribution.body }); }
function assert(condition, message) { if (!condition) throw new Error(message); }

async function receiptEvent(provider, iface, txHash, eventName, predicate) {
  assert(/^0x[0-9a-fA-F]{64}$/.test(txHash || ""), `Invalid transaction hash for ${eventName}.`);
  const receipt = await provider.getTransactionReceipt(txHash);
  assert(receipt, `Receipt not found for ${txHash}. The transaction may still be pending or the RPC may be unavailable.`);
  assert(receipt.status === 1, `Transaction failed: ${txHash}.`);
  for (const log of receipt.logs) {
    if (!same(log.address, CONTRACT_ADDRESS)) continue;
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === eventName && predicate(parsed.args)) return receipt;
    } catch {}
  }
  throw new Error(`Expected ${eventName} event was not found in receipt ${txHash}.`);
}

async function verifyBundle(bundle) {
  assert(bundle?.format === "fanova-evidence-bundle-v1", "Unsupported evidence bundle format.");
  assert(Number(bundle?.network?.chainId) === Number(CHAIN_ID), "Bundle network is not Soneium Mainnet (chain ID 1868).");
  assert(same(bundle?.contract, CONTRACT_ADDRESS), "Bundle contract address does not match the configured FANOVA contract.");
  const state = bundle.localStoryAndContributions;
  const meta = bundle.onchainMetadata;
  assert(state && Array.isArray(state.contributions) && meta?.stories && meta?.contributions, "Bundle is missing story/contribution or onchain metadata.");
  if (!ethersModule) ethersModule = await import("https://cdn.jsdelivr.net/npm/ethers@6.15.0/+esm");
  const { JsonRpcProvider, Interface, keccak256, toUtf8Bytes, ZeroAddress } = ethersModule;
  const provider = new JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  assert(network.chainId === CHAIN_ID, `RPC returned chain ID ${network.chainId}, expected 1868.`);
  const code = await provider.getCode(CONTRACT_ADDRESS);
  assert(code !== "0x" && !/^0x0*$/.test(code), "No contract bytecode found at the configured address.");
  const iface = new Interface(ABI);
  const checks = [];
  const story = state.story;
  assert(story, "Evidence bundle contains no source story.");
  const storyRecord = meta.stories[story.id];
  assert(storyRecord?.storyId && storyRecord?.creatorSalt && storyRecord?.creatorAddress, "Onchain story metadata is incomplete.");
  const sourceHash = keccak256(toUtf8Bytes(canonicalSource(story)));
  const permissionHash = keccak256(toUtf8Bytes(story.permissions));
  assert(same(sourceHash, storyRecord.sourceHash), "Source story hash does not match the exported title and body.");
  assert(same(permissionHash, storyRecord.permissionHash), "Permission hash does not match the exported permission text.");
  const derivedId = keccak256(ethersModule.AbiCoder.defaultAbiCoder().encode(["address", "bytes32"], [storyRecord.creatorAddress, storyRecord.creatorSalt]));
  assert(same(derivedId, storyRecord.storyId), "Story ID does not match creator address and creator salt.");
  const storyReceipt = await receiptEvent(provider, iface, storyRecord.txHash, "StoryVersionRegistered", args =>
    same(args.storyId, storyRecord.storyId) &&
    same(args.creator, storyRecord.creatorAddress) &&
    Number(args.sourceVersion) === Number(story.version) &&
    same(args.sourceHash, sourceHash) &&
    Number(args.permissionVersion) === Number(story.permissionVersion) &&
    same(args.permissionHash, permissionHash)
  );
  checks.push(`Story hash, permission hash, creator-bound ID, and StoryVersionRegistered receipt verified (block ${storyReceipt.blockNumber}).`);

  let verifiedContributions = 0;
  for (const contribution of state.contributions) {
    const record = meta.contributions[contribution.id];
    if (!record) continue;
    const contributionHash = keccak256(toUtf8Bytes(canonicalContribution(contribution)));
    assert(same(contributionHash, record.contributionHash), `Contribution hash mismatch for ${contribution.title || contribution.id}.`);
    assert(same(record.storyId, storyRecord.storyId), `Contribution is linked to a different story: ${contribution.id}.`);
    const contributionReceipt = await receiptEvent(provider, iface, record.txHash, "ContributionRegistered", args =>
      same(args.contributionId, record.contributionId) &&
      same(args.storyId, storyRecord.storyId) &&
      same(args.contributor, record.contributorAddress) &&
      Number(args.sourceVersion) === Number(contribution.sourceVersion) &&
      Number(args.permissionVersion) === Number(contribution.permissionVersion) &&
      same(args.permissionHash, permissionHash) &&
      same(args.contributionHash, contributionHash) &&
      args.permissionAcknowledged === true
    );
    checks.push(`Contribution "${contribution.title}" registration event verified (block ${contributionReceipt.blockNumber}).`);
    if (record.decisionTxHash) {
      assert(["approved", "rejected"].includes(record.outcome), `Decision outcome is missing for ${contribution.id}.`);
      const reasonText = (record.reason || "").trim();
      const reasonInput = reasonText || (record.outcome === "approved" ? "APPROVED" : "REJECTED");
      const reasonCode = keccak256(toUtf8Bytes(reasonInput));
      assert(same(reasonCode, record.reasonCode), `Decision reason hash mismatch for ${contribution.id}.`);
      const decisionReceipt = await receiptEvent(provider, iface, record.decisionTxHash, "ContributionDecided", args =>
        same(args.contributionId, record.contributionId) &&
        same(args.storyId, storyRecord.storyId) &&
        same(args.reviewer, storyRecord.creatorAddress) &&
        args.approved === (record.outcome === "approved") &&
        same(args.reasonCode, reasonCode)
      );
      checks.push(`Creator decision event verified for "${contribution.title}" (block ${decisionReceipt.blockNumber}).`);
    }
    verifiedContributions++;
  }
  assert(verifiedContributions > 0, "No contribution records with onchain metadata were found in this bundle.");
  return checks;
}

verifyButton.addEventListener("click", async () => {
  const file = fileInput.files?.[0];
  if (!file) { report("FILE REQUIRED", "Choose a FANOVA evidence JSON file first.", true); return; }
  verifyButton.disabled = true;
  report("VERIFYING", "Reading the bundle, recomputing hashes, and checking Soneium transaction receipts. No wallet or transaction is used.");
  try {
    const bundle = JSON.parse(await file.text());
    const checks = await verifyBundle(bundle);
    report("VERIFIED", checks.join(" "));
  } catch (error) {
    report("VERIFICATION FAILED", error?.message || "Evidence verification failed.", true);
  } finally {
    verifyButton.disabled = false;
  }
});
