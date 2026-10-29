import { createHash } from 'node:crypto';

const RPC_URL = process.env.SONEIUM_RPC_URL || 'https://rpc.soneium.org/';
const EXPLORER_BASE = 'https://soneium.blockscout.com';
const EXPECTED_CHAIN_ID = '0x74c'; // 1868
const EIP1967_IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
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

async function inspectExplorer(address) {
  try {
    const metadata = await getJson(`${EXPLORER_BASE}/api/v2/smart-contracts/${address}`, {}, 2);
    return {
      status: metadata.is_verified === true ? 'SOURCE_VERIFIED_BY_EXPLORER' : 'SOURCE_NOT_MARKED_VERIFIED',
      isVerified: metadata.is_verified === true,
      name: metadata.name ?? null,
      compilerVersion: metadata.compiler_version ?? null,
      optimizationEnabled: metadata.optimization_enabled ?? null,
      implementationAddress: metadata.implementations?.[0]?.address_hash ?? metadata.implementation_address ?? null,
    };
  } catch (error) {
    return { status: 'UNAVAILABLE', note: String(error).slice(0, 240) };
  }
}

async function inspectRuntime(address) {
  const code = await rpc('eth_getCode', [address, 'latest']);
  if (typeof code !== 'string' || !/^0x[0-9a-f]*$/i.test(code)) throw new Error(`Malformed eth_getCode result for ${address}`);
  if (code === '0x' || /^0x0*$/i.test(code)) return { runtimeBytecodePresent: false, runtimeBytecodeBytes: 0, runtimeBytecodeSha256: null };
  const bytecode = Buffer.from(code.slice(2), 'hex');
  return {
    runtimeBytecodePresent: true,
    runtimeBytecodeBytes: bytecode.length,
    runtimeBytecodeSha256: createHash('sha256').update(bytecode).digest('hex'),
  };
}

for (const target of TARGETS) {
  const proxyRuntime = await inspectRuntime(target.address);
  if (!proxyRuntime.runtimeBytecodePresent) throw new Error(`${target.name}: no runtime bytecode at ${target.address}`);
  const implementationWord = await rpc('eth_getStorageAt', [target.address, EIP1967_IMPLEMENTATION_SLOT, 'latest']);
  const implementationAddress = `0x${implementationWord.slice(-40)}`;
  const hasImplementation = !/^0x0{40}$/i.test(implementationAddress);
  let implementation = null;
  if (hasImplementation) {
    const implementationRuntime = await inspectRuntime(implementationAddress);
    implementation = {
      address: implementationAddress,
      ...implementationRuntime,
      explorerSourceMetadata: await inspectExplorer(implementationAddress),
    };
    if (!implementation.runtimeBytecodePresent) throw new Error(`${target.name}: EIP-1967 implementation address has no runtime bytecode`);
  }
  report.targets.push({
    name: target.name,
    address: target.address,
    ...proxyRuntime,
    proxyExplorerSourceMetadata: await inspectExplorer(target.address),
    eip1967ImplementationAddress: hasImplementation ? implementationAddress : null,
    implementation,
  });
}
console.log(JSON.stringify(report, null, 2));
console.log('\nInterpretation: runtime code and the EIP-1967 implementation slot are queried from the configured RPC. The slot check only detects the standard EIP-1967 implementation pattern; a zero slot does not prove a contract is not a proxy under another design. SHA-256 is a reproducible fingerprint, not the EVM keccak code hash. Explorer source metadata is reported separately for proxy and implementation. This check does not test contract methods, attestations, schemas, resolver behavior, or any write path.');