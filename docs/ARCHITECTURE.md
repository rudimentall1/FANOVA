# FANOVA Architecture

**Status:** proposed baseline; local web flow and initial provenance contract are implemented, but the contract is not deployed and still requires security/static review.

## System shape
```text
Creator / Fan Browser
        |
        v
Web UI: story setup, contribution submission, review
        |
        v
Domain rules + validation
  - permission acknowledgement
  - exact source-version linkage
  - creator authorization
  - approval state transitions
        |
        +----> Offchain content / metadata storage
        |
        +----> Soneium Mainnet adapter (chain ID 1868)
                    |
                    v
             Minimal provenance contract
                    |
                    v
             Mainnet explorer / transaction evidence
```

## Proposed implementation
- TypeScript web app with a small, accessible component surface.
- Shared domain types and validation separated from UI.
- Solidity contracts tested locally with Foundry and established libraries where appropriate.
- Mainnet adapter checks chain ID and distinguishes disconnected/local/mainnet states.
- Minato is optional for isolated pre-deployment checks, not the default target or required milestone.
- Story bodies stay offchain. Onchain data is limited to hashes/identifiers, authorization and decision events, and non-sensitive references.\n- Before designing a custom provenance registry, verify the actual availability, interfaces, and licensing model of Soneium's IP Registry/IP Graph architecture and ERC-8432. As of 2026-10-29, ERC-8432 is a draft; Soneium says it intends to support it, and the linked reference implementation is explicitly unaudited and not production-ready. No deployed production-ready implementation has been verified in this project. Prefer interoperating with shared infrastructure where practical; do not duplicate registry functionality without a documented gap.
- No AI generation in the first vertical slice.

## Domain entities
- `Story`: stable ID, creator identity/address, source version, content reference/hash, permission text/version, status.
- `Contribution`: stable ID, source story/version, contributor identity, content reference/hash, permission acknowledgement, status.
- `ReviewDecision`: contribution ID, authorized reviewer, outcome, timestamp, reason code.
- `ProvenanceRecord`: source hash, contribution hash, relationship, authorized decision, transaction reference.
- `PaymentSplit`: future-only; not in the baseline unless explicitly approved.

## Trust boundaries
- Client-supplied creator identity is untrusted until authenticated.
- A wallet address does not prove legal ownership of IP.
- A hash proves integrity only when the referenced bytes can be compared; it does not prove authorship or legal rights.
- Offchain storage availability is a product risk.
- Contract events do not replace a license or signed agreement.
- Deployment credentials and private keys must never enter the repository.

## Provenance proof requirements
See [`docs/PROVENANCE_REQUIREMENTS.md`](PROVENANCE_REQUIREMENTS.md) for the exact external claim, minimum evidence, authorization invariants, and deployment gates. [`docs/ONCHAIN_PROOF_DESIGN.md`](ONCHAIN_PROOF_DESIGN.md) compares EAS attestations with a minimal workflow contract. Read-only checks confirmed Soneium EAS/SchemaRegistry bytecode, proxy relationships, reported versions, and explorer source-verification flags; upstream source/build equivalence remains unresolved. EAS alone records attestations and does not enforce FANOVA's creator authorization or one-final-decision invariants. ADR-012 selects a minimal FANOVA workflow contract, not EAS-only attestations. The contract and 20 adversarial/unit tests pass in CI, and Slither reports zero results. This is LOCAL only; no deployment or transaction has been performed.

## Contract design gate
The local workflow and external proof requirement are defined, and ADR-012 authorizes the current local implementation. Further contract changes must address a documented test or review finding. Keep the contract minimal and avoid storing full content, personal information, or broad mutable permissions. Enforce creator authorization onchain if the UI claims approvals are onchain-authorized. No deployment is authorized.

## Mainnet deployment gate
Mainnet is the target, but deployment is not automatic. Before requesting approval:
1. Complete and test the local end-to-end workflow.
2. Define the exact claim the contract proves and the minimum data/events needed.
3. Run contract tests, static checks, and dependency review; document gaps.
4. Confirm deployment account, network, estimated gas, verification, and upgrade limitations.
5. Prepare a deployment manifest and commands without exposing credentials.
6. Obtain explicit user approval before any real transaction.

## Security checks
- Validate input length, content type, permission version, and source ID.
- Bind a story ID to the first registering creator address, so another address cannot front-run and claim that same ID.
- Reject approval by a non-authorized creator.
- Reject contributions without required permission acknowledgement.
- Do not rely on UI-only checks for security-sensitive actions.
- Test replay/duplicate IDs and stale source versions.
- Handle chain mismatch, wallet disconnect, rejected wallet prompt, RPC errors, and failed transactions explicitly.
