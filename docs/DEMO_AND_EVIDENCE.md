# Demo and Evidence Protocol

## Soneium Mainnet workflow evidence (2026-10-30)

**Capability status:** `MAINNET`. One user-approved Story registration, Contribution registration, and Creator decision sequence was executed on Soneium Mainnet. FANOVA's read-only evidence-bundle verifier returned **`VERIFIED`** for the exported JSON bundle.

This records the result of the project's own repeatable verifier. It is not a third-party audit, independent security review, legal opinion, or external certification.

### Network and contract

| Item | Value |
|---|---|
| Network | Soneium Mainnet |
| Chain ID | `1868` |
| Contract | `FanovaProvenance` |
| Contract address | `0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880` |
| Explorer | [Contract on Blockscout](https://soneium.blockscout.com/address/0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880) |

### Confirmed transactions

| Step | Method | Block | Result | Transaction |
|---|---|---:|---|---|
| Story registration | `registerStoryVersion` | `30105304` | Success | [`0xeabf1bbe…f2f07f55`](https://soneium.blockscout.com/tx/0xeabf1bbeffee5405c4e8b81586dde14f9bea2154fa798d5d76ce5ab8f2f07f55) |
| Contribution registration | `registerContribution` | `30105412` | Success | [`0x46d61b5e…84a1d4df`](https://soneium.blockscout.com/tx/0x46d61b5e9cb33bb961ee12623760d59e4f237b0b33389be51fa8bd1b84a1d4df) |
| Creator decision | `decideContribution` | `30105502` | Success | [`0xf3b026b9…c1a1ab98`](https://soneium.blockscout.com/tx/0xf3b026b983f5e7c07a67ed71ff150d6262364cbc3d83cf2be29a2b80c1a1ab98) |

Wallet roles observed in the transaction details:

- Creator: `0xA83744Ebb1321e21dF821759EF43F80a9df279aA`
- Fan: `0x1429906b663608DB6aDeAb8F975B47aFbbe8c68C`

### Verifier result

The exported bundle was loaded into the separate read-only verifier. It returned **`VERIFIED`** and reported these checks:

- Story content hashes recomputed and verified.
- Creator-bound Story ID verified.
- Story contract storage verified.
- `StoryVersionRegistered` receipt/event verified at block `30105304`.
- Contribution hash recomputed and verified.
- Contribution contract storage verified.
- Contribution registration event verified at block `30105412`.
- Creator decision event verified at block `30105502`.

The verifier does not request wallet access and does not send transactions. It checks the exported content/hash inputs against Soneium contract storage and the referenced transaction receipts/events.

**Verifier scope at the time of this recorded run:** the result covered the story, contribution, and decision records included in the exported bundle; the original verifier did not enumerate every contract event. A later code change adds event-history scanning and bundle reconciliation, but that new path has not yet been validated against this live bundle. The current browser success label is `HISTORY VERIFIED` only after the scan and reconciliation complete. This is not an independent audit or third-party reproduction.

### Evidence retention and demo limitations

- Retain the original exported `fanova-evidence-bundle.json`. It contains the offchain Story and Contribution text needed to recompute hashes. Do not edit the bundle after export.
- The bundle has not been committed to this repository. Share it with an evaluator only through an intentional, access-controlled channel and only when the included content may be shared.
- The current onchain smoke test used placeholder content labelled `Story title`. It proves the transaction path and verifier behavior, not a finished original-IP pilot or production content experience.
- Before recording the public-facing product demo, replace placeholder content with original material that the creator has permission to use and show meaningful permission rules.
- The verifier result is project-generated. Do not describe it as a third-party audit or claim an outside evaluator has reproduced it until that has actually happened.
- Onchain hashes, addresses, acknowledgements, and decision events do not prove legal IP ownership, copyright clearance, enforceable consent, or a valid license.

### Read-only Mainnet event-history probe (2026-10-30)

A separate read-only RPC probe was run after the event scanner was added. The Soneium public RPC rejected an eth_getLogs range larger than 1,000 blocks, so the scanner's chunk size is capped at 1,000.

| Item | Result |
|---|---|
| RPC | https://rpc.soneium.org/ |
| Chain ID | 1868 |
| Deployment transaction | 0xb2086bd26326b428f4806e9a93a202631528ec8bffe4ff59ff9f8f102cf9e34c |
| Deployment block | 30077815 |
| Story ID checked | 0x5f6e97151e2d76ad094c7af20ce86e7c5bbb86cb620b28ac19db841cbc8ebdc5 |
| Verification snapshot | Block 30112330 |
| Scan | 35 bounded ranges of at most 1,000 blocks |

The RPC returned one StoryVersionRegistered event (block 30105304), one ContributionRegistered event (block 30105412), and one ContributionDecided event (block 30105502) for that story ID. The event transaction hashes match the three workflow transactions listed above.

**Scope limitation:** this was a read-only event-history probe against one RPC provider. The original exported evidence JSON was not available during this run, so this does not establish bundle reconciliation or a HISTORY VERIFIED result. It is not an independent provider check or an audit. The corrected deployment transaction hash and 1,000-block RPC limit are now enforced by the verifier code.

---

## Required demo path
1. Show FANOVA's purpose in one sentence.
2. Show a creator publishing an original story and visible permission rules.
3. Show a fan submitting a contribution tied to the source version.
4. Show the creator approving it.
5. Show the provenance/decision record and independently inspectable Soneium Mainnet transaction, if deployed.
6. Show a meaningful failure: unauthorized reviewer or invalid permission acknowledgement is rejected.
7. State what is local, mocked, mainnet, or still planned. Minato may be mentioned only if optional testing was actually performed.

## Evidence checklist
- Git commit and reproducible setup.
- Test command and actual result.
- Contract source, compiler/configuration, deployment address, chain ID, deploy transaction.
- Verified explorer URL for the relevant event/transaction.
- Demo recording date and environment.
- Pilot permission/feedback evidence, with personal data redacted.
- Known limitations and outstanding issues.

## Truth labels
- `PLANNED`: designed but not implemented.
- `LOCAL`: implemented locally, no external deployment.
- `TESTNET`: used only to describe optional pre-deployment testing on a named testnet, with evidence.
- `MAINNET`: deployed/executed on the named mainnet, evidence available.
- `INDEPENDENTLY VERIFIED`: a third party or repeatable outsider procedure has confirmed the specific claim.

Do not use `INDEPENDENTLY VERIFIED` merely because a team member opened the explorer.

## Prohibited demo shortcuts
- Fake or hard-coded transaction hashes presented as live.
- Mocked chain state styled as real.
- Unlabelled test tokens or testnet ETH described as revenue.
- Unlicensed entertainment IP.
- Claims of Sony partnership, endorsement, or selection without official evidence.
