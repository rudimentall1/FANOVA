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

## ADR-009 — Live EAS version and upgrade-control mismatch requires further verification
- **Date:** 2026-10-29
- **Status:** Accepted as an evidence finding; architecture choice remains open
- **Context:** The successful read-only run [40894496102](https://github.com/rudimentall1/FANOVA/actions/runs/40894496102) returned EAS version `1.4.1-beta.3`, SchemaRegistry version `1.3.1-beta.2`, and ProxyAdmin owner `0x6b1bae59d09fccbddb6c6cceb07b7279367c4e3b`. EAS and SchemaRegistry EIP-1967 admin slots both point to Soneium's documented ProxyAdmin predeploy at `0x4200000000000000000000000000000000000018`.
- **Finding:** The EAS repository's current Soneium `solcInputs/ab2e55c92b39ec3be86af0608f634927.json` declares Solidity 0.8.27 and source constructors `Semver(1,3,0)`; Blockscout live implementation metadata reports compiler 0.8.19 and the live view methods return different beta versions. This input is not evidence of exact equivalence to the deployed implementation.
- **Decision:** Do not integrate EAS or rely on its current upstream input as a matching build artifact yet. Continue read-only investigation of the ProxyAdmin implementation/owner control and locate a source/build artifact that matches the deployed implementation metadata and onchain versions. Keep EAS vs minimal FANOVA contract decision open.
- **Consequences:** Existing runtime/address checks are useful but insufficient for a final architecture decision. No transactions, schema registration, or attestations have been submitted.
- **Explicit user approval:** Not required for read-only research; required before any Mainnet write or spending.


## ADR-010 — ProxyAdmin ownership path is observable but owner governance is unknown
- **Date:** 2026-10-29
- **Status:** Accepted as an evidence finding; not a decision to integrate EAS
- **Context:** Read-only CI run [40894755106](https://github.com/rudimentall1/FANOVA/actions/runs/40894755106) inspected the EAS/SchemaRegistry EIP-1967 admin slots and the Soneium ProxyAdmin predeploy.
- **Finding:** Both contracts name `0x4200000000000000000000000000000000000018` as admin. That address is an EIP-1967 proxy whose implementation slot resolves to `0x893c2CEEb71D38514daF67728d3Ff1b213FC4B5F`, with runtime bytecode present and Blockscout source marked verified. Its read-only `owner()` result is `0x6b1bae59d09fccbddb6c6cceb07b7279367c4e3b`; that address has no runtime bytecode at the checked block.
- **Decision:** Record the observed upgrade-control path but do not infer the owner identity, key custody, or governance process from the address alone. Upstream source/build equivalence and schema/resolver behavior remain unresolved, so ADR-007 remains open.
- **Consequences:** The admin path is more transparent than an unknown slot, but it is not enough to assert that upgrades are protected by a multisig or timelock.
- **Explicit user approval:** Not required for read-only research; required before any Mainnet write or spending.


## ADR-011 — Map the Soneium L2 ProxyAdmin owner to its L1 governance multisig
- **Date:** 2026-10-29
- **Status:** Accepted as an evidence finding; does not approve EAS integration
- **Context:** Read-only RPC found L2 ProxyAdmin owner `0x6b1bae59d09fccbddb6c6cceb07b7279367c4e3b`, with no code at that L2 address. The absence of code was initially ambiguous.
- **Finding:** The [official Superchain Registry Soneium config](https://github.com/ethereum-optimism/superchain-registry/blob/main/superchain/configs/mainnet/soneium.toml) lists L1 `ProxyAdminOwner = 0x5a0Aae59D09fccBdDb6C6CcEB07B7279367C3d2A` and marks Soneium as governed by Optimism. The L2 owner value matches the standard OP Stack L1-to-L2 address alias of that address. [L2BEAT's Soneium assessment](https://l2beat.com/layer2s/projects/soneium) identifies the L1 owner as a 2-of-2 multisig and says upgrades have no delay.
- **Decision:** Interpret the L2 no-code address as the expected alias, not evidence of an EOA-controlled key. Record upgrade governance as a multisig-controlled path with no delay per L2BEAT; do not claim the current Safe signer set was independently verified in this audit.
- **Consequences:** Upgrade authority is better characterized. A no-delay upgrade path remains a trust consideration; EAS source/build equivalence and schema/resolver behavior are still unresolved, so ADR-007 remains open.
- **Explicit user approval:** Not required for read-only research; required before any Mainnet write or spending.


## ADR-012 — Use a minimal FANOVA workflow contract, not EAS-only attestations
- **Date:** 2026-10-29
- **Status:** Accepted for local implementation and testing; deployment not authorized
- **Context:** P2 read-only verification confirmed EAS and SchemaRegistry exist on Soneium Mainnet, exposes their versions and registry relationship, and mapped the ProxyAdmin path. However, EAS attestations do not enforce FANOVA-specific creator authorization, exact source/permission version binding, stale-version rejection, or a single final decision. The checked-in EAS `solcInputs` does not match the live implementation compiler/version metadata, so it is not a reliable matching build artifact. No production-ready Soneium IP Registry/ERC-8432 deployment interface has been verified in the project.
- **Decision:** Implement a minimal custom FANOVA workflow contract that records versioned story/permission hashes, contributions bound to the exact current source version, explicit permission acknowledgement, and one creator-only final decision. Do not integrate EAS or create a general-purpose IP/license registry in the MVP. Keep all content offchain. A story version change invalidates pending decisions against older versions. The contract proves address-authorized workflow state, not legal IP ownership or enforceable licensing.
- **Alternatives:** EAS-only attestations (cannot enforce required invariants); EAS plus custom resolver (additional integration and state complexity without a demonstrated benefit); broad custom IP registry (duplicates ecosystem infrastructure); deploy before local tests (rejected).
- **Consequences:** A smaller, directly testable state machine can enforce the MVP's core security claims. New contract code creates audit and upgrade/deployment risk; it must pass local adversarial tests, static/dependency review, and cost estimation before a deployment can even be proposed.
- **Explicit user approval:** Not required for local code/tests within the locked P2 milestone. Explicit approval remains required before any Mainnet transaction, deployment, or spending.


## ADR-013 — Bind initial story IDs to the registering creator
- **Date:** 2026-10-29
- **Status:** Accepted for local implementation
- **Context:** A naive first-writer-wins story ID could be front-run by an observer copying the story ID from a pending registration transaction and registering it under another address.
- **Decision:** Derive the stable story ID as `keccak256(abi.encode(creatorAddress, creatorChosenSalt))` and require the first registration to match the caller-derived ID. Require the same creator and salt for later versions. Add an adversarial test proving another address cannot claim a creator-derived ID.
- **Consequences:** Reduces ID-squatting/front-running risk without adding a signature dependency. It still does not prove legal IP ownership; the caller only controls the address-bound record.
- **Evidence:** [Foundry CI run 40895792292](https://github.com/rudimentall1/FANOVA/actions/runs/40895792292): 13 passed, 0 failed.
- **Explicit user approval:** Not required for local implementation/testing; Mainnet deployment still requires explicit approval.


## ADR-014 — Position FANOVA as a creator-controlled product layer
- **Date:** 2026-10-30
- **Status:** Accepted
- **Context:** The Sony Onchain Entertainment application needs a clear product identity. Describing FANOVA as a general IP infrastructure protocol risks positioning it as a duplicate of Soneium's own IP registry, graph, and licensing direction. The current implementation is a narrow story contribution and creator-decision workflow, not a general IP stack.
- **Decision:** Position FANOVA as a creator-controlled collaborative IP product for story-based communities. FANOVA owns the user workflow: source story and permitted-use rules, contribution submission, creator review, attribution, and evidence presentation. Soneium is the provenance ecosystem. FANOVA does not claim to replace Soneium IP infrastructure or to have integrated a production IP registry/licensing primitive. Future licensing and contributor revenue participation remain roadmap directions, not current functionality.
- **Alternatives:** Claim a new general-purpose IP protocol; position as a fanfiction/social platform; market a revenue-sharing engine before payments exist.
- **Consequences:** Narrower and more defensible product scope. The application can explain the commercial direction without claiming licensing, revenue, or production adoption today.
- **Explicit user approval:** Yes, in project conversation on 2026-10-30.

## ADR-015 — Separate simulated demo identities from onchain wallet attribution
- **Date:** 2026-10-30
- **Status:** Accepted
- **Context:** The browser MVP uses a local Creator/Fan role switch and display labels such as Demo Creator and Demo Fan. Those labels are not authenticated accounts. Separately, the onchain workflow obtains a signer address from Rabby and the contract records the transaction caller. Conflating these two identity layers would overstate attribution.
- **Decision:** Keep the local role switch explicitly labelled as a simulation. Treat the contract-recorded creator/contributor/reviewer addresses as the authoritative identities for onchain actions. Do not claim that a display name is cryptographically bound to a wallet or that the browser MVP has production authentication. Any future name-to-wallet binding requires a separately specified signed profile or authentication design.
- **Alternatives:** Treat local role labels as real user accounts; add server-side authentication and profiles to the current MVP; remove the local workflow.
- **Consequences:** Preserves the working demo while making its identity boundary explicit. Production identity management remains out of scope.
- **Explicit user approval:** Yes, in project conversation on 2026-10-30.

## ADR-016 — Scope of the current evidence-bundle verifier
- **Date:** 2026-10-30
- **Status:** Accepted; event-history scanner implemented locally, live Mainnet validation pending
- **Context:** The verifier recomputes hashes for the source story and contributions included in an exported bundle, reads corresponding contract storage, and checks referenced transaction receipts/events. It does not currently enumerate all contract events from deployment through a fixed verification block. Therefore a bundle can omit an onchain contribution and still pass checks for the records it does contain.
- **Decision:** Describe the original 2026-10-30 result as verification of the included records only. The browser now has a bounded event scanner and comparison logic that checks all discovered story-version, contribution, and decision events from deployment through a fixed block. Do not claim that the new full-history path has been exercised against Mainnet until that live validation is recorded. Do not imply third-party verification.
- **Alternatives:** Continue using VERIFIED without qualification; treat the bundle as complete based only on local export metadata; change the deployed contract.
- **Consequences:** The code now has a defined completeness check without changing the deployed contract. CI covers comparison and chunking behavior; one live Mainnet run remains necessary to validate RPC behavior and the actual exported bundle.
- **Explicit user approval:** Yes, in project conversation on 2026-10-30.

## ADR-017 — Expand FANOVA into a multi-user creator and contributor platform
- **Date:** 2026-10-30
- **Status:** Accepted product direction; implementation not started
- **Context:** The current browser app is a local prototype with simulated Creator/Fan labels and localStorage persistence. That is useful for proving the workflow and contract integration, but it is not a credible user-facing publishing product. The product needs public work discovery, creator and contributor accounts, persistent work records, profiles, and separate workspaces.
- **Decision:** Expand the web product to include real account authentication, server-side persistence, public catalogue and work pages, creator profiles and Creator Studio, contributor profiles and dashboards, contribution review, version lifecycle, and public provenance pages. The exact routes, roles, data model, security requirements, journeys, and acceptance criteria are defined in `docs/WEB_PRODUCT_SPEC.md`.
- **Scope boundary:** Keep the core product narrow: creator-controlled participation in story-based IP and verifiable provenance. Do not add a social network, comments, messaging, payments, royalties, token, NFT marketplace, DAO, AI generation suite, or multi-chain support to this MVP.
- **Architecture constraints:** Keep creative content and personal data offchain. Use maintained authentication rather than custom password/session cryptography. Enforce role and ownership checks on the server and database. Link wallets using signed challenges. Preserve the existing deployed Soneium contract; no contract changes, redeployment, or Mainnet writes are authorized by this decision.
- **Alternatives:** Keep the single-page local demo as the final product; build a broad fan social network; replace the existing provenance contract; add payment/token features before validating the core workflow.
- **Consequences:** More engineering work is required, including backend, database, authentication, deployment, privacy, and authorization testing. The final demo is delayed until the multi-user acceptance criteria pass. The existing local prototype and provenance contract remain reusable foundations.
- **Explicit user approval:** Yes, in project conversation on 2026-10-30. The user explicitly requested the full multi-page site with user/creator accounts, login/password, work pages, and catalogues, and approved proceeding with the product/site specification.

