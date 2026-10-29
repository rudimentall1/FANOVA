# Contracts

**Deployment status: MAINNET deployment exists. Source verification: PARTIAL MATCH.** This is not a full source-to-bytecode match or an independent security audit.

- Contract: [`FanovaProvenance`](https://soneium.blockscout.com/address/0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880)
- Address: `0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880`
- Deployment transaction: [`0xb2086bd26326b428f4806e9a93a202631528ec8bffe4ff9f9f8f102cf9e34c`](https://soneium.blockscout.com/tx/0xb2086bd26326b428f4806e9a93a202631528ec8bffe4ff9f9f8f102cf9e34c)
- Network: Soneium Mainnet, chain ID `1868`
- Compiler configuration in this repository: Solidity `0.8.27`, EVM target `cancun`, optimizer enabled, 200 runs.
- **Open verification item:** compare the deployed runtime bytecode with a reproducible build of the exact source revision used for deployment. The current repository revision must not be assumed to be the deployed source until that comparison succeeds.

`FanovaProvenance.sol` implements the narrow story-version, permission-hash, contribution, and creator-decision state machine selected in ADR-012. It is not a general IP registry and does not prove legal IP ownership or licensing.

## Invariants

- A story ID is derived from the registering creator address and a creator-chosen salt; only that creator can register later versions.
- Source versions are sequential. A changed permission hash requires a higher permission version.
- A contribution must reference the exact current source version and permission hash and submit an explicit acknowledgement flag. This is the contributor's onchain assertion, not proof they read or understood the text or that they have legal rights.
- A version bump makes older pending contributions stale for review.
- Only the story creator can approve or reject a contribution, and only one final decision is allowed.
- Content and personal data stay offchain; the contract stores hashes and identifiers only.

## Local verification

- Build: `forge build --sizes`
- Tests: `forge test -vvv`
- Formatting: `forge fmt --check`
- GitHub Actions workflow: [FANOVA contract tests](../.github/workflows/fanova-contracts.yml)

The deployment manifest generator produces a local build fingerprint; by itself it is not evidence of deployed-bytecode equivalence.
