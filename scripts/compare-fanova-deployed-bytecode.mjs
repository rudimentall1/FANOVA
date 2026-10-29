#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

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

const localSource = readFileSync("contracts/src/FanovaProvenance.sol", "utf8");
const localSourceSha256 = createHash("sha256").update(localSource).digest("hex");
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

function base58Encode(hex) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let value = BigInt("0x" + hex);
  let output = "";
  while (value > 0n) {
    const remainder = Number(value % 58n);
    output = alphabet[remainder] + output;
    value /= 58n;
  }
  let leadingZeroBytes = 0;
  for (let i = 0; i < hex.length; i += 2) {
    if (hex.slice(i, i + 2) !== "00") break;
    leadingZeroBytes += 1;
  }
  return "1".repeat(leadingZeroBytes) + output;
}

function metadataCid(parts) {
  const match = parts.metadataHex?.match(/1220([0-9a-f]{64})64736f6c/);
  return match ? base58Encode("1220" + match[1]) : null;
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
    const body = await response.text();
    if (!response.ok) return { url, status: response.status };
    try {
      const json = JSON.parse(body);
      return {
        url,
        status: response.status,
        compilerVersion: json.compiler?.version ?? json.compiler_version ?? null,
        evmVersion: json.settings?.evmVersion ?? json.evm_version ?? null,
        optimizer: json.settings?.optimizer ?? null,
        compilationTarget: json.settings?.compilationTarget ?? null,
        sourcePaths: json.sources ? Object.keys(json.sources) : null,
        sourceCount: json.sources ? Object.keys(json.sources).length : null,
        responseKeys: Object.keys(json),
        contractName: json.name ?? json.contractName ?? null,
        filePath: json.file_path ?? null,
        compilerVersionFromExplorer: json.compiler_version ?? json.compilerVersion ?? null,
        evmVersionFromExplorer: json.evm_version ?? json.evmVersion ?? json.compiler_settings?.evmVersion ?? null,
        optimizationRuns: json.optimization_runs ?? json.compiler_settings?.optimizer?.runs ?? null,
        optimizationEnabled: json.optimization_enabled ?? json.compiler_settings?.optimizer?.enabled ?? null,
        constructorArgumentsPresent: Boolean(json.constructor_args ?? json.constructorArguments),
        language: json.language ?? null,
        compilerSettings: json.compiler_settings ?? json.compilerSettings ?? null,
        verificationStatus: json.verification_status ?? json.verificationStatus ?? null,
        fileNames: Array.isArray(json.source_code) ? json.source_code.map(x => x.file_path ?? x.name).filter(Boolean) : null,
        sourceCodeType: typeof json.source_code,
        sourceCodeLength: typeof json.source_code === "string" ? json.source_code.length : null,
        sourceCodeSha256: typeof json.source_code === "string"
          ? createHash("sha256").update(json.source_code).digest("hex")
          : null,
        sourceCodeMatchesCurrentFile: typeof json.source_code === "string"
          ? json.source_code === localSource
          : null,
        sourceCodeMatchesCurrentFileWithoutFinalNewline: typeof json.source_code === "string"
          ? json.source_code.replace(/\n$/, "") === localSource.replace(/\n$/, "")
          : null,
        sourceCodeMatchesCurrentFileIgnoringFinalNewline: typeof json.source_code === "string"
          ? json.source_code.replace(/\\n$/, "") === localSource.replace(/\\n$/, "")
          : null,
        sourceCodeFirstDifference: typeof json.source_code === "string"
          ? (() => {
              let index = 0;
              while (index < json.source_code.length && index < localSource.length &&
                     json.source_code[index] === localSource[index]) index += 1;
              return {
                index,
                explorerLength: json.source_code.length,
                localLength: localSource.length,
                explorerContext: json.source_code.slice(Math.max(0, index - 100), index + 160),
                localContext: localSource.slice(Math.max(0, index - 100), index + 160)
              };
            })()
          : null
      };
    } catch {
      return { url, status: response.status, nonJson: true };
    }
  } catch (error) {
    return { url, error: String(error).slice(0, 160) };
  }
}

const localCid = metadataCid(localParts);
const deployedCid = metadataCid(deployedParts);
const metadataLookups = await Promise.all([
  ...[["local", localCid], ["deployed", deployedCid]].flatMap(([kind, cid]) =>
    cid ? [
      fetchJson("https://ipfs.io/ipfs/" + cid).then(result => ({ kind, provider: "ipfs.io", ...result })),
      fetchJson("https://gateway.pinata.cloud/ipfs/" + cid).then(result => ({ kind, provider: "pinata", ...result }))
    ] : []
  ),
  fetchJson("https://repo.sourcify.dev/contracts/partial_match/1868/" + ADDRESS + "/metadata.json")
    .then(result => ({ kind: "sourcify-partial", ...result })),
  fetchJson("https://repo.sourcify.dev/contracts/full_match/1868/" + ADDRESS + "/metadata.json")
    .then(result => ({ kind: "sourcify-full", ...result })),
  fetchJson("https://soneium.blockscout.com/api/v2/smart-contracts/" + ADDRESS)
    .then(result => ({ kind: "blockscout-contract-api", ...result }))
]);

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
  localSourceBytes: Buffer.byteLength(localSource),
  localSourceSha256,
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
    localIpfsCid: localCid,
    deployedIpfsCid: deployedCid,
    externalMetadataLookups: metadataLookups,
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
