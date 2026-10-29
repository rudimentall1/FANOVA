# FANOVA

**Fans don't just follow stories. They help shape them.**

FANOVA is an onchain entertainment product concept for creators and fan communities. The initial product lets a creator publish an original story, define what fan-created derivative works are permitted, review submissions, approve selected works, preserve their relationship to the source IP, and (only when a real payment flow is implemented) distribute proceeds according to explicit terms.

## Project status

**Stage:** local prototype / pre-MVP verification. A browser-local creator/fan flow and domain tests are committed. The repository test command and complete browser flow have not yet been independently run from a clean checkout. No deployed contracts, production integrations, verified users, revenue, or token are claimed.

**Target:** Sony Onchain Entertainment Incubation Program.

**Chain strategy:** Soneium Mainnet is the target network. Minato is optional for isolated pre-deployment checks, not a required stage. Mainnet deployment requires local tests, security review, and explicit user approval.

## Non-negotiable scope

The MVP is one complete, inspectable vertical slice:

1. Creator publishes an original story and permitted-use rules.
2. Fan submits a derivative work referencing the source story.
3. Creator approves or rejects the submission.
4. The app records provenance and the approval outcome; onchain writes are used only where they add durable, externally verifiable value.
5. If payment is implemented, a real transaction demonstrates the declared split. No simulated transaction may be presented as live.

No marketplace sprawl, speculative DAO, invented Sony partnership, unlicensed third-party IP, or premature token launch.

## Source of truth

Before every implementation task, read [`AGENTS.md`](./AGENTS.md) and [`docs/PROJECT_SKELETON.md`](./docs/PROJECT_SKELETON.md). Then read the relevant architecture, roadmap, and decision records. If a request conflicts with the skeleton, stop and explain the conflict before changing scope. Update the skeleton only through an explicit, documented decision; do not silently drift.

## Project documents

- [Canonical scope and acceptance criteria](./docs/PROJECT_SKELETON.md)
- [Architecture and security boundaries](./docs/ARCHITECTURE.md)
- [Roadmap and current gates](./docs/ROADMAP.md)
- [Sony application evidence map (24 questions)](./docs/APPLICATION_EVIDENCE_MAP.md)
- [Competitive landscape](./docs/COMPETITIVE_LANDSCAPE.md)
- [Creator validation and pilot plan](./docs/CREATOR_VALIDATION.md)
- [Architecture decisions](./docs/DECISIONS.md)

## Planned structure

- `apps/web/` — creator and fan experience
- `packages/shared/` — shared types, validation, and domain rules
- `contracts/` — minimal EVM contracts and Foundry tests
- `docs/` — product contract, architecture, roadmap, decisions, demo/evidence protocol
- `scripts/` — reproducible development and verification commands

The repository may not yet contain all planned directories. Their presence in this document is not a claim that the implementation exists.

## Soneium

- **Target: Soneium Mainnet**, chain ID `1868`, RPC `https://rpc.soneium.org/`, explorer `https://soneium.blockscout.com/`.
- Minato testnet (chain ID `1946`) is optional for pre-deployment checks only.
- Native gas token is ETH. FANOVA does not need its own token to pay gas.

Network details: [official Soneium docs](https://docs.soneium.org/docs/users/wallets).

## Truth labels

Use these labels in docs, demo, and application materials: `PLANNED`, `LOCAL`, `MAINNET`, `INDEPENDENTLY VERIFIED` (use `TESTNET` only when describing optional testing). Never call a feature live unless its transaction or behavior can be independently checked.

## Current priorities

1. Freeze product scope and architecture.
2. Build the smallest end-to-end story → submission → creator approval flow.
3. Add a minimal Soneium Mainnet provenance proof after the domain flow works locally, security checks pass, and deployment is explicitly approved.
4. Validate the experience with a real creator and fan users.
5. Prepare the Sony application using evidence, not claims.
