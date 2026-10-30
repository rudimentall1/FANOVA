# FANOVA — Canonical Project Skeleton

**Status:** LOCKED BASELINE v1.2  
**Product line:** Fans don't just follow stories. They help shape them.  
**Target:** Sony Onchain Entertainment Incubation Program  
**Delivery constraint:** approximately one month for a credible application and working MVP.

This is the project contract. Every request and coding session must read this file and `AGENTS.md` before implementation. No silent scope changes.

## 1. Product
FANOVA is a creator-controlled collaborative IP product for story-based communities. It lets a creator publish an original story with explicit permitted-use rules, receive fan-created derivative contributions, approve or reject them, and preserve verifiable provenance between the source version, contributor address, and creator decision on Soneium.

FANOVA is the product and workflow layer, not a replacement IP registry, IP graph, or general-purpose licensing protocol. It should use suitable Soneium-native IP and licensing primitives if and when their deployed interfaces and behavior are verified. No such integration is claimed today.

The market-demand hypothesis is not yet validated. The MVP targets one creator and one original story, not a general-purpose platform.

## 2. Users
- **Creator/IP owner or authorized licensee:** publishes a source story, defines permissions, reviews contributions, approves/rejects.
- **Fan contributor:** submits work under stated rules and sees the review result and attribution.
- **Public evaluator:** can inspect the workflow and verify onchain records.

## 3. Locked MVP workflow
1. Creator publishes an original story and versioned permission statement.
2. Fan submits a contribution linked to that exact source version and acknowledges permissions.
3. Creator reviews and approves or rejects the contribution.
4. UI displays decision, attribution, source relationship, and evidence status.
5. A minimal provenance anchor may be recorded on **Soneium Mainnet** after the local workflow, contract tests, security checks, and deployment plan are ready.
6. Demonstrate a meaningful failure, such as missing permission acknowledgement or an unauthorized approval attempt.
7. Payment splits are out of scope unless a concrete, approved requirement emerges. Do not describe them as live unless a real transaction proves it.

## 4. Evidence and acceptance criteria
- Public repository with reproducible setup and tests.
- Working local end-to-end workflow.
- Only the authorized creator can approve/reject; unauthorized attempts fail.
- Source-version linkage, attribution, permissions, and decision state are understandable.
- If a contract is included in the demo, its deployment and relevant mainnet event/transaction must be independently inspectable. Deployment requires explicit user approval.
- Demo clearly distinguishes local, mocked, and mainnet behavior.
- Use original pilot material or documented permission; a wallet address/hash does not prove legal IP ownership.
- At least one real creator/authorized IP participant in the pilot, or an honest statement that validation is pending.
- No secrets in the repository and no claims of Sony endorsement, partnership, or selection without evidence.

## 5. Non-goals
No public marketplace, open token trading, DAO, multi-chain support, general AI generation suite, mobile app, automated legal rights verification, automatic royalties across external platforms, large social graph, or custody of meaningful funds. A custom token is not a default MVP feature.

## 6. Token policy
Soneium can host standard EVM tokens, but technical deployability is not product utility. Native gas is ETH; a FANOVA token would be a separate asset with distinct security, legal, distribution, liquidity, and utility implications.

Maintain a token concept only if the actual application requirement and creator/fan economics justify it. Define utility, distribution, supply, admin rights, abuse resistance, legal questions, and why a token is better than ordinary payments or non-transferable records. No deployment or promotion of a tradable token without explicit user approval.

## 7. Soneium strategy
- **Target network: Soneium Mainnet.**
- Chain ID: `1868`; RPC: `https://rpc.soneium.org/`; explorer: `https://soneium.blockscout.com/`.
- Native gas asset: ETH.
- Minato (chain ID `1946`) is optional for risk-reducing pre-deployment checks only. It is not the target network or a required milestone.
- Recheck official network configuration before deployment.
- Mainnet-first does not mean deploy before local tests and security review. Any mainnet deployment or transaction spending real funds requires explicit user approval.

## 8. Architecture boundaries
- Web experience for creator and fan flows.
- Domain rules for permissions, source/contribution relationships, authorization, and state transitions.
- Content and metadata offchain by default; do not put full story text or personal data onchain.
- Minimal contract for hashes/identifiers, authorization, and durable decision/provenance events only where they establish a specific verifiable claim.
- Explicit Mainnet chain-ID checks and honest evidence labels.
- Keep the contract design subordinate to the user workflow and proof requirement.

## 9. Priority order
- **P0:** map application questions to evidence, lock scope, review competitors and token-plan requirement.
- **P1:** implement and test local story → submission → approval workflow.
- **P2:** implement and verify minimal Soneium Mainnet provenance after local gates and explicit deployment approval.
- **P3:** run a permissioned creator/fan pilot and record honest findings.
- **P4:** prepare reproducible demo and evidence-backed Sony application.
- **P5:** consider a token only if requirements, utility, and economics justify it.

## 10. Product boundary and future direction

**Implemented foundation:** story/version registration, contribution registration, creator decision, and a read-only verifier that scans the contract event history for a story and reconciles discovered events with the exported bundle. The scanner and comparison logic pass CI; live Mainnet validation of the new scan remains pending.

**Future direction, not current functionality:** creative campaigns, structured derivative licensing, commercial use, and contributor revenue participation under explicit terms and a real payment mechanism. These capabilities require separate product, legal, and technical decisions.

FANOVA does not currently provide legal IP ownership verification, enforceable licensing, authenticated multi-user accounts, server-backed persistence, token issuance, or revenue distribution. A display name is not proof of wallet identity; the onchain contributor/reviewer addresses are the authoritative identities for contract actions.

## 11. Change control
Change this baseline only when a concrete requirement/blocker is identified, the trade-off is recorded in `docs/DECISIONS.md`, related architecture/roadmap text is updated, and the user explicitly approves.

**Rule:** if a task does not advance P0–P4, it is not MVP work unless a plan change is explicitly approved.

## 12. Multi-user product expansion (ADR-017)

The original single-creator vertical slice remains the core workflow, but it is no longer the intended final web experience. The target MVP is a real multi-user web product with:
- Public landing page, Discover catalogue, work detail pages, creator profiles, and provenance pages.
- Email/password account registration and login through a maintained authentication solution, email verification, secure sessions, and account recovery.
- Contributor dashboard and profile.
- Creator Studio for work creation, drafts, publication, permission/version management, and contribution review.
- Server-side persistence and server-enforced role/ownership permissions.
- Signed wallet linking for onchain actions, kept separate from account authentication.
- Existing Soneium provenance contract and read-only evidence verifier.

The full site map, data model, security controls, user journeys, and MVP acceptance criteria are defined in [WEB_PRODUCT_SPEC.md](WEB_PRODUCT_SPEC.md). That specification is canonical for web product scope and supersedes the earlier assumption that the final MVP is only a one-story local browser prototype.

The expansion does not authorize a broad social network, comments, messaging, payments, royalties, token, NFT marketplace, DAO, AI generation, multi-chain support, contract changes, or Mainnet transactions. The local browser prototype remains a development fallback until server-backed persistence and account authorization are implemented.

**Final demo gate:** do not record the final demo until the multi-user MVP acceptance criteria in WEB_PRODUCT_SPEC.md pass, including cross-account authorization tests and a full contributor-to-creator-to-provenance journey.

