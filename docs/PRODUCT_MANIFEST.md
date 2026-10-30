# FANOVA — Product Manifest

**Positioning:** Creator-Controlled Collaborative IP Product  
**Ecosystem:** Soneium  
**Target:** Sony Onchain Entertainment Incubation Program  
**Status date:** 2026-10-30

## Product

FANOVA gives creators and authorized IP holders a controlled workflow for inviting community participation in the development of story-based intellectual property.

A creator publishes a source story and permitted-use rules. Contributors submit derivative work linked to a specific source version. The creator reviews and approves or rejects each submission. FANOVA preserves a verifiable relationship between the source version, the contributor's wallet address, and the creator's onchain decision.

FANOVA is a product and workflow layer. It is not a general-purpose IP registry, IP graph, licensing standard, or replacement for Soneium infrastructure.

## Why it matters

Entertainment IP holders need ways to involve fans without surrendering control over the source universe. Fan communities already create derivative material, but the relationship between source work, contributor, permission rules, and creator approval is often fragmented across platforms.

FANOVA focuses on making that workflow explicit and inspectable. It gives the creator the decision point and gives the contributor a durable record of the submitted work and the creator's decision.

This is a product hypothesis, not validated market demand. No Sony relationship, licensed IP partner, or production creator cohort is claimed.

## Core roles

| Role | Current responsibility | Current evidence |
|---|---|---|
| Creator / authorized IP participant | Publishes source story and rules; makes the final decision | Creator address is recorded in the contract; legal ownership is not verified |
| Contributor | Submits work linked to a source version and acknowledges displayed rules | Contributor address and contribution hash are recorded onchain |
| Reader / evaluator | Inspects the story workflow and proof | Can inspect the browser demo, exported evidence, and Soneium transactions |
| FANOVA | Presents the workflow and evidence | Local browser prototype plus minimal Soneium provenance contract |

Display names in the local demo are simulated labels. They are not authenticated identities or cryptographically bound wallet profiles. Contract-recorded addresses are the authoritative identities for onchain actions.

## Current implemented vertical slice

1. Story version registration.
2. Contribution registration bound to a story and permission version.
3. Creator-only final approve/reject decision.
4. Onchain hashes, addresses, and decision events.
5. Read-only verification of the records included in an exported evidence bundle.

One user-approved Mainnet sequence completed on 2026-10-30. The project's verifier returned `VERIFIED` for the included story, contribution, and decision records. It does not yet enumerate all contract events and cannot prove that no contribution was omitted from the bundle.

The smoke test used placeholder content. It demonstrates the technical path, not a creator pilot, user traction, or product-market fit.

## What is not implemented

- Legal IP ownership or copyright-clearance verification.
- Enforceable derivative-work licensing.
- Production identity management or server-backed multi-user persistence.
- Creative campaigns or a public creator marketplace.
- Revenue collection, escrow, royalty calculation, or USDC distribution.
- FANOVA token issuance.
- Production integration with Soneium's IP Registry, IP Graph, or ERC-8432 licensing primitives.
- Independent security audit or third-party reproduction of the evidence verifier.

## Future direction

The intended progression is:

**Creator-controlled contributions → structured derivative licensing → commercial use → contributor revenue participation.**

Any commercial participation must be based on explicit, reviewable terms and a real execution mechanism. A content hash or creator approval event alone is not a legal license and does not create an automatic right to payment.

The product should integrate with suitable Soneium-native IP and licensing primitives if their deployed interfaces, semantics, and security properties are verified. FANOVA should add the creator-facing workflow and experience rather than duplicate ecosystem infrastructure.

## Product principles

1. Creators retain control over review decisions.
2. Contributors receive attributable, inspectable records.
3. Wallet addresses are not presented as proof of legal identity or IP ownership.
4. Onchain evidence is scoped precisely; included-record verification is not bundle-completeness verification.
5. No token, payment, license, partnership, user metric, or security claim is presented as live without direct evidence.
