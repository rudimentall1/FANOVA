import { createHash } from 'node:crypto';

const RPC_URL = process.env.SONEIUM_RPC_URL || 'https://rpc.soneium.org/';
const EXPLORER_BASE = 'https://soneium.blockscout.com';
const EXPECTED_CHAIN_ID = '0x74c'; // 1868
const TARGETS = [
  { name: 'SchemaRegistry', address: '0x4200000000000000000000000000000000000020' },
  { name: 'EAS', address: '0x4200000000000000000000000000000000000021' },
];

async function getJson(url, options = {}, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
      const body = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
      return JSON.parse(body);
    } catch (error) {
      lastError = error;
      if (i + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 800 * (i + 1)));
    }
  }
  throw lastError;
}

async function rpc(method, params = []) {
  const payload = await getJson(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (payload.error) throw new Error(`${method}: ${payload.error.message || JSON.stringify(payload.error)}`);
  if (!Object.hasOwn(payload, 'result')) throw new Error(`${method}: missing JSON-RPC result`);
  return payload.result;
}

const chainId = await rpc('eth_chainId');
if (chainId.toLowerCase() !== EXPECTED_CHAIN_ID) {
  throw new Error(`Wrong chain ID: expected ${EXPECTED_CHAIN_ID} (1868), got ${chainId}`);
}

const report = {
  checkedAt: new Date().toISOString(),
  network: 'Soneium Mainnet',
  expectedChainId: 1868,
  observedChainId: Number.parseInt(chainId, 16),
  rpcEndpoint: RPC_URL,
  writesPerformed: false,
  targets: [],
};

for (const target of TARGETS) {
  const code = await rpc('eth_getCode', [target.address, 'latest']);
  if (typeof code !== 'string' || !/^0x[0-9a-f]*$/i.test(code)) {
    throw new Error(`${target.name}: malformed eth_getCode result`);
  }
  if (code === '0x' || /^0x0*$/i.test(code)) {
    throw new Error(`${target.name}: no runtime bytecode at ${target.address}`);
  }
  const bytecode = Buffer.from(code.slice(2), 'hex');
  let explorer = { status: 'UNAVAILABLE', note: 'Could not retrieve contract metadata; this does not establish source verification.' };
  try {
    const metadata = await getJson(`${EXPLORER_BASE}/api/v2/smart-contracts/${target.address}`, {}, 2);
    explorer = {
      status: metadata.is_verified === true ? 'SOURCE_VERIFIED_BY_EXPLORER' : 'SOURCE_NOT_MARKED_VERIFIED',
      isVerified: metadata.is_verified === true,
      name: metadata.name ?? null,
      compilerVersion: metadata.compiler_version ?? null,
      optimizationEnabled: metadata.optimization_enabled ?? null,
    };
  } catch (error) {
    explorer = { status: 'UNAVAILABLE', note: String(error).slice(0, 240) };
  }
  report.targets.push({
    name: target.name,
    address: target.address,
    runtimeBytecodePresent: true,
    runtimeBytecodeBytes: bytecode.length,
    runtimeBytecodeSha256: createHash('sha256').update(bytecode).digest('hex'),
    explorerSourceMetadata: explorer,
  });
}

console.log(JSON.stringify(report, null, 2));
console.log('\nInterpretation: runtime code presence is independently queried from the configured RPC. SHA-256 is a reproducible fingerprint, not the EVM keccak code hash. Explorer source metadata is reported separately. This check does not test contract methods, attestations, schemas, resolver behavior, or any write path.');