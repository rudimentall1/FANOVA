# FANOVA Architecture

**Status:** proposed baseline; implementation must be verified separately.

## System shape
```text
Creator / Fan Browser
        |
        v
Web UI (creator story setup, contribution submission, review)
        |
        v
Domain rules + validation
  - permission acknowledgement
  - source version linkage
  - creator authorization
  - approval state transitions
        |
        +------> Offchain content/metadata storage
        |
        +------> Soneium Minato chain adapter
                    |
                    v
             Minimal provenance contract
                    |
                    v
             Minato explorer / transaction evidence
```

## Proposed implementation
- TypeScript web app, with a small component surface and accessible responsive UI.
- Shared domain types and validation separated from UI code.
- Solidity contracts tested with Foundry, using established libraries where appropriate.
- A chain adapter that rejects unexpected chain IDs and clearly distinguishes disconnected/local/testnet state.
- Keep content bodies offchain; onchain data should be limited to hashes/identifiers, creator authorization, decision events, and references that do not expose private data.
- No AI generation in the first vertical slice. AI may be added later only if a specific user-tested task requires it.

## Domain entities
- `Story`: stable ID, creator address/identity, source version, content reference/hash, permission text/version, status.
- `Contribution`: stable ID, source story/version, contributor identity, content reference/hash, permission acknowledgement, status.
- `ReviewDecision`: contribution ID, authorized reviewer, approve/reject outcome, timestamp, reason code.
- `ProvenanceRecord`: source hash, contribution hash, relationship, authorized decision, transaction reference.
- `PaymentSplit`: future-only model; not part of the baseline unless the real payment flow is explicitly added.

## Trust boundaries
- Client-supplied creator identity is untrusted until authenticated.
- A wallet address does not prove legal ownership of an IP.
- A hash proves integrity of the referenced bytes only if the bytes are available for comparison; it does not prove authorship or legal rights.
- Offchain content storage availability is a product risk.
- Contract events are not a substitute for a legal license or signed agreement.
- Admin keys and deployment credentials must never enter the repository.

## Contract design gate
Do not write/deploy a contract until the product workflow and the exact external proof requirement are defined. The initial contract should be minimal, testable, and avoid storing full content, personal information, or broad mutable permissions. Enforce creator authorization onchain if the UI claims that approvals are onchain-authorized.

## Security checks
- Validate input length, content type, permission version, and source ID.
- Reject approval by a non-authorized creator.
- Reject contributions without required permission acknowledgement.
- Avoid trusting UI-only checks for security-sensitive actions.
- Test replay/duplicate IDs and stale source versions.
- Handle chain mismatch, wallet disconnect, rejected wallet prompt, RPC error, and failed transaction explicitly.
