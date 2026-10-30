# FANOVA Web Product Specification

**Status:** Accepted product direction; multi-user application implementation in progress  
**Target:** Sony Onchain Entertainment Incubation Program

## 1. Product direction

FANOVA is a multi-user web product, not a single-page contract demo. Creators publish and manage story worlds and permitted-use rules. Readers discover works. Contributors submit derivative work and track creator decisions. The onchain provenance workflow is a trust layer inside the product, not the whole interface.

The MVP must have real accounts, server-backed persistence, public work discovery, creator workspaces, contributor dashboards, and one complete story-to-contribution-to-decision-to-provenance journey.

## 2. Roles

### Visitor
- Browse public works and creator profiles.
- Read public work pages and current participation rules.
- Open public contribution and provenance pages.
- Register or sign in to submit work or manage a creator account.

### Registered reader / contributor
- Maintain an account and public profile.
- Browse and search published works.
- Submit a contribution after acknowledging the current permission version.
- Track their own submissions, statuses, creator feedback, source version, and provenance.
- Can request creator access by submitting a short application and optional public portfolio. Creator permissions are granted only after administrator review.\n- Cannot edit source works or make creator decisions.

### Creator
- All contributor capabilities.
- Create, edit, draft, publish, archive, and manage their own works.
- Define permitted-use rules and publish source/permission versions.
- Review submissions to their own works and approve or reject eligible submissions.
- View version history and stale submissions.
- Connect and verify a wallet for onchain actions.
- Cannot manage another creator's work or submissions.

A creator role or wallet address is not proof of legal IP ownership. Users remain responsible for having the rights they claim.

### Moderator / administrator
- Review creator access applications and grant the creator role after review.\n- Minimal operational role for abuse reports, account suspension, and prohibited content.
- Cannot silently alter creator decisions or forge onchain attribution.
- Security-relevant administrative actions must be auditable.

A user may be both a creator and a contributor. Roles are permissions, not mutually exclusive account types.

## 3. Site map

### Public pages
- `/` — landing page and featured works.
- `/discover` — catalogue with search, genre/category filters, and sorting.
- `/works/[slug]` — work detail: synopsis, creator, cover, current version, permitted-use rules, and contribution entry point.
- `/works/[slug]/contributions/[id]` — public contribution detail when visibility allows.
- `/creators/[handle]` — public creator profile and published works.
- `/proof/[id]` — provenance details, source relationship, decision, wallet addresses, transaction links, and verifier status.
- `/about`, `/terms`, `/privacy` — product, content, and privacy information.

### Authentication
- `/sign-up`, `/sign-in`
- `/forgot-password`, `/reset-password`
- `/verify-email`
- `/settings/account`

### Contributor workspace
- `/dashboard` — personal overview.
- `/dashboard/contributions` — submissions and statuses.
- `/dashboard/profile` — public profile editor.
- `/dashboard/settings` — account preferences and linked wallet.

### Creator workspace
- `/studio` — creator overview and review queue.
- `/studio/works` — creator's works.
- `/studio/works/new` — create a work.
- `/studio/works/[slug]/edit` — edit private draft content and permissions.
- `/studio/works/[id]/versions` — version history.
- `/studio/works/[id]/submissions` — submissions for a work.
- `/studio/submissions/[id]` — review and decision screen.

Private drafts, unpublished submissions, email addresses, and account metadata must never leak through public routes.

## 4. Core user journeys

### Discover and contribute
1. Visitor browses Discover and opens a work.
2. Visitor reads the current rules and creates an account.
3. User verifies email and submits a contribution with explicit permission acknowledgement.
4. Submission appears in the contributor dashboard and creator review queue.

### Publish and review
1. Creator creates a work with title, synopsis, source material, cover, genre, and permitted-use rules.
2. Creator previews and publishes it.
3. Creator reviews a pending contribution and approves or rejects it with an optional reason.
4. The decision is persisted server-side and shown with an exact status.
5. If the creator chooses to anchor it onchain, their connected wallet submits the existing contract transaction. UI verifies the expected receipt/event and links the evidence.

### Track provenance
1. Contributor opens My Contributions and sees pending, approved, rejected, or stale status.
2. Contribution detail links to its source work/version and permission version.
3. If an onchain record exists, show wallet address, transaction, and verifier result. Local-only records must never appear onchain verified.

### Version changes
1. Creator publishes a new source or permission version.
2. Pending submissions tied to older versions become stale for new approval.
3. Historical submissions and decisions remain readable and are never rewritten.
4. Contributor submits a new contribution against the current version if they want another review.

## 5. Core server-side data model

- `User`: immutable ID, auth-provider ID/email, account status, timestamps.
- `Profile`: user ID, unique handle, display name, bio, avatar reference, visibility.
- `Role`: user ID and role (contributor, creator, moderator, admin).
- `Wallet`: user ID, chain ID, address, verification method, verified timestamp.
- `Work`: stable ID, slug, creator user ID, title, synopsis, cover, visibility, publication status, current source version.
- `WorkVersion`: work ID, version, source content/reference/hash, permission text/hash/version, timestamps.
- `Contribution`: work ID, contributor user ID, source version, permission version, title, content/reference/hash, visibility, status.
- `ReviewDecision`: contribution ID, creator user ID, outcome, reason, timestamp, optional transaction reference.
- `ProvenanceAnchor`: entity ID, chain ID, contract address, transaction hash, block number, event identity, verification status and snapshot block.
- `ContentAsset`: owner, storage key, MIME type, size, visibility, checksum.
- `AuditEvent`: actor, action, target, timestamp, minimal non-sensitive metadata.

Full story and contribution content stays offchain. Onchain data remains limited to the hashes, identifiers, wallet addresses, and decisions required by the existing contract. Never put passwords, emails, private profile data, or full creative text onchain.

## 6. Authentication and security

- Use a maintained authentication provider or reviewed server-side auth library. Do not build password cryptography or session management from scratch.
- Passwords must never be stored in plaintext or reversible form. If password verification is self-managed, use a current password hashing algorithm such as Argon2id with reviewed parameters.
- Require email verification before public contribution submission or creator publishing.
- Use secure, HTTP-only, same-site session cookies; rotate sessions after login and privilege changes.
- Rate-limit sign-in, sign-up, recovery, and contribution submission.
- Validate all inputs on the server. Client-side role switches are not authorization.
- Enforce ownership and role checks on every server mutation and private data read.
- Protect state-changing requests against CSRF where cookie sessions are used.
- Use least-privilege database policies and automated cross-user/cross-role access tests.
- Keep secrets server-side in deployment configuration. No credentials in Git or client bundles.
- Define account deletion/export and privacy policy before public launch.
- Wallet linking requires a signed nonce challenge bound to account and chain. A wallet is not legal identity or proof of IP rights.

## 7. Wallet and onchain boundary

Email/password authentication identifies an application account. A wallet signature proves control of an address for a challenge. These are separate identity layers.

The existing Soneium contract remains the provenance anchor. This site expansion does not authorize contract changes, redeployment, or Mainnet transactions.

For each onchain operation:
- Require the expected connected wallet and Soneium Mainnet chain ID `1868`.
- Confirm that the wallet matches the creator/contributor account expected by the workflow.
- Keep wallet confirmation under user control; FANOVA never holds private keys.
- Persist operation ID and transaction hash before waiting for a receipt.
- Verify expected event and transaction result.
- Distinguish `LOCAL`, `PENDING`, `MAINNET`, `VERIFIED`, `PARTIALLY VERIFIED`, `STALE`, and `FAILED`.

## 8. Product design requirements

- Responsive desktop and mobile layouts with consistent global navigation.
- Distinct public pages and authenticated workspaces.
- Clear loading, empty, error, success, stale, and permission-denied states.
- Catalogue cards show cover, title, creator, genre/tags, synopsis, and participation status.
- Work pages make current permission rules prominent before submission.
- Creator review screens show the exact source and permission versions attached to each submission.
- Provenance pages explain what the chain proves and does not prove.
- Use original or explicitly permissioned demo content. No unlicensed third-party IP, fake users, fake wallet bindings, or fake onchain results.

## 9. MVP acceptance criteria

The final demo is blocked until:
1. A user can register, verify email, sign in, sign out, and recover access.
2. A user can create/edit a public profile without exposing private account data.
3. A creator can publish an original work with versioned permissions.
4. A visitor can discover and open the work from the public catalogue.
5. A separate contributor account can submit against the current permission version.
6. The contributor can see their submission/status in their dashboard.
7. The creator can review it in Creator Studio.
8. Cross-account and cross-role authorization tests prove users cannot edit another user's work, read private drafts, or make unauthorized decisions.
9. Source/permission changes stale pending submissions while preserving historical records.
10. The existing onchain path requires user-approved wallet transactions and the read-only verifier can inspect resulting evidence.
11. Data persists server-side across browsers/devices; localStorage is not the source of truth for accounts, works, or contributions.
12. Local-only records are never presented as onchain verified.

## 10. Deferred

Not part of the first multi-user MVP:
- Social feed, comments, likes, follows, direct messages, or creator chat.
- Subscriptions, tips, escrow, royalties, revenue splits, or token rewards.
- Token issuance, NFT marketplace, DAO, or governance.
- AI story generation or automated legal/IP review.
- Multi-chain support or native mobile apps.
- Unbounded file uploads without moderation and storage controls.

## 11. Delivery sequence

1. Foundation: select hosting, database, authentication, and object storage; add migrations and safe environment configuration.
2. Accounts and profiles: registration, verification, sessions, roles, profile settings, signed wallet-link challenge.
3. Publishing and discovery: catalogue, work detail, creator studio, drafts, publication, permissions, versions.
4. Contributions and review: submission, contributor dashboard, creator queue, authorization, stale lifecycle.
5. Provenance: adapt the existing wallet workflow to authenticated users and expose public verification pages.
6. Hardening: cross-account tests, input validation, abuse controls, privacy review, browser E2E, deployment checks.
7. Demo and application: only after acceptance criteria pass, record the complete user journey and a meaningful failure path.

## 12. Truthful implementation status

- **MAINNET:** provenance contract is deployed on Soneium Mainnet.
- **MAINNET:** one user-approved story registration, contribution registration, and creator decision sequence exists; test content was placeholder text.
- **LOCAL:** current browser prototype implements the workflow using local browser storage and simulated display labels.
- **INDEPENDENTLY REPRODUCED (single RPC):** the exported evidence bundle was checked against contract storage, receipts, and event history through the recorded snapshot. This is not a third-party audit.
- **PLANNED:** server-backed accounts, profiles, roles, database, catalogue, Creator Studio, contributor dashboard, and public provenance pages.
- **NOT IMPLEMENTED:** production authentication, server-side persistence, legal IP ownership verification, enforceable licensing, payments, rewards, or a creator marketplace.

This specification expands the product experience while preserving the core: creator-controlled participation and verifiable provenance. It does not authorize contract changes, Mainnet transactions, or speculative commercial features.
