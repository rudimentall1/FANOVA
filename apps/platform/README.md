# FANOVA platform

This is the isolated Next.js application for the multi-user product. The existing `apps/web` browser prototype remains unchanged until this application passes the server-backed acceptance path.

## Local development

Requirements: Node.js 22+, Docker Compose.

1. Copy `.env.example` to `.env.local` and replace `BETTER_AUTH_SECRET` with a random value of at least 32 characters.
2. Set `FANOVA_SIWE_DOMAIN` and `FANOVA_SIWE_URI` to the exact deployment host and origin (for local development: `localhost:3000` and `http://localhost:3000`). Production requires HTTPS.\n3. Start PostgreSQL: `docker compose up -d postgres`.
4. Install dependencies: `npm install`.
5. Generate the Better Auth Drizzle schema: `npx auth@latest generate --output src/db/schema/auth.ts`.
6. Generate and apply Drizzle migrations: `npx drizzle-kit generate`, then `npx drizzle-kit migrate`.
7. Validate the auth schema: `npm run auth:check` (after migrations are applied).
8. Start the application: `npm run dev`.

The local mail sink prints verification and password-reset URLs to the development terminal only. It is not a production email service. Production startup deliberately refuses to deliver auth email until a provider is configured.

## Current implementation boundary

- Better Auth email/password and verification configuration is present.
- PostgreSQL and Drizzle schemas cover accounts, profiles, roles, works, versions, creator applications, and contributions.
- Server authorization policy functions have unit tests; end-to-end browser coverage is being added.
- Implemented: server-backed accounts, creator applications and admin review, creator work publishing, searchable public catalogue, contribution submission and review, public approved contributions, and version history with stale-submission handling.
- Not yet implemented: public profile editing, attachments, production email delivery, production hosting, object storage, and the wallet-linking settings UI.
- The role table is server-owned; public sign-up must never be allowed to assign the creator, moderator, or admin role.\n- Wallet-linking API foundation: `POST /api/wallet/challenge` issues a five-minute account-and-session-bound SIWE challenge; `POST /api/wallet/verify` verifies the signature server-side and atomically consumes the challenge; `GET /api/wallet` returns the authenticated account's linked wallet. Wallets are unique per account and per chain. Chain ID is fixed to Soneium Mainnet (1868). The browser must replace the challenge's `<wallet-address>` placeholder with the connected wallet address before asking the wallet to sign. The server verifies the exact resulting message. This API does not submit blockchain transactions.
- No production deployment, contract change, or Mainnet write is part of this application scaffold.

## Creator access

New accounts receive only the `reader` role. Users can request creator access from `/dashboard/creator-access`; an administrator reviews applications at `/admin/creator-requests`. Approval assigns the creator role server-side and records the reviewing administrator.

The first administrator must be provisioned out-of-band by a trusted operator. Follow [docs/ADMIN_BOOTSTRAP.md](../../docs/ADMIN_BOOTSTRAP.md). There is intentionally no public endpoint for granting admin or creator roles.
