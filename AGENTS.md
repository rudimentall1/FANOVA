# FANOVA Agent Rules

This file is mandatory project policy for every AI assistant, contributor, and implementation session.

## Before doing any work
1. Read this file.
2. Read `docs/PROJECT_SKELETON.md` in full.
3. Read `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and `docs/DECISIONS.md`.
4. Inspect the current repository state and relevant files before proposing or changing implementation.
5. State which roadmap milestone the requested work serves. If it serves none, do not implement it by default.

## Scope lock
The only MVP is the end-to-end creator/fan story workflow defined in `docs/PROJECT_SKELETON.md`. No feature expansion without a written decision in `docs/DECISIONS.md` and a corresponding skeleton/roadmap update.

Do not add a token, marketplace, DAO, social feed, complex AI generation, multi-chain support, or broad creator platform just because it is technically possible. A feature must support the core user outcome and fit the one-month delivery window.

## Truth and evidence
- Never claim a feature is implemented, deployed, live, secure, legally compliant, adopted, or independently verified without evidence.
- Label capability status as `PLANNED`, `LOCAL`, `MAINNET`, or `INDEPENDENTLY VERIFIED`. Use `TESTNET` only when explicitly describing optional pre-deployment testing, never as the default product target.
- Distinguish mocked data from live data in UI and demos.
- Never fabricate transaction hashes, users, creator permissions, rights ownership, payments, metrics, Sony involvement, or partnerships.
- Onchain records do not establish legal ownership of IP by themselves.
- Do not use third-party copyrighted IP without documented permission. Use original pilot content or content with explicit permission.

## Engineering discipline
- Prefer one complete vertical slice over many partial features.
- Add tests for domain rules and security-sensitive behavior.
- Do not deploy to mainnet or spend funds without explicit user approval.
- Do not expose private keys, seed phrases, API secrets, or credentials in code, logs, commits, screenshots, or demos.
- Keep contracts minimal; use reviewed standard libraries when appropriate.
- Record architectural changes and trade-offs in `docs/DECISIONS.md`.
- Update roadmap status only after checking evidence.
- Never change the chain, core workflow, or product promise silently.

## Conflict protocol
If a user request conflicts with this policy or the locked skeleton:
1. Explain the exact conflict and consequence.
2. Offer the smallest compliant alternative.
3. Wait for explicit approval before changing the canonical plan.
Do not treat casual brainstorming as approval to expand scope.

## End-of-task report
Report: files changed, milestone advanced, checks actually run, evidence produced, remaining blockers, and exact status labels. Be concise and factual.

## Multi-user product direction (ADR-017)
The final web MVP is a multi-user creator/contributor platform, not just the original local single-page prototype. Read `docs/WEB_PRODUCT_SPEC.md` before changing web architecture or user flows. Implement real server-backed authentication and persistence, server-enforced authorization, public catalogue/work pages, Creator Studio, contributor dashboards, and wallet linking as separate identity layers. Keep the core story → contribution → creator decision → provenance workflow narrow. Do not add social-network features, payments, royalties, tokens, NFT marketplace, DAO, AI generation, or multi-chain support without a new explicit decision. Do not change the deployed contract or send Mainnet transactions without explicit approval. The final demo is blocked until the WEB_PRODUCT_SPEC.md acceptance criteria pass.

