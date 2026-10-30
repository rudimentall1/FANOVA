# FANOVA

**Fans don't just follow stories. They help shape them.**

FANOVA is a creator-controlled collaborative IP product for story-based communities. It gives a creator a workflow to publish an original story and permitted-use rules, receive fan-created derivative contributions, approve or reject them, and preserve a verifiable relationship between the source version, contributor address, and creator decision on Soneium. FANOVA is the product and workflow layer; it does not claim to replace Soneium's IP registry, graph, or licensing infrastructure. Revenue distribution and legal licensing are not implemented or claimed.

## Project status

**Stage:** early-stage browser application prototype with one completed user-approved Soneium Mainnet Story registration, Contribution registration, and Creator decision workflow, plus the deployed provenance contract. The deployment is visible on [Blockscout](https://soneium.blockscout.com/address/0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880). Blockscout reports **source code verified (partial match)**. A GitHub Actions comparison using Solidity 0.8.27, Cancun EVM target, optimizer enabled, and 200 runs found that the deployed runtime bytecode and the current repository build have the **same executable bytecode after removing Solidity metadata**. The full runtime bytecode differs in metadata, so Blockscout's partial-match status remains accurate. This is not an independent security audit.

Contract address: `0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880`

Deployment transaction: [`0xb2086bd26326b428f4806e9a93a202631528ec8bffe4ff9f9f8f102cf9e34c`](https://soneium.blockscout.com/tx/0xb2086bd26326b428f4806e9a93a202631528ec8bffe4ff9f9f8f102cf9e34c)

### Soneium Mainnet workflow evidence

On 2026-10-30, three user-approved transactions completed successfully:

| Step | Method | Block | Transaction |
|---|---|---:|---|
| Story registration | `registerStoryVersion` | `30105304` | [Blockscout](https://soneium.blockscout.com/tx/0xeabf1bbeffee5405c4e8b81586dde14f9bea2154fa798d5d76ce5ab8f2f07f55) |
| Contribution registration | `registerContribution` | `30105412` | [Blockscout](https://soneium.blockscout.com/tx/0x46d61b5e9cb33bb961ee12623760d59e4f237b0b33389be51fa8bd1b84a1d4df) |
| Creator decision | `decideContribution` | `30105502` | [Blockscout](https://soneium.blockscout.com/tx/0xf3b026b983f5e7c07a67ed71ff150d6262364cbc3d83cf2be29a2b80c1a1ab98) |

The exported evidence bundle was checked with FANOVA's read-only verifier, which returned **`VERIFIED`** after recomputing content hashes and checking contract storage, transaction receipts, and expected events. This is the project's verifier result, not a third-party audit or external certification. The smoke test used placeholder content (`Story title`), so it demonstrates the technical workflow, not a creator pilot or production use. Keep the original exported JSON to reproduce the checks; it contains the offchain content and is not committed to this repository. See [Demo and Evidence](./docs/DEMO_AND_EVIDENCE.md) for full details.

No ERC-20 token, production customer deployment, verified user base, or revenue is claimed. The contract records provenance hashes and creator decisions; it does not establish legal IP ownership or licensing.

**Target:** Sony Onchain Entertainment Incubation Program.

## Non-negotiable scope

The MVP is one complete, inspectable vertical slice:

1. Creator publishes an original story and permitted-use rules.
2. Fan submits a derivative work referencing the source story.
3. Creator approves or rejects the submission.
4. The app records provenance and the approval outcome; onchain writes are used only where they add durable, externally verifiable value.
5. If payment is implemented, a real transaction must demonstrate the declared split. No simulated transaction may be presented as live.

No marketplace sprawl, speculative DAO, invented Sony partnership, unlicensed third-party IP, or premature token launch.

## Source of truth

Before implementation tasks, read [`AGENTS.md`](./AGENTS.md) and [`docs/PROJECT_SKELETON.md`](./docs/PROJECT_SKELETON.md). Then read the relevant architecture, roadmap, and decision records. Do not silently expand scope.

## Project documents

- [Product manifesto and positioning](./docs/PRODUCT_MANIFEST.md)
- [Canonical scope and acceptance criteria](./docs/PROJECT_SKELETON.md)
- [Architecture and security boundaries](./docs/ARCHITECTURE.md)
- [Roadmap and current gates](./docs/ROADMAP.md)
- [Sony application evidence map](./docs/APPLICATION_EVIDENCE_MAP.md)
- [Competitive landscape](./docs/COMPETITIVE_LANDSCAPE.md)
- [Creator validation and pilot plan](./docs/CREATOR_VALIDATION.md)
- [Architecture decisions](./docs/DECISIONS.md)

## Evidence bundle verification

The browser includes a read-only verifier for exported FANOVA evidence bundles. It recomputes the story, permission, and contribution hashes; checks the creator-bound story ID; reads the matching story version and contribution records from Soneium contract storage; and checks the referenced transaction receipts and events. Older exported story versions remain verifiable when the bundle contains the matching historical story snapshot. The current verifier checks records included in the supplied bundle; it does not enumerate the full contract event history and therefore cannot prove that no contribution was omitted. A successful result applies to the included records, not to bundle completeness.

The verifier reports **PARTIALLY VERIFIED** when a local contribution has no verifiable registration transaction reference or when a local approve/reject decision has no verifiable onchain decision transaction. A bundle is not marked **VERIFIED** when its local decision outcome conflicts with the onchain evidence. The verifier is read-only and does not connect a wallet or submit transactions.
The wallet flow also stores the operation identifiers before submission and persists each returned transaction hash immediately, before waiting for a receipt. If a receipt fails or the browser is interrupted, inspect the saved hash on Blockscout before retrying; the UI deliberately blocks blind duplicate submissions.

An evidence bundle contains the offchain story and contribution text needed to recompute hashes. Treat the downloaded JSON as content that may need access controls. Onchain hashes and decisions do not establish legal ownership, copyright clearance, or enforceable consent.

## Soneium

- Mainnet, chain ID `1868`, RPC `https://rpc.soneium.org/`, explorer `https://soneium.blockscout.com/`.
- Minato testnet (chain ID `1946`) is optional for isolated testing.
- Native gas token is ETH. FANOVA does not need its own token to pay gas.

## Truth labels

Use `PLANNED`, `LOCAL`, `MAINNET`, and `INDEPENDENTLY VERIFIED` precisely. Do not call a feature live unless its transaction or behavior can be checked independently. A partial source match must not be described as full verification.
