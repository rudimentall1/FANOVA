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

The local mail sink prints verification and password-reset URLs to the development terminal only. Production auth email has an optional Resend HTTP adapter; provider credentials and a verified sender domain are not included in the repository. See the Auth email delivery section below.

## Current implementation boundary

- Better Auth email/password and verification configuration is present.
- PostgreSQL and Drizzle schemas cover accounts, profiles, roles, works, versions, creator applications, and contributions.
- Server authorization policy functions have unit tests; end-to-end browser coverage is being added.
- Implemented: server-backed accounts, creator applications and admin review, creator work publishing, searchable public catalogue, contribution submission and review, public approved contributions, and version history with stale-submission handling.
- Delivered: public profile editing, public creator pages, privacy-aware bylines, and permission-based Discover filters for fan art, translations, adaptations, and commercial use.\n- Not yet implemented: attachments, production hosting, and production object storage.
- The role table is server-owned; public sign-up must never be allowed to assign the creator, moderator, or admin role.\n- Wallet-linking API foundation: `POST /api/wallet/challenge` issues a five-minute account-and-session-bound SIWE challenge; `POST /api/wallet/verify` verifies the signature server-side and atomically consumes the challenge; `GET /api/wallet` returns the authenticated account's linked wallet. Wallets are unique per account and per chain. Chain ID is fixed to Soneium Mainnet (1868). The browser must replace the challenge's `<wallet-address>` placeholder with the connected wallet address before asking the wallet to sign. The server verifies the exact resulting message. This API does not submit blockchain transactions.
- No production deployment, contract change, or Mainnet write is part of this application scaffold.

## Creator access

New accounts receive only the `reader` role. Users can request creator access from `/dashboard/creator-access`; an administrator reviews applications at `/admin/creator-requests`. Approval assigns the creator role server-side and records the reviewing administrator.

The first administrator must be provisioned out-of-band by a trusted operator. Follow [docs/ADMIN_BOOTSTRAP.md](../../docs/ADMIN_BOOTSTRAP.md). There is intentionally no public endpoint for granting admin or creator roles.


## Auth email delivery

Local development keeps the terminal mail sink; no provider call is made outside production.

The production adapter uses Resend's `POST https://api.resend.com/emails` endpoint and requires all three server-only environment variables:

- `FANOVA_EMAIL_PROVIDER=resend`
- `RESEND_API_KEY` (prefer a sending-only API key)
- `FANOVA_EMAIL_FROM` (an address on a domain verified with Resend)

Set these only in the production environment after the sender domain's DNS verification is complete. Never commit the API key. Production verification and password-reset callbacks schedule delivery with Next.js `after()`, so sending does not block the auth response. The request has a 10-second timeout and a deterministic idempotency key. HTML values are escaped; auth URLs and API keys are not included in delivery error logs.

`GET /api/health` reports `email: "resend"` when production configuration is present, `email: "unconfigured"` with HTTP 503 when required variables are missing, and `email: "development-sink"` outside production. This check validates configuration only: it does not test Resend connectivity, sender-domain verification, inbox placement, or actual delivery.

There is no durable email queue, retry worker, bounce/complaint webhook, or persisted delivery audit yet. Before accepting real users, configure a verified sender domain, send and receive real verification/reset test messages, confirm the deployed runtime supports post-response work, and review provider privacy/retention terms. No live email has been sent as part of this repository change.
