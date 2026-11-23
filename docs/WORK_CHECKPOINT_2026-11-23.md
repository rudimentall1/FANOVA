# FANOVA working checkpoint — 2026-11-23

This is the current handoff snapshot after PR #48. It supersedes older status summaries in [the 2026-11-13 checkpoint](WORK_CHECKPOINT_2026-11-13.md), which remains in the repository as historical implementation notes.

## Repository state

- Repository: [rudimentall1/FANOVA](https://github.com/rudimentall1/FANOVA)
- Main code merge: PR [#48 — production auth email adapter](https://github.com/rudimentall1/FANOVA/pull/48)
- PR #48 squash merge commit: `a983bfb180a2ca7300df85528b86521a544fbeae`
- Code base at this checkpoint: `main` at `a983bfb180a2ca7300df85528b86521a544fbeae`. This checkpoint is being added in a separate docs-only PR.
- PR #48 full workflow: [CI #517](https://github.com/rudimentall1/FANOVA/actions/runs/45119073095), SUCCESS on head `9bdc98b38b35e0e997c1671725aea52c0435aeb0`.
- Post-merge Soneium read-only deployment check [#56](https://github.com/rudimentall1/FANOVA/actions/runs/45119442148) completed SUCCESS against this code merge. Main platform CI [#518](https://github.com/rudimentall1/FANOVA/actions/runs/45119442153) was still in progress when this checkpoint was prepared; check its final conclusion before treating the merge as fully green.

## Shipped platform capabilities

The following are implemented and merged:

- Multi-account registration, sign-in, verification and password-recovery flows; role-separated reader, creator, contributor and administrator workflows.
- Creator-controlled work publication, version history, explicit permitted-use rules, contribution submission and review, public contribution visibility, and stale-contribution handling.
- Signed wallet linking and unlinking with short-lived, single-use, account-scoped challenges and challenge-rate limits.
- Server-backed provenance intents and public Story/Contribution proof rendering with strict checks for chain, canonical contract, transaction/block, event, signer, identity and exact operation hashes.
- Public creator profiles, privacy-aware public bylines and creator identity search: [PR #44](https://github.com/rudimentall1/FANOVA/pull/44), CI [#498](https://github.com/rudimentall1/FANOVA/actions/runs/45116195818).
- Discover filters for fan art, translations, adaptations and commercial use, applied consistently to the page and public API: [PR #47](https://github.com/rudimentall1/FANOVA/pull/47), CI [#504](https://github.com/rudimentall1/FANOVA/actions/runs/45117076740). Genre/category filters remain future scope.
- Optional production authentication email adapter for Better Auth verification and password reset: [PR #48](https://github.com/rudimentall1/FANOVA/pull/48), CI [#517](https://github.com/rudimentall1/FANOVA/actions/runs/45119073095).

## PR #48 — production authentication email adapter

Merged implementation details:

- Local development keeps the existing terminal mail sink.
- Production can explicitly select the Resend HTTP driver using server-only `FANOVA_EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `FANOVA_EMAIL_FROM`.
- Production configuration also requires `BETTER_AUTH_URL` to be an absolute HTTPS URL without embedded credentials. Generated verification/reset links must match that exact app origin.
- HTML values are escaped; recipient and sender header line breaks are rejected; request timeout is 10 seconds.
- The idempotency key is calculated from the complete outbound payload so the same message payload is deduplicated without incorrectly conflating messages whose content has changed.
- Better Auth callbacks schedule provider delivery with Next.js `after()`; this avoids blocking auth responses. Deployment must use a compatible Node.js/Docker runtime or a serverless adapter that implements Next's `waitUntil` lifecycle support.
- `GET /api/health` reports mail configuration readiness and returns HTTP 503 when required production settings are missing or insecure. This is a configuration check only; it does not verify Resend connectivity, sender-domain DNS verification, inbox placement or message receipt.
- Delivery failures are logged with sanitized reason/status only. The implementation has no durable email queue, retry worker, bounce/complaint webhook, or persisted delivery audit.

Review/validation boundary:

- The automated code review found one P2 on an earlier commit: email readiness did not include `BETTER_AUTH_URL`. This was fixed by HTTPS validation, origin binding and regression tests; the review thread was resolved.
- The automated re-review requested on the final head had not returned a final result at checkpoint time. No unresolved review threads remained. This does not constitute an independent security audit.
- CI #517 passed configuration tests, TypeScript, PostgreSQL migration generation/application, Better Auth schema validation, production build and multi-account Chromium browser E2E.
- No Resend account, API key, verified sender domain or paid plan was created. No real email was sent. Production email remains unconfigured until deployment secrets and a verified sender domain are deliberately supplied.

## Open acceptance gates

### P1.5 — production-ready multi-user platform: OPEN

Implemented product functionality is passing isolated PostgreSQL + Chromium CI. The exit gate is not met until all of the following are completed:

1. Select production hosting, region, persistent PostgreSQL, backups/restore, retention, privacy and operational monitoring. Compare current cost and service limits before choosing a provider.
2. Configure the production email provider and verified sender domain using deployment secrets; send and receive real verification and password-reset messages; validate the deployed runtime's post-response task lifecycle.
3. Run the complete registration → verification → login → creator/contributor → publish/review journey against the deployed service from clean browsers and independent accounts.
4. Obtain independent outsider review of the deployed application and its security boundaries.

An optional Resend adapter exists in code, but neither Resend nor a hosting platform has been finally selected as a paid production service. No infrastructure was provisioned as part of PR #48.

### P1.6 — provenance security and production verification: OPEN

- Read-only verify real persisted production database anchors against Soneium Mainnet, including canonical contract, chain ID, transaction receipts, expected events, signer, entity identities and exact hashes.
- No production database access or real persisted Mainnet anchor rendering has been demonstrated.
- Obtain an independent third-party security audit/review and preserve its findings and remediation evidence.
- Synthetic GitHub Actions fixtures, fake tx hashes and CI proof states are not production evidence and do not replace these gates.

### P2 — Mainnet provenance assurance: PARTIALLY OPEN

- Soneium Mainnet deployment and a user-approved Story → Contribution → Creator Decision smoke-test bundle exist; the project's verifier returned `VERIFIED` for that exact bundle.
- The contract explorer reports source verification as partial match. Main executable bytecode comparison strips metadata; it is not a full metadata/source equivalence claim.
- A fresh `HISTORY VERIFIED` run against the unchanged original evidence bundle and the remaining source/build equivalence and final security checklist work are still outstanding.
- Do not imply legal IP ownership, licensing, complete event history, or independent certification.

### P3 — original-IP pilot: NOT STARTED

- Obtain permission for original pilot material.
- Run a small creator/fan test.
- Record real observations and feedback. Do not invent users, metrics or outcomes.

### P4 — Sony application and demo: INCOMPLETE

- Map and answer every application question with founder-specific facts.
- Record a concise reproducible demo that includes meaningful failure behavior.
- Verify addresses, links, test evidence and status claims.
- Obtain outsider review before submission.

Internal target for the Sony application/demo is December 15, 2026. Do not present that internal target as an official public deadline.

## Infrastructure and safety boundary

- Earlier read-only inspection found the existing Render workspace contains an unrelated Frankfurt service and no PostgreSQL instance. Nothing was created or changed.
- No production host, database, email provider account, API key, DNS record, paid service or deployment has been created in this work.
- No production data was read or written.
- No Mainnet write, contract call that mutates state, or wallet transaction was sent.
- Do not create paid resources, deploy services, write to production databases or send Mainnet transactions without explicit user approval.

## Next execution order

1. Re-check main CI #518 and Soneium read-only check #56 after PR #48's merge.
2. Prepare a provider-portable production container/deployment path and documented migration/release procedure without provisioning infrastructure.
3. Compare hosting/database options, regions, backup/restore, privacy, runtime compatibility for Next.js `after()`, and total operating cost.
4. Only after the user approves a provider and the required secrets/domain exist: deploy, perform real email tests, and verify persisted anchors read-only.
5. Schedule independent security review and complete the original-IP pilot and Sony application/demo evidence.

## Key links

- [Roadmap](ROADMAP.md)
- [Stack decision](STACK_DECISION.md)
- [Demo and evidence](DEMO_AND_EVIDENCE.md)
- [Admin bootstrap procedure](ADMIN_BOOTSTRAP.md)
- [Open P1.6 issue #21](https://github.com/rudimentall1/FANOVA/issues/21)
