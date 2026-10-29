# FANOVA Onchain Proof Design: EAS vs Minimal Workflow Contract

**Status:** architecture comparison; no implementation, deployment, or transaction has been performed.
**Date:** 2026-10-29
**Milestone:** P2 — Mainnet provenance path.

## Decision question

What is the smallest Soneium Mainnet mechanism that lets an outsider verify that the address associated with a source-story version recorded a decision for a contribution bound to that exact version and permission statement?

This does not prove legal ownership, authorship, copyright clearance, or enforceable licensing. Content remains offchain; only hashes and identifiers are onchain.

## Evidence gathered

- Soneium's official contract directory lists SchemaRegistry at 0x4200000000000000000000000000000000000020 and EAS at 0x4200000000000000000000000000000000000021.
- The EAS deployment catalog lists Soneium deployments as version 1.4.1-beta.1, including EAS, SchemaRegistry, EIP712Proxy and Indexer.
- The official Blockscout explorer is available at https://soneium.blockscout.com/.
- Read-only GitHub Actions run 4 queried Soneium Mainnet RPC and Blockscout at 2026-10-29 14:13:12 UTC. Chain ID returned 1868. Both documented addresses returned runtime bytecode; Blockscout marks both proxy source and implementation source as verified. The proxy bytecode is 2,059 bytes and identical at both addresses. The EIP-1967 implementation slot resolved to distinct implementations below. No transaction was made. See [successful run](https://github.com/rudimentall1/FANOVA/actions/runs/40889396396).

Sources:
- https://docs.soneium.org/docs/builders/contracts
- https://github.com/ethereum-attestation-service/eas-contracts
- https://soneium.blockscout.com/address/0x4200000000000000000000000000000000000021
- https://soneium.blockscout.com/address/0x4200000000000000000000000000000000000020

## Read-only runtime findings (2026-10-29)

| Contract | Proxy address | Runtime bytes | EIP-1967 implementation | Implementation bytes | Explorer source metadata |
|---|---|---:|---|---:|---|
| SchemaRegistry | `0x4200000000000000000000000000000000000020` | 2,059 | `0x70DE55BC0bfBC52C5D0CCA1DA5816c2428886A34` | 2,046 | Proxy and implementation marked verified |
| EAS | `0x4200000000000000000000000000000000000021` | 2,059 | `0xbEc660b456B84A081E90aF29BE43385BDa5bF7b6` | 17,790 | Proxy and implementation marked verified |

Proxy runtime SHA-256 fingerprint for both: `30ccc4ce49c00fae11d7118fc244f29a13788fb32cd4022ee69acc2f15c0e2f5`. SchemaRegistry implementation fingerprint: `ee7f41153155ac31718d816854c8f3c2893e32ae6462322f8cb8506f5582f966`. EAS implementation fingerprint: `42f7133847dbd6a7be9f27eb8f3ff8c4465d7a47557281dc15f7d95a18114e4c`. These are SHA-256 fingerprints of fetched runtime bytes, not EVM keccak code hashes. Explorer source verification does not alone prove that the deployed bytecode matches a particular upstream release or that behavior satisfies FANOVA's requirements.

The verifier reads the standard EIP-1967 implementation, admin, and beacon slots and performs read-only `eth_call` requests for EAS `version()`, EAS `getSchemaRegistry()`, SchemaRegistry `version()`, and `ProxyAdmin.owner()`. Successful run [40894755106](https://github.com/rudimentall1/FANOVA/actions/runs/40894755106) observed EAS `1.4.1-beta.3`, SchemaRegistry `1.3.1-beta.2`, the expected SchemaRegistry address, and ProxyAdmin owner `0x6b1bae59d09fccbddb6c6cceb07b7279367c4e3b`. Both EAS/SchemaRegistry EIP-1967 admin slots point to `0x4200000000000000000000000000000000000018`, documented by Soneium as ProxyAdmin. The ProxyAdmin predeploy is itself an EIP-1967 proxy with implementation `0x893c2CEEb71D38514daF67728d3Ff1b213FC4B5F` (7,187 runtime bytes, explorer marks source verified). Its `owner()` returns `0x6b1bae59d09fccbddb6c6cceb07b7279367c4e3b`; `eth_getCode` returns no runtime bytecode at that owner address. This is consistent with an EOA-style owner address, but does not identify the person/key holder or establish offchain governance. The ProxyAdmin proxy's admin slot points back to `0x4200000000000000000000000000000000000018`. These slots do not cover every possible upgrade pattern.

The EAS repository also contains `deployments/soneium/solcInputs/ab2e55c92b39ec3be86af0608f634927.json`. The checked-in input uses Solidity `0.8.27`, optimizer runs `1000000`, and EVM target `paris`; its EAS and SchemaRegistry sources each declare `Semver(1, 3, 0)`. The live explorer metadata reports implementation compiler `0.8.19`, while onchain `version()` returns EAS `1.4.1-beta.3` and SchemaRegistry `1.3.1-beta.2`. This is a material mismatch: the currently checked-in upstream solc input does not establish that its source/settings produced the live implementation. The exact deployment-source artifact/version and upgrade authority still require investigation.

## Option A: EAS attestations only

Proposed records:
1. Story publication: storyId, sourceVersion, sourceContentHash, permissionVersion, permissionHash.
2. Contribution submission: contributionId, storyId, sourceVersion, permissionHash, contributionContentHash, contributor.
3. Review decision: contributionId, storyId, sourceVersion, permissionHash, contributionContentHash, sourceAttestationUID, contributionAttestationUID, outcome, reasonCode.

A verifier must retrieve each attestation, recompute hashes from the original bytes, confirm the review attester matches the creator address on the source publication, and confirm all IDs and version/hash fields match. A creator can make an attestation without having legal rights to the content.

**Advantages:** avoids deploying a bespoke storage contract; uses a shared attestation format and explorer-inspectable records.

**Limitations:** EAS schema registration may require a transaction; EAS does not by itself enforce FANOVA-specific creator authorization, exact version matching, or one final decision. A verifier can detect inconsistent or duplicate decisions, but the protocol does not prevent them. Revocation and correction semantics also need to be explicit. The catalog's beta version label and live runtime code still need review.

**Claim supported:** “This address attested to this review outcome for the referenced hashes.” Not “the contract prevented unauthorized approvals” or “only one final decision is possible.”

## Option B: minimal FANOVA workflow contract

Candidate state and operations:
- Register a story once with a stable story ID, creator address, source version, source-content hash, permission version and permission hash.
- Register a contribution bound to an existing story and exact source/permission versions, with contributor address and content hash.
- Let only the stored creator address submit one final approve/reject decision for a registered contribution.
- Emit events containing the story/contribution IDs, versions, hashes, outcome and reviewer.
- Reject duplicate IDs, stale versions, unauthorized reviewers, invalid outcomes and repeated final decisions; rejected calls must leave state unchanged.

No full text, personal data, payment, token, NFT, royalty, or legal-rights claim belongs in the contract. Story edits should create a new version rather than silently mutate a prior version. Any correction after a final decision needs a separately specified model and is not in this MVP.

**Advantages:** enforces the core authorization and one-final-decision invariants onchain and provides a clear adversarial test target.

**Limitations:** new contract code adds audit, deployment, verification and maintenance risk. It is not a substitute for a shared IP registry and must not duplicate rights/license registry features.

**Claim supported after tests and verified deployment:** the contract accepted a final decision only from the registered creator address and bound it to the exact stored hashes/version. It still does not prove legal ownership or prevent offchain copying.

## Current assessment

EAS is a credible alternative for attestations, but it is not equivalent to the strict authorization/state invariants in PROVENANCE_REQUIREMENTS.md. If those invariants remain part of the product promise, a minimal workflow contract is the stronger fit unless a deployed, verified resolver or registry already enforces them. Do not add both EAS and a custom contract by default.

## Read-only verification tooling

`scripts/verify-soneium-readonly.mjs` queries the configured RPC for `eth_chainId`, `eth_getCode`, EIP-1967 implementation/admin/beacon slots for EAS, SchemaRegistry and ProxyAdmin, and read-only `owner()`/version/registry methods. It records runtime bytecode lengths and SHA-256 fingerprints and separately attempts to read Blockscout source metadata. It performs no transactions and has no private-key requirement. The SHA-256 value is a reproducible fingerprint, not the EVM keccak code hash. Explorer metadata failure is reported as unavailable rather than treated as proof that source is unverified. The workflow is `.github/workflows/soneium-readonly.yml`; its first run must pass and its output must be inspected before marking runtime evidence verified. Even a passing run does not verify contract method behavior or EAS schema/resolver semantics.

## Gates before implementation

1. Read-only verify chain ID 1868, non-empty runtime bytecode at both EAS addresses, and explorer/source metadata; compare code/ABI with the EAS catalog release.
2. Inspect available EAS schema registration and attestation methods, including revocation and resolver behavior; do not write to Mainnet.
3. Record the final choice in an accepted ADR after the evidence is complete.
4. Implement local contract tests and static/dependency checks; do not deploy until the user explicitly approves a specific manifest, account, gas estimate and transaction.

## Current status

- Soneium official address listing: **DOCUMENTED**.
- Mainnet chain ID, runtime bytecode, EIP-1967 implementation addresses, and explorer source-verification flags: **INDEPENDENTLY VERIFIED** by read-only CI.
- EIP-1967 proxy admin slots and the ProxyAdmin `owner()` address: **INDEPENDENTLY VERIFIED** by read-only CI. Identity/key custody and governance controls for that owner: **NOT VERIFIED**.
- Upstream source/build equivalence and EAS schema/resolver semantics: **NOT YET VERIFIED**.
- EAS-only or custom-contract choice: **NOT FINAL**.
- Contract implementation/deployment: **NOT IMPLEMENTED / NOT DEPLOYED**.
