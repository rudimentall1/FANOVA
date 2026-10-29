# FANOVA — Canonical Project Skeleton

**Status:** LOCKED BASELINE v1.1  
**Product line:** Fans don't just follow stories. They help shape them.  
**Target:** Sony Onchain Entertainment Incubation Program  
**Delivery constraint:** approximately one month for a credible application and working MVP.

This is the project contract. Every request and coding session must read this file and `AGENTS.md` before implementation. No silent scope changes.

## 1. Product
FANOVA lets a creator publish an original story with explicit permitted-use rules, receive fan-created derivative submissions, approve or reject them, and preserve verifiable provenance between the source story and approved contributions.

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

## 10. Change control
Change this baseline only when a concrete requirement/blocker is identified, the trade-off is recorded in `docs/DECISIONS.md`, related architecture/roadmap text is updated, and the user explicitly approves.

**Rule:** if a task does not advance P0–P4, it is not MVP work unless a plan change is explicitly approved.
