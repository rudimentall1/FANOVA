# FANOVA Work Checkpoint — 2026-11-13

This checkpoint records the repository state after CI run #397 and the follow-up schema/query review for PR #40. It is a handoff document; it does not claim that open acceptance gates are complete.

## Current objective

Complete the public, inspectable Story → Contribution → Creator Decision provenance path in the multi-user FANOVA platform, then close the P1.6 acceptance gate only after the relevant PRs are reviewed and the complete journey is verified.

## Work completed

### Existing Mainnet provenance foundation

- FANOVA targets Soneium Mainnet (chain ID 1868).
- Existing deployed contract: `FanovaProvenance` at `0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880`.
- The repository's `docs/DEMO_AND_EVIDENCE.md` records a user-approved Mainnet Story registration, Contribution registration, and Creator decision sequence, with the three transaction references and a project-run evidence-bundle verification.
- The recorded verification is not an independent audit or third-party certification. The original test content is placeholder material; do not present it as a real creator pilot.
- Existing server-side provenance anchor persistence and submission/verification paths are the source records now being exposed publicly.

### PR #39 — safe wallet unlink and replacement

- PR: https://github.com/rudimentall1/FANOVA/pull/39
- Branch: `feat/p1-6-safe-wallet-unlink`
- Head at checkpoint: `3c4f920a59f6720394fa6b4f17af3cf90f58fe95`
- State: OPEN, DRAFT, not merged.
- CI run #391 previously passed, including multi-account browser E2E.
- Implementation binds a short-lived unlink challenge to authenticated user, session, and exact linked wallet; requires a fresh signature from that wallet; consumes the challenge and deletes the wallet atomically; exposes unlink/replace in account settings.
- No transaction is sent for unlinking; no contract change, redeployment, private-key custody, or Mainnet write.
- This PR is not independently reviewed or accepted as complete merely because CI passed.

### PR #40 — public provenance evidence

- PR: https://github.com/rudimentall1/FANOVA/pull/40
- Branch: `feat/public-provenance-proof`
- Latest PR head at checkpoint update: `b513bc9df6907e0c79377f91b442a9177d363f26` (the latest code hardening is `4a32ee5d5f8ee0a88ef3258ca336017e167edcf2`; the later checkpoint commit updates documentation).
- State: OPEN, DRAFT, not merged.
- Changes expose Story version, Contribution, and Creator decision anchors on public Story and Contribution pages.
- `MAINNET · VERIFIED` is gated on persisted verified status and matching transaction, block, verification timestamp, event, chain ID, contract, signer, entity ID, and expected/observed hashes.
- Unanchored records remain `LOCAL · NOT ANCHORED`; pending, partial, stale, and failed states are not represented as verified.
- No contract changes, Mainnet writes, private-key custody, or automated transaction submission.

## Latest CI evidence and failure

- PR #40 workflow run #394: https://github.com/rudimentall1/FANOVA/actions/runs/43415340852
- Run #394 completed with FAILURE.
- Passing steps included domain/ABI/transaction tests, Chromium installation, browser E2E, JavaScript syntax, platform TypeScript, authorization tests, PostgreSQL migrations, Better Auth schema validation, and production build.
- The only failing step was `Run multi-account platform browser tests`.
- Exact failure: Playwright strict-mode violation at `apps/web/platform-e2e.test.js:252`; `getByText("Contribution")` matched two elements because the page also contained the `APPROVED COMMUNITY` eyebrow.
- The locator was changed to `getByText("Contribution", { exact: true })` on branch `feat/public-provenance-proof`. This is a targeted test-only correction. The resulting commit and a fresh CI run must still be checked; do not call CI green based on this edit.

## Follow-up review after run #396

- Run #396 completed SUCCESS on PR #40 head \`9f1e318c84f1c72fb23370f8e5e498c2e11db9f4\`; the workflow's single \`test\` job passed.
- Manual source review confirmed the three verification submit handlers persist snapshots with chain ID, contract, transaction, block, event, observed signer, entity ID, and expected/observed hashes for their respective operations.
- The public component originally required chain ID 1868 only inside the snapshot. It now also requires the persisted anchor row's \`chainId === 1868\` before rendering \`MAINNET · VERIFIED\`. This is an additional fail-closed check.
- The chain-ID hardening commit is \`4a32ee5d5f8ee0a88ef3258ca336017e167edcf2\`; a fresh CI run for this new head is still required.
- Live persisted anchor rendering has not been verified. The CI E2E fixture currently exercises LOCAL / NOT ANCHORED public rendering, not a true positive Mainnet anchor case.

## Next actions — execute in order

1. Resolve the source-anchor multiplicity inconsistency: define whether multiple attempts are allowed and make both contribution and creator-decision verifiers select/validate the same canonical source and contribution anchors. Add regression tests for zero, one, and multiple matches.
2. Align public read selection with that canonical rule. Do not blindly display whichever anchor is newest if a newer failed retry can mask an earlier verified record; preserve audit history while selecting a defensible public state.
3. Add a positive test fixture for a fully matching `MAINNET · VERIFIED` anchor, plus negative cases for mismatched persisted chain ID, snapshot chain ID, event, signer, entity ID, tx/block, and hash fields. Keep fixtures synthetic and clearly test-only.
4. Run a read-only check of existing persisted Mainnet anchors where access is available. Confirm that real records render with accurate labels and explorer links; never fabricate production records.
5. Review PR #39 and PR #40 together for security, data access, public disclosure, and acceptance coverage. Keep both Draft until review is complete.
6. Complete the end-to-end acceptance path: authenticated creator publishes Story → separate contributor submits → creator records decision → public Story and Contribution pages show correct evidence states.
7. Update Issue #21 and the roadmap with actual results. Close P1.6 only when all required checks pass and the changes are reviewed; do not merge without explicit authorization.
8. After the technical gate, return to the Sony application work: freeze an original-IP pilot scenario, obtain permission for pilot material, conduct creator/fan interviews or a small pilot, and produce a concise evidence-backed demo/application. No token, marketplace, royalties, AI generation, or unrelated scope expansion without a documented decision.

## Current status summary

| Area | Status |
|---|---|
| Soneium Mainnet contract and recorded smoke-test sequence | MAINNET evidence recorded; not independently audited |
| PR #39 wallet unlink/replace | OPEN · DRAFT; prior CI PASS |
| PR #40 public provenance evidence | OPEN · DRAFT; run #397 PASS on code commit 4a32ee5; latest PR head b513bc9 is docs-only after that code commit |
| Playwright locator correction and persisted chain-ID hardening | Applied; CI run #397 PASS |
| Full P1.6 acceptance | OPEN |
| Public rendering of real persisted Mainnet anchors | NOT YET CONFIRMED |
| Original creator/fan pilot | NOT DONE |
| Sony application/demo finalization | NOT DONE |

## Working rules

- Proof before features; one vertical slice at a time.
- Distinguish source-only, local, CI-tested, live Mainnet, and independently verified evidence.
- A successful build or CI run does not prove live Mainnet rendering.
- Never label an anchor `MAINNET · VERIFIED` without all required persisted evidence checks.
- No Mainnet write, contract deployment, PR merge, or scope expansion without explicit approval.


---

## Checkpoint update — 2026-11-22

This section supersedes earlier PR head and CI status references above where they conflict.

### Verified repository state

- PR #39 remains OPEN · DRAFT · not merged.
  - Head: `b4df679470913fe6f6d677c8bf7059147a771797`.
  - CI run #432: SUCCESS on that head: https://github.com/rudimentall1/FANOVA/actions/runs/45040106498
  - The per-session active unlink challenge cap, streamed request-body limit, and associated unit/E2E assertions are included in the tested head.
- PR #40 remains OPEN · DRAFT · not merged.
  - Head: `8696a4db73662b3b35f7f5c83c0f4a29d34b3cda`.
  - CI run #436: SUCCESS on that head: https://github.com/rudimentall1/FANOVA/actions/runs/45040582858
  - All workflow steps passed, including domain/ABI/transaction tests, browser E2E, platform TypeScript, authorization tests, PostgreSQL migrations, Better Auth schema validation, production build, and multi-account platform browser E2E.
- PR #40 now binds public verification to the configured canonical `FANOVA_PROVENANCE_CONTRACT`. Missing, malformed, or mismatching configuration fails closed; tests cover these cases.
- No PR has been merged. No Mainnet transaction, deployment, or contract write was performed.

### Remaining acceptance gates

- CI success is automated repository evidence only; it is not an independent security audit, production database check, or proof that a real persisted Mainnet anchor renders correctly on public pages.
- A positive unit fixture for `MAINNET · VERIFIED` is synthetic. The current multi-account browser journey verifies the LOCAL / NOT ANCHORED public state; it does not substitute for a live persisted Mainnet anchor.
- No production DB access or read-only production anchor verification has been performed in this checkpoint.
- P1.6 remains OPEN pending focused security review and end-to-end acceptance with the required evidence.
- The original creator/fan pilot and Sony application/demo finalization remain NOT DONE.

### Next actions

1. Review PR #40's public proof predicate, canonical source-anchor selection, and public query behavior as one coherent trust boundary; add or refine regression tests where review finds gaps.
2. If authorized production read access becomes available, inspect persisted anchors read-only and verify public rendering against actual records. Do not create or alter Mainnet data to manufacture evidence.
3. Review PR #39 and PR #40 together, keep them Draft until acceptance is complete, and update Issue #21/roadmap with evidence-backed status.
4. Keep P1.6 OPEN until security review and the full acceptance path are complete. Do not merge without explicit approval.
5. Resume creator/fan pilot and Sony application evidence work only after the technical acceptance path is stable.

### Evidence classification

| Claim | Evidence class |
|---|---|
| PR #39 checks pass on head `b4df679` | CI-tested |
| PR #40 checks pass on head `8696a4d` | CI-tested |
| Canonical contract binding fails closed in public proof predicate | Source + unit-tested |
| Real persisted Mainnet anchor renders correctly in production | NOT VERIFIED |
| Independent security audit / third-party certification | NOT DONE |
| Full P1.6 acceptance | OPEN |


### Follow-up source review finding — historical wallet identity

- A cross-PR integration issue was identified while reviewing public provenance pages against wallet unlink/replace.
- Public Story and Contribution pages currently derive the expected creator/contributor signer and, for Story IDs, the Story identity from the *current* `linked_wallet` row.
- PR #39 intentionally deletes the current linked-wallet row on unlink and permits replacement. Therefore, unlinking or replacing a wallet can make an already verified historical anchor fail public verification even though its on-chain transaction and receipt have not changed.
- The creator-decision submit verifier also compares the intent signer with the creator's currently linked wallet. If the wallet is unlinked/replaced after the transaction is sent but before verification is submitted, the valid historical transaction may be rejected.
- This is a source-level integration finding, not a demonstrated production incident. No live user data or production database was inspected.
- Required correction: bind historical verification to an immutable, server-persisted signer identity captured when the provenance intent is created, then verify that identity against the stored anchor snapshot and observed on-chain sender. Do not trust an arbitrary request-supplied address, and do not simply weaken the signer check. Preserve current-wallet checks for initiating new actions.
- Add regression coverage for: creator wallet unlink after Story anchoring; contributor wallet unlink after Contribution anchoring; creator wallet replacement after a decision transaction is broadcast but before verification; and normal new-intent behavior with the replacement wallet.
- Until this is fixed and tested, treat the wallet unlink/replace and public provenance changes as not yet integration-accepted. Keep P1.6 OPEN.


### Historical signer integration fix — implementation in progress (2026-11-22)

- Updated the public Story page and public Contribution page to derive expected signer identities from the selected persisted provenance anchor's `expectedSignerAddress`, not from the current `linked_wallet` row.
- Story identity derivation now uses the signer captured by the source Story intent. Contribution proof uses the signer captured by its registration intent. Creator-decision proof uses the signer captured by its decision intent.
- Updated creator-decision transaction submission verification to compare the on-chain transaction sender and emitted reviewer against the immutable signer on the decision intent. It no longer rejects a valid already-prepared decision solely because the creator later unlinked/replaced the current wallet. New decision intents still require a currently linked wallet.
- Contribution submission already validates the transaction sender against the persisted intent signer and does not depend on the current linked-wallet row; no change was needed there.
- Added a regression assertion that the public proof predicate accepts the persisted historical signer even when the current linked wallet is a different address.
- These source changes are committed to PR #40. They have not yet passed CI at this checkpoint. The PR must remain Draft until the new head's full workflow passes.
- Security boundary preserved: signer is sourced from the server-persisted intent row, never from request input; transaction sender and event reviewer are still checked against that signer.


### Historical signer flow completion — intent creation

- Contribution intent creation no longer requires the *creator's current linked wallet* merely to validate an already verified source Story anchor. It uses the source anchor's persisted signer and verifies the stored snapshot's expected/observed signer match before deriving the Story identity. The contributor still must have their own currently linked wallet to initiate a new contribution registration.
- Creator-decision intent creation no longer requires the contributor's current linked wallet to validate an already verified Contribution anchor. It checks the persisted contribution anchor signer against its verification snapshot. The creator still must have their own current wallet to initiate a new decision transaction.
- This preserves the distinction: current wallet is required for the person initiating a new on-chain action; historical anchors are validated against their immutable server-persisted signer and verification evidence.
- These additional route changes are not yet CI-verified. Full workflow remains the acceptance gate.


### Historical signer fix — CI acceptance result (2026-11-22)

- Current code head covered by CI run #444: `25e6e2d051f5fcd9635b98a182efc63ae65d1535`.
- CI run #444 completed SUCCESS: https://github.com/rudimentall1/FANOVA/actions/runs/45041585100
- Passing gates: domain/ABI/transaction tests, browser E2E, JavaScript syntax, platform TypeScript, platform authorization tests, PostgreSQL migration generation/application, Better Auth Drizzle schema validation, production build, platform/database readiness, and multi-account platform browser E2E.
- The code changes in this run include historical signer sourcing on public Story/Contribution pages, source Story intent validation against the persisted signer, Contribution anchor validation against its persisted signer for Creator Decision intent creation, and Creator Decision submission against the immutable decision-intent signer.
- This is CI-tested source behavior. The browser E2E does not simulate an actual live Mainnet anchor or a real production wallet unlink during an on-chain transaction. The dedicated unit assertion for historical public proof is synthetic.
- PR #40 remains OPEN · DRAFT · not merged. P1.6 remains OPEN pending focused security review and acceptance against real persisted records where authorized read-only access is available.


### Intent replay after wallet unlink/replace — implementation in progress (2026-11-22)

- Follow-up review found that both contribution-registration and creator-decision intent endpoints checked the current linked wallet before looking up an existing idempotency key. This prevented the same authenticated actor from recovering an already-created intent after unlinking or replacing their wallet.
- Contribution intent route now checks ownership, operation, contribution identity, stored hashes, canonical contract, chain, and a valid persisted signer before returning an existing intent. The current contributor wallet is queried only on the new-intent path.
- Creator-decision intent route now validates the source Story anchor's persisted signer against its verification snapshot. Existing keyed intents and the existing per-contribution prior intent are matched to that historical Story signer; the current creator wallet is required only before inserting a new decision intent and must still match the Story anchor signer.
- Cross-actor idempotency-key conflicts remain rejected. Existing entity/operation/hash/decision checks remain in place. Submit routes continue to bind the transaction sender and emitted event signer to the persisted intent signer.
- Changes committed sequentially to PR #40:
  - Contribution route: `75a77bdf7ac2b384cb7392b86f31f76d8900c021`
  - Creator-decision route: `1cea69e83c2b139f8ef097418d6cfe8ff2ee77a7`
- CI runs #446 and #447 were observed in progress at checkpoint time. Do not describe these changes as CI-passed until the runs complete successfully on the latest branch head.
- No dedicated route-level regression test was found alongside these endpoints; the current CI workflow is the next syntax/type/build gate, not proof of the unlink/replay runtime scenario. Add an explicit integration regression test before treating this behavior as fully accepted.
- No production DB inspection, live wallet unlink, or Mainnet transaction was performed. P1.6 remains OPEN.


### Creator-decision intent source-anchor hardening — implementation in progress (2026-11-22)

- Focused source review found the creator-decision intent route used unordered `LIMIT 1` for both Story and Contribution anchors. That could select a failed/pending retry instead of the sole verified anchor, or arbitrarily select one of multiple verified anchors.
- The route now queries up to two verified Mainnet candidates and uses `selectUniqueVerifiedAnchor`; zero or multiple verified candidates fail closed.
- Historical Story and Contribution prerequisites now pass through the same strict public proof predicate used for public verification. This binds persisted row and snapshot chain, configured contract, event, transaction hash, block number, signer, entity identity, and the exact operation-specific expected/observed hash key sets to authoritative Story/Contribution data.
- Added unit coverage for complete ContributionRegistered evidence and ContributionDecided evidence including the decision reason hash, plus negative cases for entity/hash mismatches.
- Commits:
  - Route hardening: `0b06965a8ad9a58bb6abc0e3797de58811b7ea73`
  - Proof predicate regression tests: `51c4706a6573743614068db965321f6a23d31226`
- CI runs #449 and #450 were triggered for these sequential commits and were in progress when this checkpoint was written. Acceptance requires CI #450 to complete successfully on the latest code head.
- This is source-level hardening and synthetic unit coverage; it does not demonstrate real persisted Mainnet anchors in production. P1.6 remains OPEN.


### Public proof SHA-256 / bytes32 representation mismatch — implementation in progress (2026-11-22)

- A further source review compared the actual Story/Contribution submit snapshots with the public page's authoritative hashes. Persisted SHA-256 values are stored as 64 hex characters without `0x`; the on-chain verification snapshots store their bytes32 values with `0x`. The public proof predicate compared these strings literally, so otherwise-correct verified anchors could be rejected.
- Added a regression test for matching a raw persisted SHA-256 digest to a 0x-prefixed snapshot digest, including case normalization.
- `matchesPublicProofHashes` now normalizes optional `0x` prefixes and case, and fails closed unless all authoritative, expected, and observed values are exactly 32-byte hex hashes. Operation-specific key sets remain exact.
- Updated synthetic proof fixtures to use full 32-byte hashes and to model the real persisted-vs-snapshot representation.
- Commits:
  - Reproduction test: `fda011e255131833459c2c2e91dfe3b07f383c3e`
  - Full bytes32 test fixtures: `2aa51a0599c324d43dffece55b2425bd7c997ca3`
  - Hash normalization fix: `f4203495d87e10a6011749124fad197428d3a7dd`
- CI runs #452, #453, and #454 were triggered; #454 is the latest-code run and must pass before acceptance.
- The finding is source-derived; no production anchor rows were inspected. The synthetic regression test does not replace a read-only check against real persisted Mainnet records. P1.6 remains OPEN.


### Synthetic persisted-anchor and wallet-unlink intent replay E2E — implementation in progress (2026-11-22)

- Added an isolated GitHub Actions-only fixture script, `apps/platform/scripts/bootstrap-e2e-provenance.mjs`. It refuses to run unless the process is in GitHub Actions, the E2E bootstrap flag is enabled, and the database host/path are the local `fanova` CI database.
- The fixture seeds a complete synthetic Story anchor and creator wallet, seeds a contributor wallet, promotes the newly created Contribution intent to a synthetic verified Contribution anchor, and can remove a test user's linked wallet. It performs no RPC calls or Mainnet writes.
- Extended `apps/web/platform-e2e.test.js` to exercise:
  - create a Contribution intent with a linked wallet;
  - remove the linked wallet and recover the same intent with the same idempotency key;
  - confirm a new Contribution intent is rejected while the wallet is absent;
  - create a Creator Decision intent after seeding its verified Story and Contribution prerequisites;
  - remove the creator wallet and recover the same decision intent;
  - verify a different idempotency key still resolves to the one-per-contribution decision intent;
  - render a synthetic persisted Story and Contribution proof as `MAINNET · VERIFIED`, while the unsubmitted decision intent remains `LOCAL · NOT ANCHORED`.
- The synthetic fixture uses a test-only contract configuration and fake transaction hashes in the isolated CI database. It is explicitly not a real Mainnet transaction or production evidence.
- Added workflow environment wiring for the canonical test contract and fixture script. The contract address must be quoted as a YAML string; the first workflow attempt had no jobs due to the unquoted value and is superseded by the corrected workflow commit.
- Latest relevant commits include:
  - fixture script: `c13d9a3632640b7bba62c45dab8d470b9de8ffc8` and `a72cb1ca7ad32644c479bf8f7a32a365ac35d4e4`
  - contribution replay E2E: `22d839ffb6dccf03b3fdb47e4b3f60d3e6eb3c79`
  - creator replay E2E: `95bcfd5c3edfcc5eb095751f261ffbc0c241070a`
  - isolated signer wiring: `a117a9d667bd5cc437d6cb036189c35ebaafee83`
  - decision-intent uniqueness assertion: `350a52478e542fefb1bfac598ef2024c1d993c25`
  - corrected workflow configuration: `6acba70a28b01d5ab90c2a33771cbe16d182f254`
  - malformed-hash negative test: `13624c09b79a0a0c23f426bf06291fa4ea3db978`
- CI #468 runs on the corrected workflow configuration; the subsequent latest-head run must include the final E2E and malformed-hash test commits and pass before considering merge.
- No production DB or Mainnet data was touched. P1.6 remains OPEN.


### Failed Story retry must not mask verified source anchor — implementation in progress (2026-11-22)

- Added a newer synthetic failed Story anchor beside the one verified Story anchor in the isolated E2E fixture.
- The new E2E reproduced a second source-selection defect: Contribution intent creation queried all Story attempts and required exactly one row, so a harmless failed retry caused HTTP 409 even though exactly one verified Mainnet Story anchor existed.
- Contribution intent creation now queries at most two `mainnet` candidates and uses `selectUniqueVerifiedAnchor`, matching the canonical public/decision selection policy. Zero or multiple verified anchors fail closed; failed/pending retries do not hide a valid proof.
- Regression fixture is synthetic and restricted to the isolated CI database. It does not write Mainnet.
- The red E2E was observed in CI run #474: contribution intent creation returned 409 with one verified Story anchor plus one failed retry.
- Fix commit: `37c06e4dc5b17b12dd3ba37a5a51143efad28e7a`.
- CI for the fix and latest E2E assertion changes is pending. P1.6 remains OPEN.


### Contribution intent requires a complete source Story proof — implementation in progress (2026-11-22)

- Contribution intent creation previously checked the source Story anchor's row fields and signer/chain/contract snapshot fields, but did not bind the snapshot's entity ID and exact expected/observed hashes to the authoritative Story version.
- It now passes the selected unique verified Story anchor through `isPublicAnchorVerified`, binding event, configured contract, chain, tx/block, signer, derived Story identity, and exact source/permission hashes. Anchor-row source/permission hashes and version metadata remain independently checked.
- This aligns the Contribution intent prerequisite with public rendering and Creator Decision intent validation; incomplete or mismatched historical Story evidence fails closed.
- Fix commit: `ed6c0bd0af93ce79414a17dfb31078bfdda3de0f`.
- CI #477 is the latest-code acceptance run and is pending. P1.6 remains OPEN.


### Merge completion — safe wallet unlink + public provenance (2026-11-22)

- PR #40, public provenance proof and historical signer hardening, was squash-merged to `main` as `a58bfdd73e13a9868a0bf20dbeff6ecfd455ea7c`.
- PR #39, signature-bound safe wallet unlink, was squash-merged to `main` as `e8d93e261ab8fa147bcf038091b64047125b8ae6`.
- Main CI after PR #40 merge: run #480 SUCCESS.
- Combined PR CI after PR #39 merge: run #481 SUCCESS.
- Final main CI after both merges: run #482 SUCCESS.
- The combined browser E2E exercises wallet A link, cross-account reuse denial, signed unlink, consumed challenge replay denial, wallet B link, five-challenge cap, Contribution intent recovery after linked-wallet removal, Creator Decision intent recovery after linked-wallet removal, cross-account intent replay denial, unique verified-anchor selection despite a later failed retry, and public Story/Contribution proof rendering after unlink.
- The CI fixture uses synthetic rows and fake transaction hashes in an isolated GitHub Actions PostgreSQL database. It performs no RPC calls or Mainnet writes.
- Public proof hash matching now normalizes optional `0x` prefixes and case, while requiring full bytes32 values and exact operation-specific key sets. Contribution and Creator Decision intent creation validate source anchors through the same strict proof predicate used for public verification.
- Safe unlink challenges are session/account/wallet/chain/message/nonce/expiry-bound, single-use, body-size bounded, and capped at five active challenges per session under a transaction lock.

### Remaining P1.6 acceptance gates

- P1.6 remains **OPEN**. Production database access and real persisted Mainnet anchor rendering have not been verified read-only.
- No independent third-party security audit or certification has been completed.
- Do not claim production proof verification or external audit completion until those checks are performed. No Mainnet writes were made as part of this work.


### Account-wide wallet unlink challenge hardening — merged (2026-11-23)

- PR #42, [Security: enforce wallet unlink challenge cap per account](https://github.com/rudimentall1/FANOVA/pull/42), was squash-merged to `main` as `75fdbb9c7015f344c8cb0e47fe633da4f2bb7462`.
- GitHub Actions run [#485](https://github.com/rudimentall1/FANOVA/actions/runs/45113542253) completed SUCCESS. The run passed browser end-to-end coverage, TypeScript checks, platform authorization tests, migration/schema validation, and the production build.
- The active challenge limit is now five per authenticated account across sessions, not five per individual session. A PostgreSQL transaction advisory lock scoped to user + Soneium chain serializes concurrent issuance; expired/consumed challenge cleanup and active-count queries are account-scoped.
- Added browser E2E coverage that authenticates a second independent session for the same account and verifies challenge issuance is rate-limited with HTTP 429 after the first session consumes the account-wide allowance.
- Code review bot completed with no findings. This is not an independent third-party security audit.
- No production database writes, Mainnet RPC writes, or Mainnet transactions were performed.

### Current delivery status — 2026-11-23

- P1.5/P1.6 implementation has reached an integrated CI-tested slice: account/creator/contributor workflows, wallet linking and signed unlink, server-backed provenance intents, strict public proof rendering, and wallet-unlink protection are integrated and covered by isolated synthetic PostgreSQL + browser tests.
- P1.6 remains **OPEN** pending read-only verification of real production-persisted Mainnet anchors and an independent third-party security review.
- P1.5 remains **OPEN** pending public creator profile editing, richer discovery filters, production hosting/persistence and clean-browser journey verification, plus outsider review.
- P2 remains **PARTIALLY OPEN**: Mainnet contract deployment and one recorded user-approved end-to-end provenance bundle exist, but source/build equivalence, a fresh original-bundle HISTORY VERIFIED run, and final security checklist/due diligence remain outstanding.
- P3 pilot work has not been completed: no permissioned original-IP pilot or creator/fan feedback has been recorded.
- P4 Sony application/demo package remains incomplete: founder-specific questionnaire answers, final demo, evidence review, and outsider review remain outstanding.
- Evidence boundary: passing CI uses synthetic fixtures and fake transaction hashes for the server-backed provenance tests. It does not prove production anchor rows or replace Mainnet read-only verification. No Mainnet writes were performed in this hardening slice.
