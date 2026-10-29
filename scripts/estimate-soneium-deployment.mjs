#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const RPC_URL = process.env.SONEIUM_RPC_URL ?? "https://rpc.soneium.org/";
const artifactPath = resolve(process.argv[2] ?? "out/FanovaProvenance.sol/FanovaProvenance.json");
const outputPath = resolve(process.argv[3] ?? "artifacts/soneium-deployment-estimate.json");

async function rpc(method, params = []) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`${method}: RPC HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`${method}: ${body.error.message ?? JSON.stringify(body.error)}`);
  return body.result;
}

function sha256(hex) {
  return createHash("sha256").update(Buffer.from(hex.replace(/^0x/i, ""), "hex")).digest("hex");
}

function formatEth(wei) {
  const whole = wei / 10n ** 18n;
  const fraction = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const bytecode = artifact.bytecode?.object;
if (typeof bytecode !== "string" || !bytecode || !/^[0-9a-f]+$/i.test(bytecode.replace(/^0x/i, ""))) {
  throw new Error("Creation bytecode is missing, malformed, or contains unresolved library placeholders");
}

const [chainIdHex, gasEstimateHex, gasPriceHex, block] = await Promise.all([
  rpc("eth_chainId"),
  rpc("eth_estimateGas", [{ data: `0x${bytecode.replace(/^0x/i, "")}` }]),
  rpc("eth_gasPrice"),
  rpc("eth_getBlockByNumber", ["latest", false]),
]);

const chainId = Number(BigInt(chainIdHex));
if (chainId !== 1868) throw new Error(`Wrong chain ID: expected 1868, got ${chainId}`);

const gasUnits = BigInt(gasEstimateHex);
const gasPriceWei = BigInt(gasPriceHex);
const executionFeeWei = gasUnits * gasPriceWei;
const estimate = {
  status: "READ_ONLY_ESTIMATE",
  generatedAt: new Date().toISOString(),
  network: "Soneium Mainnet",
  chainId,
  rpcUrl: RPC_URL,
  latestBlock: block?.number ?? null,
  latestBlockTimestamp: block?.timestamp ?? null,
  contract: "FanovaProvenance",
  bytecode: {
    creationBytes: bytecode.replace(/^0x/i, "").length / 2,
    creationSha256: sha256(bytecode),
  },
  deploymentEstimate: {
    gasUnits: gasUnits.toString(),
    gasPriceWei: gasPriceWei.toString(),
    estimatedExecutionFeeWei: executionFeeWei.toString(),
    estimatedExecutionFeeEth: formatEth(executionFeeWei),
  },
  limitations: [
    "eth_estimateGas simulates deployment; it does not broadcast a transaction.",
    "Fee estimate uses the gas price returned at the recorded block/time and may change immediately.",
    "This estimate does not include a separately measured OP Stack L1 data fee or wallet/signature overhead.",
    "No private key is used and no funds are spent.",
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(estimate, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(estimate, null, 2)}\n`);
