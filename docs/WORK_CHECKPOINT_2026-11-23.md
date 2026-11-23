# FANOVA working checkpoint — 2026-11-23

This is the current handoff snapshot after PR #54. It supersedes older status summaries in [the 2026-11-13 checkpoint](WORK_CHECKPOINT_2026-11-13.md), which remains in the repository as historical implementation notes.

## Repository state

- Repository: [rudimentall1/FANOVA](https://github.com/rudimentall1/FANOVA)
- Main merges since PR #50: PR [#52 — application-process restart persistence](https://github.com/rudimentall1/FANOVA/pull/52), PR [#53 — updated working checkpoint](https://github.com/rudimentall1/FANOVA/pull/53), and PR [#54 — PostgreSQL container restart persistence](https://github.com/rudimentall1/FANOVA/pull/54).
- PR #53 documentation merge commit: `755d067b6ece08b77201d4ef0c4966f4f7a83c7f`; its docs CI [#551](https://github.com/rudimentall1/FANOVA/actions/runs/45131902040) passed and automated review completed without findings.
- PR #50 squash merge commit: `6c81bcf52711122b4f10938eceff10a944f85c81`.
- PR #52 squash merge commit: `fc16e0eb7af972ffa6a7f053d2c7faad09bb41b9`.
- PR #54 squash merge commit: `7be8a194d9e162a500d5bde895c86644cba390c2`.
- Main repository HEAD at checkpoint preparation: `7be8a194d9e162a500d5bde895c86644cba390c2`. The application code/runtime remains unchanged from PR #52; PR #54 adds CI-only database restart coverage.
- PR #50 full workflow: [CI #543](https://github.com/rudimentall1/FANOVA/actions/runs/45129624903), SUCCESS on exact PR head `4380b5707e67c2db6767c0ec9ea50b7945adbdd0`.
- PR #52 full workflow: [CI #549](https://github.com/rudimentall1/FANOVA/actions/runs/45131070337), SUCCESS on exact PR head `2770daa814a491f2501231e52223022eb4210f38`.
- PR #54 full workflow: [CI #553](https://github.com/rudimentall1/FANOVA/actions/runs/45132721837), SUCCESS on exact PR head `6a5d20c99d74e1e1a46b44703e1384edbab39683`.
- PR #48 auth-email adapter remains merged as `a983bfb180a2ca7300df85528b86521a544fbeae`; its CI [#517](https://github.com/rudimentall1/FANOVA/actions/runs/45119073095) passed.
- Latest Soneium read-only deployment check [#60](https://github.com/rudimentall1/FANOVA/actions/runs/45132230983) passed on pre-PR54 commit `755d067b6ece08b77201d4ef0c4966f4f7a83c7f`. PR #54 changes CI-only test workflow, not application or contract code; no new Mainnet write was performed.
- Post-merge main CI [#552](https://github.com/rudimentall1/FANOVA/actions/runs/45132230976) passed against docs commit `755d067b6ece08b77201d4ef0c4966f4f7a83c7f`. Main CI [#554](https://github.com/rudimentall1/FANOVA/actions/runs/45133239425) was queued against PR #54 merge when checkpoint text was prepared; do not mark it successful until its conclusion is checked.

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

## PR #54 — PostgreSQL service-container restart persistence check

Merged as `7be8a194d9e162a500d5bde895c86644cba390c2`.

- After the PR #52 app-process restart read-back, CI stops the second Next.js process and locates exactly one PostgreSQL 16 service container in the GitHub Actions runner.
- CI records the existing container's `StartedAt`, restarts that same container via Docker (without removing/recreating it), waits for Docker health `healthy` and `pg_isready`, and asserts that `StartedAt` changed.
- CI starts a new Next.js process against the same PostgreSQL container and repeats the public works API/page check for `E2E Story Revised` and `E2E Fan Art Submission`.
- Exact acceptance workflow [CI #553](https://github.com/rudimentall1/FANOVA/actions/runs/45132721837) passed. Its log records the PostgreSQL container restart from `2026-11-23T07:39:50.682627799Z` to `2026-11-23T07:42:27.622359306Z`, successful health/pg readiness, and a successful post-restart persistence test.
- Evidence label: **LOCAL**. This verifies the existing disposable PostgreSQL container restarts and the committed test data remains readable from a fresh application process.
- It does **not** verify backups/restore, data-volume loss recovery, database failover, host replacement, production DB persistence, or Mainnet anchors. P1.5/P1.6 remain OPEN.
- Codex code review completed on the exact PR head with no findings and no unresolved threads. This is an automated code review of the CI change, not an independent security audit.

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

1. PR #54's exact-head CI #553 passed both app-process and PostgreSQL-container restart checks. Main CI #554 is pending against the PR #54 merge; verify its final conclusion. Soneium read-only #60 passed on the prior commit; PR #54 only changes CI tests.
2. Add disposable-CI backup/restore, data-volume loss recovery and migration rollback tests. The current database test restarts the same container; it does not test restoring after data loss or failover to a replica.
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
