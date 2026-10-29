#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const artifactPath = resolve(
  process.argv[2] ?? "out/FanovaProvenance.sol/FanovaProvenance.json",
);
const outputPath = resolve(
  process.argv[3] ?? "artifacts/fanova-soneium-mainnet-manifest.json",
);

function bytecodeBytes(value, label) {
  if (typeof value !== "string") throw new Error(`Missing ${label} bytecode`);
  const hex = value.replace(/^0x/i, "");
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error(`Invalid or unresolved ${label} bytecode`);
  }
  return Buffer.from(hex, "hex");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const creation = bytecodeBytes(artifact.bytecode?.object, "creation");
const runtime = bytecodeBytes(artifact.deployedBytecode?.object, "runtime");
const foundry = JSON.parse(execFileSync("forge", ["config", "--json"], { encoding: "utf8" }));
const revision = process.env.GITHUB_SHA ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

if (foundry.solc !== "0.8.27" || foundry.optimizer !== true || foundry.optimizer_runs !== 200) {
  throw new Error(
    `Unexpected compiler settings: solc=${foundry.solc}, optimizer=${foundry.optimizer}, runs=${foundry.optimizer_runs}`,
  );
}

const manifest = {
  schemaVersion: 1,
  status: "LOCAL_BUILD_ONLY",
  deploymentStatus: "PLANNED",
  target: {
    network: "Soneium Mainnet",
    chainId: 1868,
    rpcUrl: "https://rpc.soneium.org/",
    explorer: "https://soneium.blockscout.com/",
  },
  contract: {
    name: "FanovaProvenance",
    source: "contracts/src/FanovaProvenance.sol",
    artifact: "out/FanovaProvenance.sol/FanovaProvenance.json",
    constructorArguments: [],
    address: null,
    transactionHash: null,
  },
  sourceRevision: revision,
  compiler: {
    version: foundry.solc,
    optimizer: foundry.optimizer,
    optimizerRuns: foundry.optimizer_runs,
    evmVersion: foundry.evm_version ?? null,
    viaIR: foundry.via_ir ?? false,
  },
  bytecode: {
    hashAlgorithm: "SHA-256",
    creationBytes: creation.length,
    creationSha256: sha256(creation),
    runtimeBytes: runtime.length,
    runtimeSha256: sha256(runtime),
  },
  notes: [
    "Generated from a local Foundry artifact; no transaction was sent.",
    "SHA-256 fingerprints identify these bytes but are not EVM keccak code hashes.",
    "This manifest is not evidence of a deployment or a security audit.",
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`Wrote ${outputPath}\n`);
process.stdout.write(`Creation SHA-256: ${manifest.bytecode.creationSha256}\n`);
process.stdout.write(`Runtime SHA-256: ${manifest.bytecode.runtimeSha256}\n`);
