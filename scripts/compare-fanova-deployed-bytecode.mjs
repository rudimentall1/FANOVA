#!/usr/bin/env node
import { readFileSync } from "node:fs";

const ADDRESS = "0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880";
const RPC_URL = process.env.SONEIUM_RPC_URL || "https://rpc.soneium.org/";
const ARTIFACT_PATH = "out/FanovaProvenance.sol/FanovaProvenance.json";

function normalize(value) {
  if (typeof value !== "string") throw new Error("Expected bytecode string");
  const hex = value.replace(/^0x/i, "").toLowerCase();
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) {
    throw new Error("Invalid bytecode hex");
  }
  return hex;
}

// Solidity appends CBOR metadata and its two-byte length to runtime bytecode.
// Strip it only for the secondary executable-bytecode comparison.
function splitSolidityMetadata(hex) {
  if (hex.length < 4) return { executable: hex, metadataHex: null, metadataBytes: null };
  const metadataBytes = Number.parseInt(hex.slice(-4), 16);
  const totalSuffixLength = (metadataBytes + 2) * 2;
  if (metadataBytes <= 0 || totalSuffixLength >= hex.length) {
    return { executable: hex, metadataHex: null, metadataBytes: null };
  }
  const metadataStart = hex.length - totalSuffixLength;
  const first = Number.parseInt(hex.slice(metadataStart, metadataStart + 2), 16);
  // Solidity metadata is CBOR; common initial map markers are 0xa1..0xbf.
  if (first < 0xa1 || first > 0xbf) {
    return { executable: hex, metadataHex: null, metadataBytes: null };
  }
  return {
    executable: hex.slice(0, metadataStart),
    metadataHex: hex.slice(metadataStart, hex.length - 4),
    metadataBytes,
  };
}

const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
const local = normalize(artifact.deployedBytecode?.object);
const response = await fetch(RPC_URL, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getCode",
    params: [ADDRESS, "latest"],
  }),
  signal: AbortSignal.timeout(15000),
});
if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
const payload = await response.json();
if (payload.error) throw new Error(`eth_getCode failed: ${payload.error.message || JSON.stringify(payload.error)}`);
const deployed = normalize(payload.result);
if (deployed === "0") throw new Error("No deployed runtime bytecode at target address");

const exact = deployed === local;
const localParts = splitSolidityMetadata(local);
const deployedParts = splitSolidityMetadata(deployed);
const executableMatch = deployedParts.executable === localParts.executable;
let localMetadata = null;
try {
  localMetadata = typeof artifact.metadata === "string"
    ? JSON.parse(artifact.metadata)
    : artifact.metadata || null;
} catch {}

const report = {
  checkedAt: new Date().toISOString(),
  network: "Soneium Mainnet",
  chainIdExpected: 1868,
  address: ADDRESS,
  sourceRevision: process.env.GITHUB_SHA || "unknown",
  compiler: "Solidity 0.8.27",
  evmVersion: "cancun",
  optimizer: true,
  optimizerRuns: 200,
  localRuntimeBytes: local.length / 2,
  deployedRuntimeBytes: deployed.length / 2,
  exactRuntimeMatch: exact,
  executableBytecodeMatchIgnoringSolidityMetadata: executableMatch,
  metadata: {
    localCborBytes: localParts.metadataBytes,
    deployedCborBytes: deployedParts.metadataBytes,
    localCborHex: localParts.metadataHex,
    deployedCborHex: deployedParts.metadataHex,
    metadataExactMatch: localParts.metadataHex === deployedParts.metadataHex,
    localCompilerVersion: localMetadata?.compiler?.version ?? null,
    localEvmVersion: localMetadata?.settings?.evmVersion ?? null,
    localOptimizer: localMetadata?.settings?.optimizer ?? null,
    localCompilationTarget: localMetadata?.settings?.compilationTarget ?? null,
    localSourcePaths: localMetadata?.sources ? Object.keys(localMetadata.sources) : null
  },
  result: exact
    ? "EXACT_RUNTIME_MATCH"
    : executableMatch
      ? "EXECUTABLE_MATCH_METADATA_DIFFERS"
      : "RUNTIME_BYTECODE_MISMATCH",
};
console.log(JSON.stringify(report, null, 2));
