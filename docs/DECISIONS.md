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
- **Status:** Accepted
- **Context:** The application is focused on Soneium and a verifiable chain integration is useful evidence.
- **Decision:** Develop and demonstrate on Soneium Minato testnet first. Mainnet is not in the one-month baseline.
- **Alternatives rejected:** Mainnet-first, multi-chain deployment.
- **Consequences:** Testnet transaction evidence can be publicly inspected without putting real value at risk. Testnet behavior does not prove mainnet readiness.

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
- **Decision:** Every capability is labelled `PLANNED`, `LOCAL`, `TESTNET`, `MAINNET`, or `INDEPENDENTLY VERIFIED`. No fake transaction IDs, user metrics, partnerships, or IP rights claims.
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
