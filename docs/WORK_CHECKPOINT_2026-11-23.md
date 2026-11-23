# FANOVA working checkpoint — 2026-11-23

This is the current handoff snapshot after PR #52. It supersedes older status summaries in [the 2026-11-13 checkpoint](WORK_CHECKPOINT_2026-11-13.md), which remains in the repository as historical implementation notes.

## Repository state

- Repository: [rudimentall1/FANOVA](https://github.com/rudimentall1/FANOVA)
- Main code merges: PR [#50 — PostgreSQL/Drizzle baseline and locked dependencies](https://github.com/rudimentall1/FANOVA/pull/50) and PR [#52 — application-process restart persistence](https://github.com/rudimentall1/FANOVA/pull/52).
- PR #50 squash merge commit: `6c81bcf52711122b4f10938eceff10a944f85c81`.
- PR #52 squash merge commit: `fc16e0eb7af972ffa6a7f053d2c7faad09bb41b9`.
- Code base at this checkpoint: `main` at `fc16e0eb7af972ffa6a7f053d2c7faad09bb41b9`. This checkpoint is being updated in a separate docs-only PR.
- PR #50 full workflow: [CI #543](https://github.com/rudimentall1/FANOVA/actions/runs/45129624903), SUCCESS on exact PR head `4380b5707e67c2db6767c0ec9ea50b7945adbdd0`.
- PR #52 full workflow: [CI #549](https://github.com/rudimentall1/FANOVA/actions/runs/45131070337), SUCCESS on exact PR head `2770daa814a491f2501231e52223022eb4210f38`.
- PR #48 auth-email adapter remains merged as `a983bfb180a2ca7300df85528b86521a544fbeae`; its CI [#517](https://github.com/rudimentall1/FANOVA/actions/runs/45119073095) passed.
- Post-merge Soneium read-only deployment check [#58](https://github.com/rudimentall1/FANOVA/actions/runs/45130224697) passed against the PR #50 merge. No read-only deployment check was run against the test-only PR #52 merge.
- Post-merge main platform CI [#550](https://github.com/rudimentall1/FANOVA/actions/runs/45131424872) completed SUCCESS against merge commit `fc16e0eb7af972ffa6a7f053d2c7faad09bb41b9`.

## Shipped platform capabilities

Evidence labels below follow `AGENTS.md`: `LOCAL`, `MAINNET`, and `INDEPENDENTLY VERIFIED` are distinct states. A green isolated CI run is local test evidence, not production proof.

- **LOCAL** — Multi-account registration, sign-in, email verification/password recovery and role-separated reader, creator, contributor and administrator workflows pass isolated PostgreSQL + Chromium CI. They have not been exercised against a deployed production service.
- **LOCAL** — Creator-controlled publication, version history, permitted-use rules, contribution submission/review, public contribution visibility and stale-contribution handling pass isolated browser/DB CI.
- **LOCAL** — Signed wallet linking/unlinking, account-scoped single-use challenges and challenge-rate limits pass synthetic browser/DB CI. This is not proof of production wallet operations.
- **LOCAL** — Server-backed provenance intents and public Story/Contribution proof rendering enforce chain, canonical contract, transaction/block, event, signer, identity and exact operation hashes in CI fixtures. The fixtures use fake transaction hashes and isolated synthetic database records; they do not demonstrate production-persisted anchor rows or real Mainnet proof rendering.
- **LOCAL** — Public creator profiles, privacy-aware bylines and creator identity search pass isolated browser/DB CI: [PR #44](https://github.com/rudimentall1/FANOVA/pull/44), CI [#498](https://github.com/rudimentall1/FANOVA/actions/runs/45116195818).
- **LOCAL** — Discover filters for fan art, translations, adaptations and commercial use pass isolated page/API parity tests: [PR #47](https://github.com/rudimentall1/FANOVA/pull/47), CI [#504](https://github.com/rudimentall1/FANOVA/actions/runs/45117076740). Genre/category filters remain future scope.
- **LOCAL** — Optional Resend authentication email adapter for verification/password reset passes mocked provider/configuration tests and application CI: [PR #48](https://github.com/rudimentall1/FANOVA/pull/48), CI [#517](https://github.com/rudimentall1/FANOVA/actions/runs/45119073095). No production provider account, credentials, sender domain or live delivery is configured.
- **MAINNET** — A separate user-approved Story → Contribution → Creator Decision smoke-test sequence was submitted on Soneium Mainnet on 2026-10-30. FANOVA's own verifier returned `VERIFIED` for the exact exported bundle after checking its hashes, storage, receipts and events; see [README](../README.md) and [Demo and Evidence](DEMO_AND_EVIDENCE.md). This is a project-run verification of that bundle only, not proof of all production records or a third-party review.
- **INDEPENDENTLY VERIFIED** — No product capability, production deployment or security posture has been independently certified or audited.

## PR #52 — application-process restart persistence check

Merged as `fc16e0eb7af972ffa6a7f053d2c7faad09bb41b9`.

- CI now starts the Next.js server by invoking the direct Next binary so the recorded PID identifies the application process.
- After the multi-account browser journey completes, CI sends SIGTERM to the first server process, confirms it exits and stops serving, starts a fresh Next.js process against the same disposable PostgreSQL 16 service, and waits for health readiness.
- A new Node E2E test queries the public works API for `E2E Story Revised`, then loads its public page and asserts that the revised work and approved public `E2E Fan Art Submission` are still rendered.
- Exact acceptance workflow [CI #549](https://github.com/rudimentall1/FANOVA/actions/runs/45131070337) passed, including both the original multi-account journey and the post-restart read-back.
- Evidence label: **LOCAL**. This verifies data survives a Next.js application-process restart while PostgreSQL stays running in an isolated CI environment.
- It does **not** verify PostgreSQL restart/failover, backups/restore, host replacement, production DB persistence, or Mainnet anchors. P1.5 production acceptance and P1.6 remain OPEN.
- An initial test attempt failed because its assertion read a Fetch response body twice. The test was corrected to read the body once and the latest full CI passed. No product data or production behavior was changed.
- The automated Codex review on the final test head still showed `running` without a submitted review at merge time. Manual diff review and full CI passed, but this does not count as independent security review.

## PR #50 — reproducible PostgreSQL migrations and dependency graph

Merged as `6c81bcf52711122b4f10938eceff10a944f85c81`.

- Initial Drizzle/PostgreSQL migration baseline for the current 14-table schema is checked in at `apps/platform/drizzle/0000_stale_mesmero.sql`, with matching version-7 snapshot and journal metadata.
- The CI flow now runs `npm ci` from committed lockfiles in both `apps/platform` and `apps/web`.
- CI generates Drizzle migrations and fails if schema changes are not committed under `apps/platform/drizzle/`; it then applies the committed migration chain to the disposable CI PostgreSQL 16 service before Better Auth schema validation, production build and multi-account browser E2E.
- Better Auth CLI is pinned to `auth@1.7.27`; Drizzle Kit is pinned to `0.31.11`; Vitest is upgraded to `5.1.1`.
- A bounded `esbuild@0.28.2` npm override removes vulnerable old esbuild resolutions from the deprecated Drizzle Kit `@esbuild-kit` toolchain. CI audit showed zero vulnerabilities in both full and production dependency graphs after this override. Revisit the override when upstream Drizzle Kit removes the deprecated loader.
- The workflow blocks high and critical npm audit findings. It prints moderate findings for visibility but does not fail on moderate-only results.
- The migration is a baseline for a new, empty PostgreSQL database. It is not permission to apply this migration to an existing database without a separately reviewed baseline-adoption procedure.
- Exact PR acceptance run [CI #543](https://github.com/rudimentall1/FANOVA/actions/runs/45129624903) passed the full workflow, including 14 platform test files / 109 unit tests, TypeScript, migration drift check and apply, Better Auth schema validation, production build, and multi-account Chromium browser E2E.
- The automated Codex code-review status still showed `running` without a submitted review when the PR was merged. I manually inspected the changed workflow, SQL baseline, schema snapshot, package manifests and lockfiles. CI passed, no review threads/findings were present, but this is not an independent security audit or third-party certification.

## PR #50 — reproducible PostgreSQL migrations and dependency graph

Merged as `6c81bcf52711122b4f10938eceff10a944f85c81`.

- Initial Drizzle/PostgreSQL migration baseline for the current 14-table schema is checked in at `apps/platform/drizzle/0000_stale_mesmero.sql`, with matching version-7 snapshot and journal metadata.
- The CI flow uses `npm ci` from committed lockfiles in both `apps/platform` and `apps/web`.
- CI generates Drizzle migrations and fails if schema changes are not committed under `apps/platform/drizzle/`; it then applies the committed migration chain to the disposable CI PostgreSQL 16 service before Better Auth schema validation, production build and multi-account browser E2E.
- Better Auth CLI is pinned to `auth@1.7.27`; Drizzle Kit is pinned to `0.31.11`; Vitest is upgraded to `5.1.1`.
- A bounded `esbuild@0.28.2` npm override removes vulnerable old esbuild resolutions from the deprecated Drizzle Kit `@esbuild-kit` toolchain. The accepted PR run's audit reported zero vulnerabilities in both full and production dependency graphs. Revisit the override after upstream Drizzle Kit removes the deprecated loader.
- The workflow blocks high and critical npm audit findings. It prints moderate findings for visibility but does not fail on moderate-only results.
- The migration is a baseline for a new, empty PostgreSQL database. It is not permission to apply this migration to an existing database without a separately reviewed baseline-adoption procedure.
- Exact PR acceptance run [CI #543](https://github.com/rudimentall1/FANOVA/actions/runs/45129624903) passed the full workflow, including 14 platform test files / 109 unit tests, TypeScript, migration drift check and apply, Better Auth schema validation, production build, and multi-account Chromium browser E2E.
- The automated Codex review status still showed `running` without a submitted review when the PR was merged. I manually inspected the changed workflow, SQL baseline, schema snapshot, package manifests and lockfiles. CI passed, no review threads/findings were present, but this is not an independent security audit or third-party certification.

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

1. Main CI #550 is confirmed SUCCESS against the PR #52 merge. Soneium read-only check #58 passed after PR #50; no additional Soneium check was run for PR #52 because it only changed CI test coverage.
2. Add disposable-CI PostgreSQL restart/failover, backup/restore and migration rollback/recovery tests; PR #52 currently covers application-process restart only.
3. Prepare a provider-portable production container/deployment path and documented migration/release procedure without provisioning infrastructure.
4. Compare hosting/database options, regions, backup/restore, privacy, runtime compatibility for Next.js `after()`, and total operating cost.
5. Only after the user approves a provider and the required secrets/domain exist: deploy, perform real email tests, and verify persisted anchors read-only.
6. Schedule independent security review and complete the original-IP pilot and Sony application/demo evidence.

## Key links

- [Roadmap](ROADMAP.md)
- [Stack decision](STACK_DECISION.md)
- [Demo and evidence](DEMO_AND_EVIDENCE.md)
- [Admin bootstrap procedure](ADMIN_BOOTSTRAP.md)
- [Open P1.6 issue #21](https://github.com/rudimentall1/FANOVA/issues/21)
