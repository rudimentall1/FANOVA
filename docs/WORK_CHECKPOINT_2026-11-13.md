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
