# Competitive Landscape — FANOVA

**Status:** desk research, 2026-10-29. Not a comprehensive market map; direct customer interviews and hands-on competitor tests remain outstanding.

## Strategic finding

Soneium's October 2026 direction describes an IP Registry, IP Graph, IP Execution Layer, and its intention to support ERC-8432 as a machine-readable IP/licensing interface. The ERC itself is still a draft; its forum post says the reference implementation is not audited and is not intended for production use. We have not verified a deployed production-ready ERC-8432 implementation on Soneium. Its stated use cases include narrative content, fan-created derivatives, attribution, and optional monetization. FANOVA must not position generic “onchain provenance for derivatives” as a unique invention. Its product-level differentiation has to be a better creator-facing workflow and real creator/community adoption, built to interoperate with shared Soneium infrastructure rather than duplicate it.

Sources:
- Soneium, “Unveiling the Onchain Entertainment Economy” (2026-10-26): https://soneium.org/en/blog/onchain-entertainment-economy
- Soneium Vision Paper — ecosystem and use cases: https://docs.soneium.org/docs/vision-paper/ecosystem-and-use-cases
- Soneium initiatives / ERC-8432: https://docs.soneium.org/docs/vision-paper/key-initiatives
- ERC-8432 draft discussion and implementation caveat: https://ethereum-magicians.org/t/erc-8432-onchain-ip-asset-and-license-registry/29792
- Soneium Portal: https://portal.soneium.org/en

## Adjacent products and infrastructure

| Product/category | Publicly stated focus | Overlap with FANOVA | Product gap FANOVA could test; not a proven advantage |
|---|---|---|---|
| Soneium Portal | Official discovery and participation hub for Tokenized IP, including IP Tokens, IP Vaults and IP Bonds | Creator/IP discovery and fan participation on the same ecosystem | A focused operational workflow for a creator to define contribution permissions, receive text/story derivatives, review them, and publish a decision may complement Portal; integration/overlap must be checked, not assumed. |
| Soneium Onchain IP Architecture / ERC-8432 | IP registration, machine-readable licensing, relationships between originals and derivatives, and programmable value flow | Direct architectural overlap in rights metadata and provenance | FANOVA should use or reference these shared standards where practical, and focus on user workflow, moderation, permission acknowledgement, and editorial decisions. The standard is draft-stage and its reference implementation is explicitly not production-ready; deployed contract availability and interface details must be verified. |
| General fan-fiction / creator-publishing platforms | Publish stories, host communities, and allow creators or communities to review content depending on the platform | Core creative behavior and audience habit; often familiar UX | FANOVA's potential differentiator is not “fans can write stories”; it is explicit creator-defined permitted use, contribution-to-source version linkage, and an auditable approval decision. Validate whether creators care enough to change workflow. |
| General IP/provenance protocols and registries | Records, licensing metadata, attribution, or content provenance | Infrastructure overlap | Not a substitute for finding an author who needs the workflow. FANOVA should avoid building a new registry until an integration gap is demonstrated. |

## Positioning to test

**Proposed:** “FANOVA gives creators a controlled way to invite fan-created continuations, review them under explicit rules, and preserve an inspectable link between the source story and the creator-approved contribution.”

This is a hypothesis, not a verified unique selling proposition.

## What must be validated before claiming differentiation

1. Interview 5–10 independent creators, webtoon/comic authors, or small IP studios.
2. Ask how they currently receive fan works, grant permission, moderate submissions, credit contributors, and decide whether a fan work becomes canon.
3. Observe a real current workflow and identify time, trust, legal, and moderation costs.
4. Test whether at least one creator will supply original material and participate in a pilot under written terms.
5. Verify Soneium's actual registry/license contracts, ERC-8432 implementation status, and whether FANOVA can reference them without duplicating core functionality.
6. Compare the prototype against at least two real alternatives hands-on; document exactly what each supports.

## Claims to avoid

- “First,” “only,” or “unique” without a defensible market review.
- “Legal rights verified by blockchain.”
- “Automatic licensing/royalties” unless implemented and independently verified.
- “Sony partnership” or “Soneium integration” before a real integration exists.
- Treating Soneium Portal as a direct competitor or integration partner without testing its actual workflow.
