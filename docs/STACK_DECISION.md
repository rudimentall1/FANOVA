# FANOVA application stack decision

**Date:** 2026-10-30  
**Status:** Accepted for local implementation; production hosting provider remains undecided  
**Roadmap:** P1.5 — Multi-user web product foundation

## Decision

Build the multi-user application as a separate TypeScript application under `apps/platform/`. Keep the existing dependency-light browser prototype in `apps/web/` unchanged until the server-backed journey passes acceptance tests.

| Layer | Selection | Reason |
|---|---|---|
| Web framework | Next.js App Router, TypeScript | Server-rendered public catalogue and work pages alongside authenticated workspaces and server actions/route handlers |
| Database | PostgreSQL | Relational ownership, version, submission, decision, and audit data; portable across local and managed hosting |
| ORM and migrations | Drizzle ORM + versioned SQL migrations | Typed schema with explicit, reviewable SQL and no opaque schema sync |
| Authentication | Better Auth with its PostgreSQL/Drizzle adapter | Maintained email/password, verification, recovery, and session primitives; avoid custom password/session implementation |
| Validation | Zod at server boundaries | Parse and validate untrusted form and API input before domain transitions |
| File storage | Storage adapter interface; local filesystem for development | Keep story/media bytes offchain and avoid binding the application to a cloud vendor before hosting is selected |
| Email | Mailer adapter; development mail sink + optional Resend HTTP driver | Keep local development credential-free while providing a server-side production integration without adding an SDK dependency |
| Tests | Vitest for domain/server logic; Playwright for browser journeys | Verify authorization and real multi-account flows, not just UI rendering |
| Local database | PostgreSQL through Docker Compose | Reproducible development and integration tests |

## Boundaries

- The first implementation runs locally in the repository workflow. No production deployment or external account registration is part of this decision.
- No production provider, region, paid plan, or hosting target is selected. Decide that only after comparing current deployment fit, free-tier limits, backup/retention behavior, email delivery, storage, privacy, and operating cost.
- No secrets, production credentials, private keys, or database dumps enter Git.
- Production secrets remain server-side. Browser bundles must never receive database credentials.
- Every private read and every mutation must authorize the authenticated user and resource ownership on the server. Hiding UI controls is not authorization.
- Wallet identity remains separate from application account identity. Wallet linking requires a signed, nonce-bound challenge.
- The existing Soneium contract and read-only verifier remain unchanged. No Mainnet writes are authorized.
- Existing `apps/web` remains the local workflow reference until parity is demonstrated. Do not delete or silently replace it.

## Alternatives considered

- **Supabase as the application backend:** offers integrated Postgres, Auth, and storage, but introduces provider-specific auth/storage APIs and a production dependency before hosting, retention, and free-tier fit have been verified. Keep it as a future deployment option, not a code-level assumption.
- **Self-managed Express/Fastify plus custom auth:** adds session, recovery, verification, CSRF, and account-security work without improving the product outcome.
- **SQLite:** convenient for a single-process prototype but weaker fit for the intended concurrent multi-user deployment and production migration path.
- **Next.js with a proprietary hosted database/auth SDK:** rejected for now because it couples core domain logic and persistence to a vendor.

## Implementation sequence

1. Add the isolated `apps/platform` application and local PostgreSQL development environment.
2. Add migrations and the minimal account/profile/role schema.
3. Integrate Better Auth with email verification and a development-only mail sink.
4. Add server-side authorization helpers and cross-account tests before exposing work CRUD.
5. Implement public work discovery and creator publishing.
6. Implement contributor submissions, creator review, stale-version lifecycle, and audit events.
7. Add storage adapter and wallet-link challenge only when their user journeys are reached.
8. Select production hosting only after the local acceptance path and provider comparison are complete.

## Consequences and limitations

This is an implementation stack decision, not evidence that authentication, persistence, email, storage, or deployment already work. The production email provider, object-storage provider, hosting platform, region, backups, and operational monitoring remain open. No production service is assumed free or suitable until verified.


## Production auth email adapter — 2026-11-23

- Added an optional Resend HTTP driver for Better Auth verification and password-reset messages. It is selected explicitly with `FANOVA_EMAIL_PROVIDER=resend`; `RESEND_API_KEY` and `FANOVA_EMAIL_FROM` are required.
- This is an implementation adapter, not a final production-provider or paid-plan selection. No Resend account, API key, sender domain, or live message has been configured.
- Production callbacks use Next.js `after()` to avoid delaying authentication responses. Requests have a 10-second timeout, use an idempotency key derived from the message kind/recipient/URL, escape HTML content, and log sanitized failure details only.
- `/api/health` reports whether the email environment is configured, but does not probe the provider or verify the sender domain.
- No durable queue, automatic retry, bounce/complaint processing, or delivery audit exists. A successful API response is not proof that a message reached the recipient's inbox.
- Before production acceptance, verify a sending-only key and sender domain, perform real end-to-end verification and password-reset delivery tests, confirm runtime support for post-response tasks, and review provider privacy/retention. No live email was sent in CI.


## PostgreSQL migration baseline and dependency reproducibility — 2026-11-23

- `apps/platform/drizzle/0000_stale_mesmero.sql` is the initial Drizzle PostgreSQL baseline for the current 14-table schema, its enums, foreign keys and indexes. The matching snapshot and migration journal are checked in.
- CI generates migrations before applying them. If generation changes the `drizzle/` tree without corresponding committed migration files, the job fails. The ephemeral PostgreSQL service then applies the committed migration set before Better Auth schema verification, build, and multi-account E2E.
- `apps/platform/package-lock.json` and `apps/web/package-lock.json` pin the CLI, test, browser, and application dependency graphs. CI uses `npm ci` for both packages; high and critical npm audit findings fail the workflow.
- `drizzle-kit` currently has a deprecated transitive `@esbuild-kit` dependency. A bounded npm override pins all esbuild resolutions to `0.28.2`; this is a development-toolchain workaround until upstream removes the old dependency. It must be revisited on a supported Drizzle Kit release.
- This migration baseline targets a new, empty PostgreSQL database. It is not permission to apply the baseline to an existing database or infer production schema state. Any existing database would require an explicit, reviewed baseline-adoption procedure before migration execution.
- No production database was provisioned, read, or modified by this work.


## Application process-restart persistence evidence — 2026-11-23

- PR #52 added an isolated CI acceptance step: after multi-account browser E2E, the Next.js process is stopped, a fresh process is started against the same disposable PostgreSQL database, and the public works API/page are queried for the published work revision and approved public contribution.
- Full workflow [CI #549](https://github.com/rudimentall1/FANOVA/actions/runs/45131070337) passed with the restart/read-back step.
- Scope is limited to application-process restart with PostgreSQL continuously available. It does not verify PostgreSQL restart, failover, backups/restore, host replacement, production persistence or Mainnet records. Production hosting and persistence gates remain open.


## PostgreSQL service-container restart persistence evidence — 2026-11-23

- PR #54 adds a CI step after the PR #52 application-process restart test. It locates exactly one `postgres:16-alpine` service container, records `StartedAt`, restarts that same container with Docker, checks its health and `pg_isready`, and requires the new `StartedAt` to differ.
- CI then launches a new Next.js process against that PostgreSQL container and repeats the public works API/page read-back for the published Story revision and approved public contribution.
- Full workflow [CI #553](https://github.com/rudimentall1/FANOVA/actions/runs/45132721837) passed; logs show the same container restarted, health/readiness recovered, and the post-restart read-back passed.
- Scope is LOCAL CI evidence on a disposable PostgreSQL service. It does not prove backups/restore, data-volume loss recovery, replica failover, host replacement, production persistence or Mainnet records.
