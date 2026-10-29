# FANOVA Provenance Proof Requirements

**Status:** requirements proposal for P2; no contract has been implemented or deployed.
**Date:** 2026-10-29

## User-visible claim to prove

An external evaluator should be able to verify that a particular contribution was reviewed and approved (or rejected) by the creator address associated with a specific source-story version and its exact permission statement.

This is a provenance and workflow claim. It is **not** proof of legal ownership, authorship, enforceable licensing, or copyright clearance.

## Minimum evidence

The evidence record needs to bind:

- a stable story identifier;
- the source version and source-content hash;
- the permission version and hash of the exact permission text;
- a stable contribution identifier and contribution-content hash;
- the contributor address, if a real wallet is used;
- the review outcome, reviewer address, and decision timestamp;
- the network, contract address, transaction hash, and emitted event needed for independent inspection.

Full story/contribution text, personal data, and private review notes remain offchain. Hashes are useful only if the evaluator can obtain the referenced bytes and recompute them.

## Required authorization and state invariants

Any onchain implementation or adapter must demonstrate:

1. A story's creator authority is bound to an address by an explicit registration or an interoperable existing registry, not a UI role toggle.
2. A contribution references an exact source version and permission hash.
3. A review is accepted only from the authorized creator/reviewer for that story.
4. A stale source version or changed permission hash cannot be silently reviewed as if it referred to the current rules.
5. A contribution can receive only one final review decision unless a documented correction/revision model is introduced.
6. Rejected/unauthorized calls leave state unchanged and produce a reproducible failure.
7. The evaluator can inspect source/ABI and verify the transaction/event on Soneium Mainnet, chain ID 1868.

## Existing attestation infrastructure candidate: EAS

Soneium's official contract directory lists EAS at `0x4200000000000000000000000000000000000021` and SchemaRegistry at `0x4200000000000000000000000000000000000020`. The EAS deployment catalog lists Soneium deployments as version `1.4.1-beta.1`. Read-only CI independently queried chain ID 1868, found runtime bytecode at both addresses, resolved their EIP-1967 implementation slots, and observed Blockscout source metadata marking both proxies and implementations as verified. SchemaRegistry implementation: `0x70DE55BC0bfBC52C5D0CCA1DA5816c2428886A34` (2,046 runtime bytes). EAS implementation: `0xbEc660b456B84A081E90aF29BE43385BDa5bF7b6` (17,790 runtime bytes). The proxy runtime is 2,059 bytes at each address. See the run and detailed fingerprints in [`docs/ONCHAIN_PROOF_DESIGN.md`](ONCHAIN_PROOF_DESIGN.md). Upstream artifact equivalence, proxy admin/upgrade controls, and contract method behavior remain unverified; no transaction was made.

EAS can make signed story/contribution/review attestations inspectable, but does not by itself enforce FANOVA's creator authorization, stale-version rejection, or one-final-decision invariants. A verifier can detect duplicate or inconsistent attestations; that is not the same as preventing them. See [`docs/ONCHAIN_PROOF_DESIGN.md`](ONCHAIN_PROOF_DESIGN.md) for the option comparison and verification gates.

References: [Soneium contract directory](https://docs.soneium.org/docs/builders/contracts), [EAS deployment catalog](https://github.com/ethereum-attestation-service/eas-contracts), [EAS schema workflow](https://docs.attest.org/docs/core--concepts/how-eas-works), [Soneium Blockscout](https://soneium.blockscout.com/).

## Infrastructure decision gate

ADR-006 remains controlling. Before choosing a custom contract:

- identify any Soneium Mainnet IP Registry / ERC-8432 candidate from official sources or a verifiable deployment record;
- verify the address on chain, source/ABI, relevant interface support, administrative controls, and actual read/write behavior;
- determine whether its data model can represent the source asset, license terms, and derived work relationship required here;
- document any gap the existing system cannot cover.

The official Soneium contract directory reviewed on 2026-10-29 does not list an IP Registry/ERC-8432 deployment address. This is a discovery gap, not evidence that no deployment exists. Do not guess an address or integrate the unaudited draft reference implementation as if it were production-ready.

If no suitable deployed interface can be verified, propose a minimal custom registry only after recording the gap and reviewing the implementation/security trade-offs. The custom contract must not claim legal-rights verification.

## Explicitly out of scope

- Storing full content or personal data onchain.
- Royalty distribution, token issuance, NFT minting, or payments.
- Legal enforcement, dispute resolution, or proof that the submitter owns rights.
- Cross-chain verification or automatic discovery of every derivative.
- Mainnet deployment or any transaction spending real funds without explicit user approval.

## Acceptance evidence before deployment can be requested

- Unit and adversarial contract tests for authorization, stale versions, duplicate decisions, and invalid outcomes.
- Static analysis and dependency review with unresolved findings disclosed.
- Reproducible deployment manifest and gas estimate.
- Verified source and a documented independent verification procedure.
- Wallet/chain mismatch, rejected signature, RPC failure, and failed transaction handling in the client.
- Explicit user approval for the proposed deployment and real-value transaction.

Until these gates pass, status is **PLANNED** for the onchain path and **LOCAL** for the browser workflow.
