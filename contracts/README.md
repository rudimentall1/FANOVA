# Contracts

**Status: PLANNED. No contract deployment is claimed.**

Contracts are added only after the local workflow is defined and tested. The initial contract should provide the minimum verifiable provenance/decision proof required by the MVP.

Requirements:
- Solidity + Foundry tests.
- Explicit creator authorization for onchain approval decisions if the product claims such enforcement.
- Reject unauthorized calls and invalid/replayed identifiers.
- No full story text or personal data onchain.
- Test locally first; target Soneium Mainnet after security checks and explicit user approval. Minato is optional.
- Never deploy to Mainnet or use a tradable FANOVA token without explicit approval.

Deployment manifests and evidence belong under `docs/evidence/` only after a real deployment.
