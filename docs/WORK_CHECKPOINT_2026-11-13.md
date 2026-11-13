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
