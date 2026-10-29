import { createHash } from 'node:crypto';

const RPC_URL = process.env.SONEIUM_RPC_URL || 'https://rpc.soneium.org/';
const EXPLORER_BASE = 'https://soneium.blockscout.com';
const EXPECTED_CHAIN_ID = '0x74c'; // 1868
const EIP1967_IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const EIP1967_ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
const EIP1967_BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';
const VIEW_CALLS = {
  easVersion: { address: '0x4200000000000000000000000000000000000021', data: '0x54fd4d50', decode: 'string' },
  easSchemaRegistry: { address: '0x4200000000000000000000000000000000000021', data: '0xf10b5cc8', decode: 'address' },
  schemaRegistryVersion: { address: '0x4200000000000000000000000000000000000020', data: '0x54fd4d50', decode: 'string' },
};
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

function decodeAbiString(data) {
  if (typeof data !== 'string' || !/^0x[0-9a-f]*$/i.test(data) || data.length < 130) {
    throw new Error('Malformed ABI string return data');
  }
  const bytes = data.slice(2);
  const offset = Number(BigInt(`0x${bytes.slice(0, 64)}`)) * 2;
  const length = Number(BigInt(`0x${bytes.slice(offset, offset + 64)}`));
  const start = offset + 64;
  const hex = bytes.slice(start, start + length * 2);
  if (hex.length !== length * 2) throw new Error('Truncated ABI string return data');
  return Buffer.from(hex, 'hex').toString('utf8');
}

function decodeAbiAddress(data) {
  if (typeof data !== 'string' || !/^0x[0-9a-f]{64}$/i.test(data)) {
    throw new Error('Malformed ABI address return data');
  }
  return `0x${data.slice(-40)}`;
}

async function inspectViewCall(name, call) {
  try {
    const result = await rpc('eth_call', [{ to: call.address, data: call.data }, 'latest']);
    const value = call.decode === 'string' ? decodeAbiString(result) : decodeAbiAddress(result);
    return { name, status: 'OK', value };
  } catch (error) {
    return { name, status: 'UNAVAILABLE', note: String(error).slice(0, 240) };
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
  const adminWord = await rpc('eth_getStorageAt', [target.address, EIP1967_ADMIN_SLOT, 'latest']);
  const adminAddress = `0x${adminWord.slice(-40)}`;
  const beaconWord = await rpc('eth_getStorageAt', [target.address, EIP1967_BEACON_SLOT, 'latest']);
  const beaconAddress = `0x${beaconWord.slice(-40)}`;
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
    eip1967AdminAddress: /^0x0{40}$/i.test(adminAddress) ? null : adminAddress,
    eip1967BeaconAddress: /^0x0{40}$/i.test(beaconAddress) ? null : beaconAddress,
    implementation,
  });
}
report.readOnlyViewCalls = [];
for (const [name, call] of Object.entries(VIEW_CALLS)) {
  report.readOnlyViewCalls.push(await inspectViewCall(name, call));
}
const schemaRegistryCall = report.readOnlyViewCalls.find(call => call.name === 'easSchemaRegistry');
if (schemaRegistryCall?.status === 'OK' && schemaRegistryCall.value.toLowerCase() !== TARGETS[0].address.toLowerCase()) {
  throw new Error(`EAS returned unexpected SchemaRegistry address: ${schemaRegistryCall.value}`);
}
console.log(JSON.stringify(report, null, 2));
console.log('\nInterpretation: runtime code and EIP-1967 implementation/admin/beacon slots are queried from the configured RPC. These slots only cover the standard EIP-1967 pattern and do not identify all possible upgrade authorities. SHA-256 is a reproducible fingerprint, not the EVM keccak code hash. Explorer source metadata is reported separately for proxy and implementation. eth_call checks only the EAS version, EAS SchemaRegistry address, and SchemaRegistry version. No transactions are submitted; existing attestations, schema semantics, resolver behavior, and write paths are not tested.');