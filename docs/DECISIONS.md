# FANOVA Architecture Decision Record

This file is the append-only record of material project decisions. New decisions must include date, context, decision, alternatives, consequences, and approval status.

## ADR-001 — Product focus and scope lock
- **Date:** 2026-10-29
- **Status:** Accepted
- **Context:** Approximately one month is available to prepare a credible Sony Onchain Entertainment Incubation Program application and MVP.
- **Decision:** Build one end-to-end creator/fan workflow for permitted fan-created derivative stories: publish source and permissions → submit contribution → creator review → provenance/decision proof.
- **Alternatives rejected:** NFT marketplace, general creator platform, DAO, generic AI content generator, broad fan social network.
- **Consequences:** Narrow scope, faster evidence, less feature breadth. Creator participation and rights permissions are key risks.

## ADR-002 — Soneium Minato first
- **Date:** 2026-10-29
- **Status:** Superseded by ADR-005
- **Context:** The initial plan prioritized low-cost public proof while the local workflow was being built.
- **Original decision:** Develop and demonstrate on Soneium Minato testnet first; mainnet was outside the initial baseline.
- **Original consequences:** Testnet behavior could be inspected without risking real value, but did not establish mainnet readiness.


## ADR-003 — No immediate token deployment
- **Date:** 2026-10-29
- **Status:** Accepted for MVP; application token plan remains an open requirement to verify
- **Context:** A token can be deployed on Soneium, but deployability alone is not product utility. The official application questionnaire must be checked to determine what it asks about token concept/plan.
- **Decision:** Do not deploy or market a tradable token during initial MVP work. Write a token concept only if it answers a concrete creator/fan need and the application requirement. Any deployment requires explicit user approval.
- **Alternatives rejected:** Launch a token just to appear more Web3-native.
- **Consequences:** Avoids unnecessary tokenomics, security, legal, and distribution work while preserving the option to propose a justified token model.

## ADR-004 — Evidence before claims
- **Date:** 2026-10-29
- **Status:** Accepted
- **Decision:** Every capability is labelled `PLANNED`, `LOCAL`, `MAINNET`, or `INDEPENDENTLY VERIFIED`. `TESTNET` is used only when describing optional testing, never as the default target. No fake transaction IDs, user metrics, partnerships, or IP rights claims.
- **Consequences:** Demo and application may contain fewer claims, but each claim is defensible.

## Template for new decisions
### ADR-XXX — Title
- **Date:**
- **Status:** Proposed / Accepted / Rejected
- **Context:**
- **Decision:**
- **Alternatives:**
- **Consequences:**
- **Explicit user approval:** Yes / No / Not required

## ADR-005 — Soneium Mainnet target
- **Date:** 2026-10-29
- **Status:** Accepted; supersedes ADR-002
- **Context:** The user clarified that Soneium Mainnet is already live and should be the actual project target, not a later optional upgrade after a mandatory testnet phase.
- **Decision:** Target Soneium Mainnet (chain ID `1868`). Minato (chain ID `1946`) is optional for isolated risk-reducing checks and is not a required milestone. Mainnet deployment happens only after the local workflow, contract tests, security checks, cost estimation, and explicit user approval.
- **Alternatives rejected:** Treat Minato as mandatory; deploy to mainnet before implementation and security gates pass; multi-chain deployment.
- **Consequences:** Product architecture and public configuration are Mainnet-oriented. Local tests remain mandatory; testnet is optional. No real-value transaction is made without explicit approval.
- **Explicit user approval:** Yes, in project conversation on 2026-10-29.

## ADR-006 — Evaluate shared Soneium IP infrastructure before custom provenance contract
- **Date:** 2026-10-29
- **Status:** Accepted for investigation; no production integration claimed
- **Context:** Soneium's published October 2026 direction describes an IP Registry, IP Graph, IP Execution Layer, and its intention to support ERC-8432. The ERC is still draft-stage; the linked reference implementation is unaudited and explicitly not intended for production. A custom FANOVA registry could duplicate ecosystem infrastructure and weaken interoperability.
- **Decision:** Before implementing a custom provenance contract, inspect official docs and deployed contract/interface availability; do not treat the draft reference implementation as production-ready; determine whether FANOVA can reference existing IP/license records and add only the creator-review workflow/proof that is missing. Build a custom minimal contract only if a specific gap is documented.
- **Alternatives:** Build a bespoke registry immediately; assume ERC-8432 is fully deployed without verification; abandon onchain provenance entirely.
- **Consequences:** Potentially stronger ecosystem fit and less duplicated infrastructure. Integration availability and compatibility remain unverified and must be established before code or claims.
- **Explicit user approval:** Not required for research and architecture assessment; no deployment or spending authorized.


## ADR-007 — Compare EAS attestations with a minimal workflow contract
- **Date:** 2026-10-29
- **Status:** Proposed; not accepted
- **Context:** Soneium's official contract directory lists EAS and SchemaRegistry predeploy addresses, and the EAS catalog lists a Soneium deployment labelled version 1.4.1-beta.1. However, EAS attestations alone do not enforce FANOVA's creator authorization, exact version binding, or single-final-decision invariants. Live runtime bytecode/source correspondence has not yet been independently verified.
- **Proposed decision:** Complete read-only runtime/source verification, then choose between EAS-only attestations (weaker claim: an address attested to a decision) and a minimal FANOVA workflow contract (stronger onchain authorization and finality invariants). Do not deploy both by default. Do not write or deploy a contract until this comparison is resolved and the relevant gates pass.
- **Alternatives:** Treat EAS as if it enforced application rules; deploy an EAS schema or contract immediately; build a broad IP registry; add both EAS and a custom contract without a demonstrated need.
- **Consequences:** Avoids overstating shared infrastructure and makes the security/claim trade-off explicit. P2 remains open.
- **Explicit user approval:** Not required for this research/design comparison; required before any Mainnet transaction or spending.


## ADR-008 — Read-only verification of Soneium EAS deployments
- **Date:** 2026-10-29
- **Status:** Accepted as an evidence finding; not a decision to integrate EAS
- **Context:** The documented EAS and SchemaRegistry addresses had not been checked against live Mainnet RPC.
- **Decision:** A read-only GitHub Actions verifier now checks chain ID, runtime bytecode, EIP-1967 implementation slots, and Blockscout source-verification metadata. Run 4 succeeded on chain ID 1868. Both proxy addresses have 2,059-byte runtime code and distinct implementations; Blockscout marks proxy and implementation source as verified.
- **Evidence:** https://github.com/rudimentall1/FANOVA/actions/runs/40889396396 ; detailed addresses and fingerprints in `docs/ONCHAIN_PROOF_DESIGN.md`.
- **Limitations:** Upstream artifact equivalence, proxy admin/upgrade authority, EAS method behavior, schema semantics, and resolver behavior remain unverified. This finding does not approve integration or deployment.
- **Consequences:** The initial address/runtime existence uncertainty is resolved. P2 remains open pending implementation-level review and functional read-only checks.
- **Explicit user approval:** Not required for read-only inspection; no writes or funds used.