# FANOVA platform

This is the isolated Next.js application for the multi-user product. The existing `apps/web` browser prototype remains unchanged until this application passes the server-backed acceptance path.

## Local development

Requirements: Node.js 22+, Docker Compose.

1. Copy `.env.example` to `.env.local` and replace `BETTER_AUTH_SECRET` with a random value of at least 32 characters.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Install dependencies: `npm install`.
4. Generate the Better Auth Drizzle schema: `npx auth@latest generate --output src/db/schema/auth.ts`.
5. Generate and apply Drizzle migrations: `npx drizzle-kit generate`, then `npx drizzle-kit migrate`.
6. Validate the auth schema: `npm run auth:check` (after migrations are applied).\n7. Start the application: `npm run dev`.

The local mail sink prints verification and password-reset URLs to the development terminal only. It is not a production email service. Production startup deliberately refuses to deliver auth email until a provider is configured.

## Current implementation boundary

- Better Auth email/password and verification configuration is present.
- PostgreSQL and Drizzle schema are present.
- Server authorization policy functions have cross-account unit tests.
- Public catalogue, creator publishing, contribution persistence, and production email delivery are not implemented yet.
- The role table is server-owned; public sign-up must never be allowed to assign the creator, moderator, or admin role.
- No production deployment, contract change, or Mainnet write is part of this application scaffold.

## Creator access

New accounts receive only the `reader` role. Users can request creator access from `/dashboard/creator-access`; an administrator reviews applications at `/admin/creator-requests`. Approval assigns the creator role server-side and records the reviewing administrator.

The first administrator must be provisioned out-of-band by a trusted operator. Follow [docs/ADMIN_BOOTSTRAP.md](../../docs/ADMIN_BOOTSTRAP.md). There is intentionally no public endpoint for granting admin or creator roles.
