# Contracts

**Status: LOCAL implementation and tests; not deployed.** Thirteen Foundry tests passed in GitHub Actions run [40895893460](https://github.com/rudimentall1/FANOVA/actions/runs/40895893460).

`FanovaProvenance.sol` implements the narrow story-version, permission-hash, contribution, and creator-decision state machine selected in ADR-012. It is not a general IP registry and does not prove legal IP ownership or licensing.

## Invariants

- A story ID is derived from the registering creator address and a creator-chosen salt, preventing another address from front-running the same ID; only that creator can register later versions.
- Source versions are sequential. A changed permission hash requires a higher permission version.
- A contribution must reference the exact current source version and permission hash, and submit an explicit acknowledgement flag. This is the contributor's onchain assertion, not proof they read or understood the text or that they have legal rights.
- A version bump makes older pending contributions stale for review.
- Only the story creator can approve/reject a contribution, and only one final decision is allowed.
- Content and personal data stay offchain; the contract stores hashes and identifiers only.

## Verification

- Foundry tests: `forge test -vvv`
- Formatting: `forge fmt --check`
- GitHub Actions workflow: [FANOVA contract tests](../.github/workflows/fanova-contracts.yml)

Mainnet deployment is not authorized. Any deployment requires passing local tests, security/static checks, dependency review, a deployment manifest, a gas estimate, and explicit user approval. Minato remains optional.
