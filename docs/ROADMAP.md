# FANOVA Roadmap — 30-Day Delivery

Dates are relative to kickoff. Status changes only after evidence is checked.

## P0 — Baseline and application mapping (Days 1–3)
- [x] Map all 24 official application questions to evidence, answer owner, and status in `docs/APPLICATION_EVIDENCE_MAP.md`; founder-specific answers remain open.
- [ ] Freeze core user story and one original-IP pilot scenario.
- [x] Complete initial desk research on Soneium IP architecture and adjacent product categories in `docs/COMPETITIVE_LANDSCAPE.md`.
- [ ] Hands-on competitor comparison and creator interviews remain outstanding.
- [x] Review the official six-page questionnaire: it asks current token issuance status and IEO plans; it does not require launching a FANOVA token.
- [x] Set Soneium Mainnet as target; Minato is optional, not a required milestone.
**Exit gate:** clear MVP, target user, target network, and evidence requirements.

## P1 — Local vertical slice (Days 4–12)
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

## P2 — Mainnet provenance path (Days 13–19)
- [x] Define the minimum externally verifiable provenance claim and evidence requirements in `docs/PROVENANCE_REQUIREMENTS.md`.
- [x] Check the official Soneium contract directory and EAS deployment catalog; EAS/SchemaRegistry addresses are documented, but live bytecode/source/runtime behavior is not yet independently verified.
- [x] Compare EAS-only attestations with a minimal workflow contract in docs/ONCHAIN_PROOF_DESIGN.md; EAS alone does not enforce creator authorization or one final decision.
- [x] Read-only verify EAS/SchemaRegistry runtime bytecode, EIP-1967 implementation addresses, and explorer source-verification flags on chain ID 1868. Successful CI run and output are recorded in `docs/ONCHAIN_PROOF_DESIGN.md`.
- [ ] Compare deployed implementation source/compiler settings with the EAS release artifacts. The upstream repository has a `solcInputs` JSON, but it declares Solidity 0.8.27 and Semver(1,3,0), while live explorer metadata reports compiler 0.8.19 and onchain versions are EAS 1.4.1-beta.3 / SchemaRegistry 1.3.1-beta.2. This mismatch is unresolved.
- [x] Read-only verify EIP-1967 implementation/admin/beacon slots and call EAS `version()`, `getSchemaRegistry()`, SchemaRegistry `version()`, and ProxyAdmin `owner()` in successful CI run [40894496102](https://github.com/rudimentall1/FANOVA/actions/runs/40894496102). No schema registration or attestation writes.
- [x] Inspect ProxyAdmin's own EIP-1967 implementation/control path and owner address in successful CI run [40894755106](https://github.com/rudimentall1/FANOVA/actions/runs/40894755106). The L2 owner `0x6b1bae59d09fccbddb6c6cceb07b7279367c4e3b` is the standard address alias of the L1 ProxyAdminOwner `0x5a0Aae59D09fccBdDb6C6CcEB07B7279367C3d2A` in the [official Superchain Registry](https://github.com/ethereum-optimism/superchain-registry/blob/main/superchain/configs/mainnet/soneium.toml). [L2BEAT](https://l2beat.com/layer2s/projects/soneium) reports a 2-of-2 multisig with no upgrade delay; current Safe owners were not independently queried.
- [ ] Check for any suitable deployed Soneium IP Registry/ERC-8432 interface; official contract directory reviewed so far does not list one.
- [x] Record accepted architecture decision ADR-012 after read-only verification and before writing contract code: minimal FANOVA workflow contract; EAS-only rejected because it cannot enforce required state invariants.
- [x] Implement a minimal workflow contract and 13 Foundry tests for creator-bound story IDs, authorization, permission acknowledgement/hash binding, stale versions, duplicate IDs, and one-final-decision behavior. All 13 passed in [GitHub Actions run 40896262129](https://github.com/rudimentall1/FANOVA/actions/runs/40896262129); `forge build --sizes` reports 4,306 runtime bytes and 4,334 initcode bytes with no compiler/lint warning.
- [x] Add Slither 0.11.4 CI and run 100 detectors; latest successful run [40899723269](https://github.com/rudimentall1/FANOVA/actions/runs/40899723269) reported zero results. This is static-analysis evidence, not an independent audit.
- [x] Review contract dependency surface: no third-party Solidity imports, external calls, value transfers, owner, or upgrade path. Record manual threat model and limitations in `docs/CONTRACT_SECURITY_REVIEW.md`.
- [x] Add a reproducible local deployment-manifest generator and upload the manifest as a CI artifact. Latest contract run [40899723650](https://github.com/rudimentall1/FANOVA/actions/runs/40899723650) reports 4,329 runtime bytes and 4,357 initcode bytes.
- [ ] Estimate deployment and representative transaction gas on Soneium Mainnet and document assumptions.
- [ ] Complete independent post-deployment verification instructions and final security checklist before requesting deployment approval.
- [ ] Obtain explicit user approval before mainnet deployment or any real-value transaction.
- [ ] If approved and gates pass, deploy to Soneium Mainnet and verify source/address/chain ID.
- [ ] Connect app or provide a clearly labelled explorer-backed proof panel.
**Exit gate:** an outsider can verify a relevant mainnet transaction/event if deployment is approved and completed. Until then, label onchain path PLANNED or LOCAL.

## P3 — Pilot and differentiation (Days 20–24)
- [ ] Obtain permission for original pilot story/materials.
- [ ] Run a small creator/fan test.
- [ ] Record real observations and feedback; never invent metrics.
- [ ] Revisit differentiation against competitors using evidence.
**Exit gate:** honest pilot result, including negative or inconclusive findings.

## P4 — Application and demo (Days 25–30)
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
