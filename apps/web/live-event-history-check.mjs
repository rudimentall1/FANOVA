import { Interface, JsonRpcProvider } from "ethers";
import { PROVENANCE_ABI } from "./provenance-abi.js";
import { scanStoryEventHistory } from "./event-history.js";
import { compareEventCoverage } from "./event-coverage.js";

const CHAIN_ID = 1868n;
const CONTRACT = "0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880";
const DEPLOYMENT_TX = "0xb2086bd26326b428f4806e9a93a202631528ec8bffe4ff59ff9f8f102cf9e34c";
const STORY_ID = "0x5f6e97151e2d76ad094c7af20ce86e7c5bbb86cb620b28ac19db841cbc8ebdc5";
const STORY_TX = "0xeabf1bbeffee5405c4e8b81586dde14f9bea2154fa798d5d76ce5ab8f2f07f55";
const CONTRIBUTION_ID = "0x5931fb260803ed851daca0859c85e1e24a828df578d5fd38d6d64657bd0bc371";
const CONTRIBUTION_LOCAL_ID = "0f31a724-7672-4b21-98d8-55a8870c5122";
const CONTRIBUTION_TX = "0x46d61b5e9cb33bb961ee12623760d59e4f237b0b33389be51fa8bd1b84a1d4df";
const DECISION_TX = "0xf3b026b983f5e7c07a67ed71ff150d6262364cbc3d83cf2be29a2b80c1a1ab98";
const RPC_URLS = [
  "https://rpc.soneium.org/",
  "https://soneium-mainnet.rpc.sentio.xyz",
  "https://soneium.drpc.org"
];

async function connectReadOnly() {
  const failures = [];
  for (const url of RPC_URLS) {
    const provider = new JsonRpcProvider(url);
    try {
      const network = await provider.getNetwork();
      if (network.chainId !== CHAIN_ID) throw new Error(`Unexpected chain ID ${network.chainId}`);
      const blockNumber = await provider.getBlockNumber();
      const code = await provider.getCode(CONTRACT);
      if (code === "0x" || /^0x0*$/.test(code)) throw new Error("FANOVA contract bytecode is missing");
      return { provider, url, blockNumber };
    } catch (error) {
      failures.push(`${url}: ${error?.message || error}`);
      await provider.destroy();
    }
  }
  throw new Error("No Soneium read-only RPC endpoint passed preflight. " + failures.join(" | "));
}

async function main() {
  const { provider, url } = await connectReadOnly();
  try {
    const deploymentReceipt = await provider.getTransactionReceipt(DEPLOYMENT_TX);
    if (!deploymentReceipt || deploymentReceipt.status !== 1) {
      throw new Error("FANOVA deployment receipt is unavailable or failed.");
    }
    if (deploymentReceipt.contractAddress?.toLowerCase() !== CONTRACT.toLowerCase()) {
      throw new Error("Deployment receipt does not create the configured FANOVA contract.");
    }

    const verificationBlock = await provider.getBlockNumber();
    const iface = new Interface(PROVENANCE_ABI);
    const history = await scanStoryEventHistory({
      provider,
      iface,
      contractAddress: CONTRACT,
      storyId: STORY_ID,
      fromBlock: deploymentReceipt.blockNumber,
      toBlock: verificationBlock,
      chunkSize: 1000
    });

    const story = { id: "28479d09-4b0e-4d77-9c3f-56b737b5d0ba", version: 1 };
    const bundle = {
      localStoryAndContributions: {
        story,
        contributions: [{ id: CONTRIBUTION_LOCAL_ID }]
      },
      onchainMetadata: {
        contributions: {
          [CONTRIBUTION_LOCAL_ID]: {
            contributionId: CONTRIBUTION_ID,
            storyId: STORY_ID,
            txHash: CONTRIBUTION_TX,
            decisionTxHash: DECISION_TX,
            localContributionId: CONTRIBUTION_LOCAL_ID
          }
        }
      }
    };
    const coverage = compareEventCoverage({
      storyId: STORY_ID,
      storyRecord: { storyId: STORY_ID, txHash: STORY_TX },
      story,
      storyVersionEvents: history.storyVersionEvents,
      contributionEvents: history.contributionEvents,
      decisionEvents: history.decisionEvents,
      bundle
    });

    if (coverage.incompleteEvidence.length) {
      throw new Error("Live event history is not fully reconciled: " + coverage.incompleteEvidence.join("; "));
    }

    const result = {
      status: "LIVE_EVENT_HISTORY_RECONCILED",
      network: "Soneium Mainnet",
      chainId: Number(CHAIN_ID),
      rpc: url,
      contract: CONTRACT,
      deploymentBlock: deploymentReceipt.blockNumber,
      verificationBlock,
      events: {
        storyVersions: history.storyVersionEvents.length,
        contributions: history.contributionEvents.length,
        decisions: history.decisionEvents.length
      },
      checks: coverage.checks,
      transactionReferences: {
        story: STORY_TX,
        contribution: CONTRIBUTION_TX,
        decision: DECISION_TX
      },
      scope: "Read-only live event-history scan and bundle-reference reconciliation. This is not the browser verifier's full content-hash, storage, and receipt verification, and is not an independent audit."
    };
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } finally {
    await provider.destroy();
  }
}

main().catch(error => {
  process.stderr.write((error?.stack || error?.message || String(error)) + "\n");
  process.exitCode = 1;
});
