const RPC = "https://rpc.soneium.org/";
const CONTRACT = "0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880";
const EXPECTED_CHAIN_ID = "0x74c";
const status = document.querySelector("#chain-proof-status");
const detail = document.querySelector("#chain-proof-detail");

function show(label, message, kind = "") {
  status.textContent = label;
  status.className = "proof-status" + (kind ? " " + kind : "");
  detail.textContent = message;
}

async function rpc(method, params) {
  const response = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  if (!response.ok) throw new Error(`RPC returned HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || "RPC request failed");
  return payload.result;
}

async function checkDeployment() {
  try {
    const chainId = await rpc("eth_chainId", []);
    if (chainId !== EXPECTED_CHAIN_ID) {
      show("WRONG NETWORK", `RPC reported chain ID ${chainId}; expected Soneium Mainnet (1868).`, "error");
      return;
    }
    const code = await rpc("eth_getCode", [CONTRACT, "latest"]);
    if (!code || code === "0x" || /^0x0*$/.test(code)) {
      show("NO CODE FOUND", "The RPC returned no contract bytecode for the configured address.", "error");
      return;
    }
    show("CODE PRESENT", "Soneium Mainnet (chain ID 1868) reports deployed bytecode at the FANOVA contract address. This is a read-only presence check, not a source-verification or story-record check.", "ok");
  } catch (error) {
    show("CHECK UNAVAILABLE", `Could not verify deployment through the public RPC: ${error.message}. Use Blockscout to inspect the address directly.`, "error");
  }
}

checkDeployment();
