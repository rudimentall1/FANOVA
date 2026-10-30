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
| Email | Mailer adapter; development mail sink | Exercise verification and recovery locally without sending real email or requiring credentials |
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
