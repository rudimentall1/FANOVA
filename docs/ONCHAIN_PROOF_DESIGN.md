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
- This is documented deployment evidence, not yet independent runtime-bytecode verification. Direct explorer address/API reads were not retrievable during this review. No contract call or transaction was made.

Sources:
- https://docs.soneium.org/docs/builders/contracts
- https://github.com/ethereum-attestation-service/eas-contracts
- https://soneium.blockscout.com/address/0x4200000000000000000000000000000000000021
- https://soneium.blockscout.com/address/0x4200000000000000000000000000000000000020

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

## Gates before implementation

1. Read-only verify chain ID 1868, non-empty runtime bytecode at both EAS addresses, and explorer/source metadata; compare code/ABI with the EAS catalog release.
2. Inspect available EAS schema registration and attestation methods, including revocation and resolver behavior; do not write to Mainnet.
3. Record the final choice in an accepted ADR after the evidence is complete.
4. Implement local contract tests and static/dependency checks; do not deploy until the user explicitly approves a specific manifest, account, gas estimate and transaction.

## Current status

- Soneium official address listing: **DOCUMENTED**.
- Live bytecode/source/runtime behavior: **NOT INDEPENDENTLY VERIFIED**.
- EAS-only or custom-contract choice: **NOT FINAL**.
- Contract implementation/deployment: **NOT IMPLEMENTED / NOT DEPLOYED**.
