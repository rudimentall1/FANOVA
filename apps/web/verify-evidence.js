const CONTRACT_ADDRESS = "0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880";
const RPC_URL = "https://rpc.soneium.org/";
const CHAIN_ID = 1868n;
const ABI = [
  "function computeStoryId(address creator, bytes32 creatorSalt) view returns (bytes32)",
  "function getStory(bytes32 storyId) view returns ((address creator,uint64 latestVersion,bytes32 creatorSalt,bool exists))",
  "function getStoryVersion(bytes32 storyId,uint64 sourceVersion) view returns ((bytes32 sourceHash,bytes32 permissionHash,uint64 permissionVersion,bool exists))",
  "function getContribution(bytes32 contributionId) view returns ((bytes32 storyId,bytes32 contributionHash,bytes32 permissionHash,address contributor,address reviewer,uint64 sourceVersion,uint64 permissionVersion,uint256 decidedAt,bool exists,bool decided,bool approved))",
  "event StoryVersionRegistered(bytes32 indexed storyId, uint64 indexed sourceVersion, address indexed creator, bytes32 sourceHash, uint64 permissionVersion, bytes32 permissionHash)",
  "event ContributionRegistered(bytes32 indexed contributionId, bytes32 indexed storyId, uint64 indexed sourceVersion, address contributor, bytes32 contributionHash, uint64 permissionVersion, bytes32 permissionHash, bool permissionAcknowledged)",
  "event ContributionDecided(bytes32 indexed contributionId, bytes32 indexed storyId, uint64 indexed sourceVersion, address reviewer, bool approved, bytes32 reasonCode, uint256 decidedAt)"
];
const fileInput = document.querySelector("#evidence-file");
const verifyButton = document.querySelector("#verify-evidence");
const status = document.querySelector("#evidence-verify-status");
const detail = document.querySelector("#evidence-verify-detail");
let ethersModule;

function report(label, message, level = "ok") {
  status.textContent = label;
  const state = level === true ? "error" : level;
  status.className = "proof-status " + (["ok", "error", "partial"].includes(state) ? state : "error");
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
  const { JsonRpcProvider, Interface, keccak256, toUtf8Bytes } = ethersModule;
  const provider = new JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  assert(network.chainId === CHAIN_ID, `RPC returned chain ID ${network.chainId}, expected 1868.`);
  const code = await provider.getCode(CONTRACT_ADDRESS);
  assert(code !== "0x" && !/^0x0*$/.test(code), "No contract bytecode found at the configured address.");
  const iface = new Interface(ABI);
  const contract = new ethersModule.Contract(CONTRACT_ADDRESS, ABI, provider);
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
  const chainStory = await contract.getStory(storyRecord.storyId);
  assert(chainStory.exists === true, "Story does not exist in contract storage.");
  assert(same(chainStory.creator, storyRecord.creatorAddress), "Stored story creator does not match the evidence bundle.");
  assert(same(chainStory.creatorSalt, storyRecord.creatorSalt), "Stored creator salt does not match the evidence bundle.");
  assert(Number(chainStory.latestVersion) >= Number(story.version), "The exported story version is newer than the version currently stored onchain.");
  const chainVersion = await contract.getStoryVersion(storyRecord.storyId, story.version);
  assert(chainVersion.exists === true, "Story version does not exist in contract storage.");
  assert(same(chainVersion.sourceHash, sourceHash), "Stored source hash does not match the exported story.");
  assert(same(chainVersion.permissionHash, permissionHash), "Stored permission hash does not match the exported permissions.");
  assert(Number(chainVersion.permissionVersion) === Number(story.permissionVersion), "Stored permission version does not match the exported story.");
  const storyReceipt = await receiptEvent(provider, iface, storyRecord.txHash, "StoryVersionRegistered", args =>
    same(args.storyId, storyRecord.storyId) &&
    same(args.creator, storyRecord.creatorAddress) &&
    Number(args.sourceVersion) === Number(story.version) &&
    same(args.sourceHash, sourceHash) &&
    Number(args.permissionVersion) === Number(story.permissionVersion) &&
    same(args.permissionHash, permissionHash)
  );
  checks.push(`Story content hashes, creator-bound ID, contract storage, and StoryVersionRegistered receipt verified (block ${storyReceipt.blockNumber}).`);

  let verifiedContributions = 0;
  const incompleteEvidence = [];
  for (const contribution of state.contributions) {
    const contributionLabel = contribution.title || contribution.id;
    const record = meta.contributions[contribution.id];
    if (!record?.contributionId || !record?.txHash) {
      incompleteEvidence.push(`"${contributionLabel}" has no verifiable onchain registration transaction reference`);
      continue;
    }
    const contributionHash = keccak256(toUtf8Bytes(canonicalContribution(contribution)));
    assert(same(contributionHash, record.contributionHash), `Contribution hash mismatch for ${contribution.title || contribution.id}.`);
    assert(same(record.storyId, storyRecord.storyId), `Contribution is linked to a different story: ${contribution.id}.`);
    const chainContribution = await contract.getContribution(record.contributionId);
    assert(chainContribution.exists === true, `Contribution ${contribution.id} does not exist in contract storage.`);
    assert(same(chainContribution.storyId, storyRecord.storyId), `Stored contribution ${contribution.id} points to a different story.`);
    assert(same(chainContribution.contributor, record.contributorAddress), `Stored contributor address mismatch for ${contribution.id}.`);
    assert(same(chainContribution.contributionHash, contributionHash), `Stored contribution hash mismatch for ${contribution.id}.`);
    assert(same(chainContribution.permissionHash, permissionHash), `Stored contribution permission hash mismatch for ${contribution.id}.`);
    assert(Number(chainContribution.sourceVersion) === Number(contribution.sourceVersion), `Stored source version mismatch for ${contribution.id}.`);
    assert(Number(chainContribution.permissionVersion) === Number(contribution.permissionVersion), `Stored permission version mismatch for ${contribution.id}.`);
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
    checks.push(`Contribution "${contribution.title}" hash, contract storage, and registration event verified (block ${contributionReceipt.blockNumber}).`);
    if (record.decisionTxHash) {
      assert(["approved", "rejected"].includes(record.outcome), `Decision outcome is missing for ${contribution.id}.`);
      assert(contribution.status === record.outcome && contribution.decision?.outcome === record.outcome, `Local decision outcome does not match the onchain evidence for ${contribution.id}.`);
      const reasonText = (record.reason || "").trim();
      const reasonInput = reasonText || (record.outcome === "approved" ? "APPROVED" : "REJECTED");
      const reasonCode = keccak256(toUtf8Bytes(reasonInput));
      assert(same(reasonCode, record.reasonCode), `Decision reason hash mismatch for ${contribution.id}.`);
      assert(chainContribution.decided === true, `Contribution ${contribution.id} is not marked decided in contract storage.`);
      assert(chainContribution.decidedAt > 0n, `Contribution ${contribution.id} has no stored decision timestamp.`);
      assert(chainContribution.approved === (record.outcome === "approved"), `Stored decision outcome mismatch for ${contribution.id}.`);
      assert(same(chainContribution.reviewer, storyRecord.creatorAddress), `Stored reviewer is not the story creator for ${contribution.id}.`);
      const decisionReceipt = await receiptEvent(provider, iface, record.decisionTxHash, "ContributionDecided", args =>
        same(args.contributionId, record.contributionId) &&
        same(args.storyId, storyRecord.storyId) &&
        Number(args.sourceVersion) === Number(contribution.sourceVersion) &&
        same(args.reviewer, storyRecord.creatorAddress) &&
        args.approved === (record.outcome === "approved") &&
        same(args.reasonCode, reasonCode) &&
        args.decidedAt === chainContribution.decidedAt
      );
      checks.push(`Creator decision event verified for "${contribution.title}" (block ${decisionReceipt.blockNumber}).`);
    } else {
      assert(chainContribution.decided === false, `Contribution ${contribution.id} is decided onchain but the bundle has no decision transaction.`);
      if (["approved", "rejected"].includes(contribution.status) || contribution.decision) {
        incompleteEvidence.push(`"${contributionLabel}" has a local creator decision but no verifiable onchain decision transaction reference`);
      }
    }
    verifiedContributions++;
  }
  assert(verifiedContributions > 0, "No contribution records with onchain metadata were found in this bundle.");
  return { checks, incompleteEvidence };
}

verifyButton.addEventListener("click", async () => {
  const file = fileInput.files?.[0];
  if (!file) { report("FILE REQUIRED", "Choose a FANOVA evidence JSON file first.", true); return; }
  verifyButton.disabled = true;
  report("VERIFYING", "Reading the bundle, recomputing hashes, and checking Soneium transaction receipts. No wallet or transaction is used.");
  try {
    const bundle = JSON.parse(await file.text());
    const result = await verifyBundle(bundle);
    if (result.incompleteEvidence.length > 0) {
      report(
        "PARTIALLY VERIFIED",
        `${result.checks.join(" ")} Incomplete evidence: ${result.incompleteEvidence.join("; ")}.`,
        "partial"
      );
    } else {
      report("VERIFIED", result.checks.join(" "));
    }
  } catch (error) {
    report("VERIFICATION FAILED", error?.message || "Evidence verification failed.", true);
  } finally {
    verifyButton.disabled = false;
  }
});
