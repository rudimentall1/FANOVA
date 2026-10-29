# FANOVA Architecture Decision Record

This file is the append-only record of material project decisions. New decisions must include date, context, decision, alternatives, consequences, and approval status.

## ADR-001 — Product focus and scope lock
- **Date:** 2026-10-29
- **Status:** Accepted
- **Context:** Approximately one month is available to prepare a credible Sony Onchain Entertainment Incubation Program application and MVP.
- **Decision:** Build one end-to-end creator/fan workflow for permitted fan-created derivative stories: publish source and permissions → submit contribution → creator review → provenance/decision proof.
- **Alternatives rejected:** NFT marketplace, general creator platform, DAO, generic AI content generator, broad fan social network.
- **Consequences:** Narrow scope, faster evidence, less feature breadth. Creator participation and rights permissions are key risks.

## ADR-002 — Soneium Mainnet target
- **Date:** 2026-10-29
- **Status:** Accepted
- **Context:** Soneium Mainnet is live. A real mainnet integration is the intended product target; a testnet-only MVP would not satisfy that target by itself.
- **Decision:** Target Soneium Mainnet (chain ID `1868`). Minato (chain ID `1946`) is optional for risk-reducing checks and is not a mandatory stage or the target network. Mainnet deployment happens only after local workflow, contract tests, security checks, cost estimation, and explicit user approval.
- **Alternatives rejected:** Treat Minato as mandatory; deploy to mainnet before implementation and security gates pass; multi-chain deployment.
- **Consequences:** The product plan is mainnet-oriented, but no real-value transaction is made without approval. Local tests remain mandatory; testnet is optional.

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
