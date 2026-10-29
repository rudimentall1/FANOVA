# FANOVA

**Fans don't just follow stories. They help shape them.**

FANOVA is an onchain entertainment product concept for creators and fan communities. The initial product lets a creator publish an original story, define what fan-created derivative works are permitted, review submissions, approve selected works, and preserve the relationship to source IP. Revenue distribution is not implemented and is not claimed.

## Project status

**Stage:** local application prototype plus one deployed Soneium Mainnet provenance contract. The contract deployment is visible on [Blockscout](https://soneium.blockscout.com/address/0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880). The explorer currently reports **source code verified (partial match)**. This is not a full-match verification, independent security audit, or proof that the deployed bytecode matches the current repository revision. That comparison remains an open verification task.

Contract address: `0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880`

Deployment transaction: [`0xb2086bd26326b428f4806e9a93a202631528ec8bffe4ff9f9f8f102cf9e34c`](https://soneium.blockscout.com/tx/0xb2086bd26326b428f4806e9a93a202631528ec8bffe4ff9f9f8f102cf9e34c)

No ERC-20 token, production integration, verified users, or revenue is claimed. The contract records provenance hashes and creator decisions; it does not establish legal IP ownership or licensing.

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

- [Canonical scope and acceptance criteria](./docs/PROJECT_SKELETON.md)
- [Architecture and security boundaries](./docs/ARCHITECTURE.md)
- [Roadmap and current gates](./docs/ROADMAP.md)
- [Sony application evidence map](./docs/APPLICATION_EVIDENCE_MAP.md)
- [Competitive landscape](./docs/COMPETITIVE_LANDSCAPE.md)
- [Creator validation and pilot plan](./docs/CREATOR_VALIDATION.md)
- [Architecture decisions](./docs/DECISIONS.md)

## Soneium

- Mainnet, chain ID `1868`, RPC `https://rpc.soneium.org/`, explorer `https://soneium.blockscout.com/`.
- Minato testnet (chain ID `1946`) is optional for isolated testing.
- Native gas token is ETH. FANOVA does not need its own token to pay gas.

## Truth labels

Use `PLANNED`, `LOCAL`, `MAINNET`, and `INDEPENDENTLY VERIFIED` precisely. Do not call a feature live unless its transaction or behavior can be checked independently. A partial source match must not be described as full verification.
