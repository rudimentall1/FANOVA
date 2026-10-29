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
- [ ] Define the minimum contract surface from the exact evidence requirement.
- [ ] Write and run contract tests locally, including unauthorized-call rejection.
- [ ] Complete static checks, dependency review, deployment-cost estimate, and security checklist.
- [ ] Prepare deployment manifest and independent verification steps.
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
