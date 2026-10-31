# FANOVA Roadmap - 30-Day Delivery

Dates are relative to kickoff. Status changes only after evidence is checked.

## P0 - Baseline and application mapping (Days 1–3)
- [x] Lock creator-controlled collaborative IP product positioning and document current/future capability boundaries in `docs/PRODUCT_MANIFEST.md`.
- [x] Map all 24 official application questions to evidence, answer owner, and status in `docs/APPLICATION_EVIDENCE_MAP.md`; founder-specific answers remain open.
- [ ] Freeze core user story and one original-IP pilot scenario.
- [x] Complete initial desk research on Soneium IP architecture and adjacent product categories in `docs/COMPETITIVE_LANDSCAPE.md`.
- [ ] Hands-on competitor comparison and creator interviews remain outstanding.
- [x] Review the official six-page questionnaire: it asks current token issuance status and IEO plans; it does not require launching a FANOVA token.
- [x] Set Soneium Mainnet as target; Minato is optional, not a required milestone.
**Exit gate:** clear MVP, target user, target network, and evidence requirements.

## P1 - Local vertical slice (Days 4–12)
**Status: COMPLETE for the local vertical slice.** Eleven domain tests, JavaScript syntax checks, and a Playwright Chromium end-to-end workflow pass in GitHub Actions on a clean checkout.
- [x] Establish a dependency-free browser app and domain rules in `apps/web/`.
- [x] Add permission-version linkage to contributions and reject stale permission versions in domain rules.
- [x] Implement creator story publication with explicit permissions.
- [x] Implement fan submission linked to source and permission versions.
- [x] Implement creator approve/reject rules and unauthorized-review rejection in the domain layer.
- [x] Add and pass eleven domain tests, including authorization, stale permission version, and duplicate review.
- [x] Verify the full browser flow and visible failure path with a Playwright Chromium end-to-end test in CI.
- [x] Label the prototype as local and explicitly state that no chain writes occur; verify the full UI flow automatically in a real browser.
**Exit gate:** fresh checkout runs app/tests and a full local demo works.

## P2 - Mainnet provenance path (Days 13–19)
- [x] Define the minimum externally verifiable provenance claim and evidence requirements in `docs/PROVENANCE_REQUIREMENTS.md`.
- [x] Check the official Soneium contract directory and EAS deployment catalog; EAS/SchemaRegistry addresses are documented, but live bytecode/source/runtime behavior is not yet independently verified.
- [x] Compare EAS-only attestations with a minimal workflow contract in docs/ONCHAIN_PROOF_DESIGN.md; EAS alone does not enforce creator authorization or one final decision.
- [x] Read-only verify EAS/SchemaRegistry runtime bytecode, EIP-1967 implementation addresses, and explorer source-verification flags on chain ID 1868. Successful CI run and output are recorded in `docs/ONCHAIN_PROOF_DESIGN.md`.
- [ ] Compare deployed implementation source/compiler settings with the EAS release artifacts. The upstream repository has a `solcInputs` JSON, but it declares Solidity 0.8.27 and Semver(1,3,0), while live explorer metadata reports compiler 0.8.19 and onchain versions are EAS 1.4.1-beta.3 / SchemaRegistry 1.3.1-beta.2. This mismatch is unresolved.
- [x] Read-only verify EIP-1967 implementation/admin/beacon slots and call EAS `version()`, `getSchemaRegistry()`, SchemaRegistry `version()`, and ProxyAdmin `owner()` in successful CI run [40894496102](https://github.com/rudimentall1/FANOVA/actions/runs/40894496102). No schema registration or attestation writes.
- [x] Inspect ProxyAdmin's own EIP-1967 implementation/control path and owner address in successful CI run [40894755106](https://github.com/rudimentall1/FANOVA/actions/runs/40894755106). The L2 owner `0x6b1bae59d09fccbddb6c6cceb07b7279367c4e3b` is the standard address alias of the L1 ProxyAdminOwner `0x5a0Aae59D09fccBdDb6C6CcEB07B7279367C3d2A` in the [official Superchain Registry](https://github.com/ethereum-optimism/superchain-registry/blob/main/superchain/configs/mainnet/soneium.toml). [L2BEAT](https://l2beat.com/layer2s/projects/soneium) reports a 2-of-2 multisig with no upgrade delay; current Safe owners were not independently queried.
- [ ] Check for any suitable deployed Soneium IP Registry/ERC-8432 interface; official contract directory reviewed so far does not list one.
- [x] Record accepted architecture decision ADR-012 after read-only verification and before writing contract code: minimal FANOVA workflow contract; EAS-only rejected because it cannot enforce required state invariants.
- [x] Implement a minimal workflow contract and 20 Foundry tests for creator-bound story IDs, authorization, permission acknowledgement/hash binding, stale versions, duplicate IDs, and edge cases. All 20 passed in [GitHub Actions run 40899723650](https://github.com/rudimentall1/FANOVA/actions/runs/40899723650); current `forge build --sizes` reports 4,329 runtime bytes and 4,357 initcode bytes.
- [x] Add Slither 0.11.4 CI and run 100 detectors; latest successful run [40899723269](https://github.com/rudimentall1/FANOVA/actions/runs/40899723269) reported zero results. This is static-analysis evidence, not an independent audit.
- [x] Review contract dependency surface: no third-party Solidity imports, external calls, value transfers, owner, or upgrade path. Record manual threat model and limitations in `docs/CONTRACT_SECURITY_REVIEW.md`.
- [x] Add a reproducible local deployment-manifest generator and upload the manifest as a CI artifact. Latest contract run [40899723650](https://github.com/rudimentall1/FANOVA/actions/runs/40899723650) reports 4,329 runtime bytes and 4,357 initcode bytes.
- [x] Add a read-only Soneium Mainnet deployment estimate and local Foundry gas report. Run [40900185493](https://github.com/rudimentall1/FANOVA/actions/runs/40900185493) estimated 998,201 deployment gas at 13,000,000 wei/gas, or 0.000012976613 ETH for execution fee at the recorded time. The estimate explicitly excludes a separately measured OP Stack L1 data fee and must be refreshed before deployment.
- [x] Deploy the workflow contract to Soneium Mainnet and record its address/transaction in the repository README. Deployment exists, but source metadata is not an exact full-runtime match.
- [x] Add a read-only browser panel that checks Soneium chain ID and whether bytecode exists at the deployed address; it links to Blockscout and reports RPC failures.
- [ ] Complete independent verification instructions and final security checklist, including a fresh gas and L1 data-fee estimate before further mainnet transactions.
- [x] Implement browser wallet controls for story registration, contribution registration, and creator decision writes. The UI checks Soneium chain ID, handles rejected network/wallet requests, waits for receipts, and checks expected events. User must initiate and approve each wallet transaction. A complete user-approved Mainnet sequence was subsequently executed; see `docs/DEMO_AND_EVIDENCE.md`.
- [x] Add a read-only evidence-bundle verifier that recomputes story/permission/contribution hashes, checks creator-bound story IDs, reads matching contract storage, and verifies referenced transaction receipts/events. Missing registration or local-only decisions are reported as PARTIALLY VERIFIED, not VERIFIED.
- [x] Persist story/contribution identifiers before wallet submission and save each returned transaction hash before waiting for its receipt. Unit tests cover successful confirmation, reverted receipts, and local metadata-save failure.
- [x] Demonstrate one complete real Mainnet story registration, contribution registration, and creator decision flow. Three user-approved transactions succeeded, and the exported bundle was checked by FANOVA's read-only verifier, which returned `VERIFIED`. The exact bundle contains the offchain bytes needed for hash recomputation and must be retained/shared with an evaluator when appropriate. This is not a third-party audit or external certification; see `docs/DEMO_AND_EVIDENCE.md`.
**Mainnet workflow demonstration gate:** MET for the recorded smoke-test bundle: all three Mainnet operations succeeded and the project verifier returned `VERIFIED` after recomputing hashes and checking contract storage/receipts/events for the records included in that bundle. This is not proof that the bundle contains every contribution ever registered for the story. To reproduce the recorded checks, provide the unchanged exported bundle through an appropriate access-controlled channel. This does not close the remaining P2 due-diligence and security-checklist items above, or the original-IP pilot work in P3.

**Post-deployment hardening still open:**
- [x] Implement bounded event enumeration from the deployment block through a fixed verification block and reconcile story-version, contribution, and decision events against the exported bundle. Add unit tests for chunking and missing/extra records; CI passes.
- [x] Run the current bounded event-history scanner against Soneium Mainnet in GitHub Actions and reconcile live `StoryVersionRegistered`, `ContributionRegistered`, and `ContributionDecided` transaction references against the original bundle's recorded refs. Runs [41188393272](https://github.com/rudimentall1/FANOVA/actions/runs/41188393272) and [41188505170](https://github.com/rudimentall1/FANOVA/actions/runs/41188505170) completed successfully through blocks `30151883` and `30151933`: 1 story version, 1 contribution, and 1 decision. The second run exercised automatic RPC failover after the official endpoint rate-limited the first retry.
- [ ] Run the current browser verifier against the unchanged original JSON bundle and record a fresh `HISTORY VERIFIED` result. This remaining gate includes content hashes, contract storage, transaction receipts, and event coverage. The live scan uses a captured latest-block snapshot; finality/reorg handling remains a documented limitation.
- [x] Make historical pending contributions visibly `STALE` in the UI when a newer source version exists; retain their read-only historical display. The multi-user review UI disables review actions for stale records and explains the required resubmission path ([PR #35](https://github.com/rudimentall1/FANOVA/pull/35), merged; CI run [41186040120](https://github.com/rudimentall1/FANOVA/actions/runs/41186040120) passed).
- [ ] Add explicit UI/export tests showing that demo display names are simulated and wallet addresses are the source of truth for onchain attribution.

## P3 - Pilot and differentiation (Days 20–24)
- [ ] Obtain permission for original pilot story/materials.
- [ ] Run a small creator/fan test.
- [ ] Record real observations and feedback; never invent metrics.
- [ ] Revisit differentiation against competitors using evidence.
**Exit gate:** honest pilot result, including negative or inconclusive findings.

## P4 - Application and demo (Days 25–30)
- [ ] Prepare answers mapped to every application question.
- [ ] Record a concise demo showing success and meaningful failure.
- [ ] Verify addresses, links, tests, and status claims.
- [ ] Publish architecture, limitations, and reproducible setup.
- [ ] Perform outsider review of application and repository.
**Exit gate:** application is complete, evidence-backed, and internally consistent.

## Deferred / not in MVP
- Tradable FANOVA token deployment.
- Full royalty marketplace.
- AI generation suite.
- DAO/governance.
- Multi-chain support.

Minato may be used for optional pre-deployment testing if it materially reduces risk, but it is not the target milestone. Token or other scope expansion requires a documented decision and explicit approval.

## P1.5 — Multi-user web product foundation (new priority after product expansion)

**Status: core account, creator, and contribution workflows implemented and covered by a passing multi-account browser acceptance test. PR #20 was merged to `main` as `dc392a2`; GitHub Actions run [41173158990](https://github.com/rudimentall1/FANOVA/actions/runs/41173158990) passed all 18 steps against an ephemeral PostgreSQL database. The full P1.5 exit gate remains open because wallet linking/provenance integration, public profile editing, production deployment, and other acceptance criteria are not complete.**

- [x] Confirm that FANOVA's final product is a multi-user creator/contributor platform, not a single-page local demo.
- [x] Define public pages, account flows, creator workspace, contributor dashboard, roles, core entities, security boundaries, and acceptance criteria in [WEB_PRODUCT_SPEC.md](WEB_PRODUCT_SPEC.md).
- [x] Select a provider-portable local implementation stack in [STACK_DECISION.md](STACK_DECISION.md): Next.js + TypeScript, PostgreSQL, Drizzle migrations, Better Auth, Zod, local development mail sink, and a storage adapter. Production hosting/email/object-storage provider remains undecided pending a documented cost, retention, backup, privacy, and deployment-fit review.
- [x] Create the isolated Next.js platform app, local PostgreSQL Compose service, Drizzle account/profile/role schema, Better Auth configuration, and server-side role lookup foundation.
- [x] Validate dependency resolution, TypeScript, authorization unit tests, PostgreSQL migration generation/application, Better Auth schema, and production build in [CI run 41057846264](https://github.com/rudimentall1/FANOVA/actions/runs/41057846264).
- [x] Implement registration, sign-in, email-verification instructions, password-reset request and completion screens, protected dashboard, account overview, and sign-out in [PR #15](https://github.com/rudimentall1/FANOVA/pull/15).
- [x] Implement PostgreSQL-backed work records, append-only draft version snapshots, explicit permitted-use rules, SHA-256 content/permission hashes, creator-gated creation/edit APIs, public Discover catalogue/search, and published work detail in [PR #16](https://github.com/rudimentall1/FANOVA/pull/16).
- [x] Implement creator-access applications, one-pending-request-per-account database constraint, administrator review, and server-side creator role assignment. First admin provisioning is documented in [ADMIN_BOOTSTRAP.md](ADMIN_BOOTSTRAP.md) ([PR #17](https://github.com/rudimentall1/FANOVA/pull/17)).
- [x] Implement version-bound contribution submission, explicit permission acknowledgement, permission-type enforcement, contributor dashboard/detail, creator review queue, approve/reject feedback, and opt-in public contribution pages ([PR #18](https://github.com/rudimentall1/FANOVA/pull/18)).
- [x] Run registration, email verification, login, logout, and password recovery end-to-end against an isolated PostgreSQL database with three independent accounts (admin, creator, contributor); verified in [PR #20](https://github.com/rudimentall1/FANOVA/pull/20), CI run [41173158990](https://github.com/rudimentall1/FANOVA/actions/runs/41173158990).
- [x] Add creator-access request and admin review process; creator role is server-assigned and cannot be self-selected.
- [x] Implement private revisions for published works, explicit publish action, version history, and automatic stale marking for pending contributions when a new source version is published.
- [ ] Implement public creator profiles and richer work discovery filters.
- [ ] Integrate existing wallet and provenance flow with authenticated accounts; tracked in [issue #21](https://github.com/rudimentall1/FANOVA/issues/21). No contract changes, redeployment, or Mainnet writes without separate approval.
- [x] Add cross-account/cross-role browser acceptance coverage for reader publish denial, creator/admin boundary, private contribution ownership, creator review, opt-in public visibility, stale submissions, and password recovery in [PR #20](https://github.com/rudimentall1/FANOVA/pull/20). The test confirms persisted records after fresh navigation; process-restart durability and broader API fuzzing remain unverified.
- [ ] Deploy and verify the complete user journey from a clean browser and a second independent account.

**Exit gate: NOT MET.** The account/creator/contributor slice now passes CI, but the complete WEB_PRODUCT_SPEC.md acceptance criteria still require wallet linking and authenticated provenance, public profile editing, production persistence/deployment verification, and final outsider review. Do not record the final Sony demo yet.

**Demo policy:** no final video while the product is still a localStorage prototype or uses simulated user identities. Interim screen recordings may be used privately for debugging, but must not be presented as the final Sony product demo.

