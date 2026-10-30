# FANOVA Architecture

**Status (2026-10-30):** the local web workflow and provenance contract are implemented. The contract is deployed on Soneium Mainnet at `0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880`. CI confirms executable runtime bytecode matches the current build after removing Solidity metadata; full runtime metadata differs. The wallet path has completed one user-approved Story registration, Contribution registration, and Creator decision sequence on Mainnet. FANOVA's read-only evidence-bundle verifier returned `VERIFIED` after recomputing hashes and checking contract storage and transaction receipts/events. This is a project-verifier result, not a third-party audit or certification. Transaction details are recorded in `docs/DEMO_AND_EVIDENCE.md`.

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
- The local role switch and `Demo Creator` / `Demo Fan` labels are simulated demo identities, not authentication. In the onchain workflow, the signer address is read from Rabby and the contract records `msg.sender`; use that address, not a display name, as the attributable actor.
- The evidence verifier now scans the contract's story-version, contribution, and decision events from deployment through a fixed verification block and reconciles them with the bundle. The implementation and unit tests pass CI; live Mainnet validation of the new scan remains pending.
- A wallet address does not prove legal ownership of IP.
- A hash proves integrity only when the referenced bytes can be compared; it does not prove authorship or legal rights.
- Offchain storage availability is a product risk.
- Contract events do not replace a license or signed agreement.
- Deployment credentials and private keys must never enter the repository.

## Provenance proof requirements
See [`docs/PROVENANCE_REQUIREMENTS.md`](PROVENANCE_REQUIREMENTS.md) for the exact external claim, minimum evidence, authorization invariants, and deployment gates. [`docs/ONCHAIN_PROOF_DESIGN.md`](ONCHAIN_PROOF_DESIGN.md) compares EAS attestations with a minimal workflow contract. Read-only checks confirmed Soneium EAS/SchemaRegistry bytecode, proxy relationships, reported versions, and explorer source-verification flags; upstream source/build equivalence remains unresolved. EAS alone records attestations and does not enforce FANOVA's creator authorization or one-final-decision invariants. ADR-012 selects a minimal FANOVA workflow contract, not EAS-only attestations. The contract and adversarial/unit tests pass in CI, and Slither reported zero findings in the recorded scan. The contract is MAINNET. The demonstrated Story registration, Contribution registration, and Creator decision are also recorded on MAINNET; the offchain Story and Contribution content remains in the browser/exported bundle. FANOVA's read-only evidence verifier returned `VERIFIED` for that bundle. The deployment panel checks only chain ID and code presence. The evidence verifier checks exported hash inputs against contract storage and referenced receipts; it does not prove source equivalence, legal ownership, copyright clearance, or enforceable consent.

## Contract design gate
The local workflow and external proof requirement are defined, and ADR-012 authorizes the current implementation. The contract is already deployed at the address above; do not redeploy or spend funds without explicit approval. Further contract changes must address a documented test or review finding. Keep the contract minimal and avoid storing full content, personal information, or broad mutable permissions. The UI must not describe local approvals as onchain-authorized.

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

## Multi-user web architecture target (ADR-017)

The current `apps/web` implementation is a dependency-light browser prototype. Its localStorage state and simulated role switch are not production identity or persistence. The target architecture adds a server-side application boundary:

```text
Public browser pages / authenticated workspaces
                    |
                    v
             Server application
       authentication + session validation
       role / ownership authorization
       input validation + domain transitions
                    |
          +---------+----------+
          |         |          |
          v         v          v
       Database  File store  Soneium adapter
       users     story/media  wallet initiated
       works     contribution writes only
       versions               after user approval
       submissions
       decisions
          |
          v
       Audit events
```

### Required boundaries
- Browser code never connects directly to privileged database credentials or receives server secrets.
- Every read/write involving private data is authorized server-side for the authenticated user and target resource.
- Public catalogue queries return only published and public fields.
- Story bodies, contribution content, drafts, email addresses, and profile-private fields remain offchain.
- Authentication provider identity and wallet address are separate. Wallet linking requires a signed, nonce-protected challenge.
- Existing contract calls remain user-initiated through the browser wallet. The backend must not custody keys or submit transactions as users.
- Database migrations and access policies are version-controlled and reproducible.
- The local prototype remains available for isolated domain tests, but localStorage is not production persistence.

### Stack selection gate
Before implementation, inspect the current hosting/deployment path and compare a maintained managed authentication + Postgres service against a self-hosted backend. The decision must account for free-tier limits, data retention/pausing, backups, email delivery, storage limits, secret management, region/privacy requirements, and migration portability. Do not put a production database on the existing resource-constrained bot/VPS host without a separate capacity and isolation review. Record the selected stack in a new ADR before credentials or deployment changes.

### Migration approach
Do not rewrite the provenance contract or discard the current domain logic. Extract/reuse its domain validation and onchain adapter behind server-backed work/contribution records. Replace the simulated role switch with authenticated roles, then migrate the public pages and workspaces incrementally. Keep the old local demo isolated until the server-backed flow passes the product acceptance criteria.

