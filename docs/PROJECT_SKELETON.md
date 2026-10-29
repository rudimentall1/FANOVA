# FANOVA — Canonical Project Skeleton

**Status:** LOCKED BASELINE v1.0  
**Product line:** Fans don't just follow stories. They help shape them.  
**Target:** Sony Onchain Entertainment Incubation Program  
**Delivery constraint:** approximately one month to produce a credible application and a working MVP.

This document is the project contract. Every request, coding session, and new chat must read it before implementation. No silent scope changes.

## 1. Product in one sentence
FANOVA lets a creator publish an original story with explicit permitted-use rules, receive fan-created derivative submissions, approve or reject them, and preserve verifiable provenance between the source story and approved contributions.

## 2. User problem
Creators may want fans to participate in their fictional worlds but need a manageable way to set permissions, review contributions, preserve attribution, and—where a real commercial transaction exists—honor agreed compensation terms. Fans need a clear, understandable way to contribute without guessing what is allowed or whether their work has been accepted.

This is a product hypothesis, not yet validated market demand.

## 3. Primary users
- **Creator/IP owner or authorized licensee:** publishes a source story, defines permissions, reviews fan work, and approves or rejects it.
- **Fan contributor:** reads the source, submits a derivative contribution under the stated rules, and sees the review result and attribution.
- **Public evaluator:** can inspect the workflow and verify onchain records without trusting screenshots alone.

The MVP targets one creator and one original story first. It is not a general-purpose platform.

## 4. Locked MVP workflow
1. Creator publishes one original story and a versioned permission statement.
2. Fan reads the story and submits a contribution referencing that source version.
3. Creator reviews the contribution and approves or rejects it.
4. The UI displays the decision, attribution, source relationship, and current evidence status.
5. The system records a minimal verifiable onchain anchor for the source/submission/decision on Soneium Minato, once the local workflow is stable.
6. Demonstrate one meaningful failure case (for example, a submission missing required permission acknowledgement or a non-creator attempting to approve).
7. If a real payment split is implemented within scope, prove it with a real testnet transaction and explicit terms. Otherwise document revenue splitting as planned, not live.

## 5. Core proof required
- A public repository with reproducible setup and tests.
- A working local end-to-end workflow.
- A deployed minimal contract on Soneium Minato with verified address/source and test evidence, if the contract is included in the demo.
- An independently inspectable transaction or event for the demonstrated onchain action.
- A demo that clearly distinguishes local/mock/testnet/mainnet behavior.
- At least one real creator or authorized IP participant involved in the pilot, or an honest statement that this validation is still pending.
- No claim that Sony endorses, partners with, or has selected FANOVA.

## 6. Explicit non-goals for the one-month MVP
- Public marketplace or open token trading.
- DAO/governance system.
- Multi-chain support.
- General AI story/video/image generation platform.
- Mobile app.
- Automated legal rights verification.
- Automatic royalty collection across external platforms.
- Mainnet launch or custody of meaningful funds.
- Large-scale social graph, chat, likes/followers, or recommendation engine.
- Custom token deployment unless the application requirements and product economics establish a specific need and the user explicitly approves deployment.

## 7. Token policy
Soneium is an EVM-compatible network and can host standard token contracts. That does not mean FANOVA should deploy a token immediately. Native gas is ETH; a FANOVA token would be a separate asset with separate design, security, legal, liquidity, and user-utility implications.

Maintain a **token concept and utility/economic rationale** as an application workstream if the official application asks for it. Do not deploy or promote a tradable token during the MVP by default. First prove the creator/fan workflow. Any token decision must define utility, distribution, supply, control/admin rights, abuse resistance, regulatory questions, and why a token is better than ordinary payments or non-transferable access records. Deployment requires explicit user approval.

## 8. Soneium strategy
- Development/demo network: **Soneium Minato testnet**, chain ID 1946.
- RPC: `https://rpc.minato.soneium.org/`
- Explorer: `https://soneium-minato.blockscout.com/`
- Mainnet chain ID 1868, RPC `https://rpc.soneium.org/`, explorer `https://soneium.blockscout.com/`.
- Use testnet first. Mainnet is out of scope for the one-month MVP unless separately justified and explicitly approved.
- Re-check official Soneium docs before deployment; never rely solely on copied configuration.

## 9. Architecture boundaries
- Web experience: creator and fan flows.
- Domain layer: permission rules, source/contribution relationships, approval state, validation.
- Storage/indexing: offchain content and metadata; do not put full story content or personal data onchain by default.
- Contracts: minimal event/attestation or registry surface for durable provenance and authorized decisions. Contract design must follow a specific proof requirement, not lead product design.
- Chain adapter: explicit Soneium Minato configuration and chain-id checks.
- Evidence: deployment manifest, test output, transaction links, demo script, limitations.

## 10. Locked acceptance criteria
MVP is not complete until:
- [ ] Creator can publish a story with explicit permissions.
- [ ] Fan can submit a contribution linked to the exact source version.
- [ ] Only the authorized creator can approve/reject.
- [ ] A denied/invalid action is visibly rejected and tested.
- [ ] Attribution and decision state are understandable in the UI.
- [ ] If onchain anchoring is claimed, the event/transaction is independently inspectable on Minato.
- [ ] No secret is committed and no real third-party IP is used without permission.
- [ ] Setup and tests are reproducible by someone other than the author.
- [ ] Demo and application state precisely what is live, local, mocked, or planned.

## 11. Change control
The skeleton changes only when:
1. A concrete blocker or new requirement is identified.
2. The proposed change and trade-off are written into `docs/DECISIONS.md`.
3. The relevant scope/architecture/roadmap text is updated in the same change.
4. The user explicitly approves the change.

## 12. Priority order
P0 — lock scope and answer application questions with evidence requirements.  
P1 — build and test local story → submission → approval workflow.  
P2 — add minimal Soneium Minato provenance proof.  
P3 — validate with a real creator/fan pilot and capture honest metrics.  
P4 — prepare reproducible demo and Sony application.  
P5 — consider token only if requirements, utility, and economics justify it.

**Rule:** if a task does not advance P0–P4, it is not MVP work unless explicitly approved as a plan change.
