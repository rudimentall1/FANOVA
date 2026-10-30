# FANOVA Contract Security Review

**Date:** 2026-10-30  
**Scope:** `contracts/src/FanovaProvenance.sol` and Foundry tests.  
**Status:** Engineering review only. The contract is deployed on Soneium Mainnet, but this document is not an independent audit. Deployment does not imply a security audit or full source-metadata equivalence.

## Contract boundary

The contract records story versions, source and permission hashes, contribution hashes, contributor addresses, and one creator-authorized final decision. It does not store content, transfer value, make external calls, or include an owner, proxy, upgrade function, token, or dependency import.

## Manual review

| Area | Current evidence | Remaining limitation |
|---|---|---|
| Creator binding | Story ID derives from creator address and creator-selected salt; subsequent versions require same creator and salt | Does not establish legal ownership or prevent false claims about the content |
| Version integrity | Source versions are sequential; submissions must match the latest source and exact permission hash/version; creator decisions against stale source versions revert | A newer source version makes older pending submissions ineligible for a decision. The contract retains historical records, but the UI still needs an explicit `STALE` state and historical review presentation |
| Permission acknowledgement | Submission requires an explicit boolean and emits it with the contribution event | Records the caller's assertion only; does not prove informed or legally valid consent |
| Decision authorization | Only the registered creator can decide; decision is final | No appeal, correction, delegation, or dispute process exists in MVP |
| Replay/duplicates | Story and contribution IDs are checked; duplicate contribution IDs are rejected | The client must generate stable, collision-resistant IDs and retain the referenced bytes offchain |
| External-call/reentrancy surface | Current contract has no external calls and no value transfer | Reassess if external integrations are introduced |
| Upgrade/admin surface | Contract has no owner or upgrade path | A deployed instance is immutable; bugs require a new deployment and a migration plan |
| Content integrity | Hashes are stored and emitted | Verifiers need access to the exact content and permission bytes to recompute hashes |
| Privacy | Text and personal data are not stored by the contract | Addresses, hashes, links, and event timing are public and can still be identifying |
| Cost | Current CI reports runtime bytecode 4,329 bytes and initcode 4,357 bytes; local gas report and a read-only Mainnet deployment estimate are available | The RPC estimate excludes a separately measured OP Stack L1 data fee and can change with gas price |

## Automated tests

GitHub Actions run [40899723650](https://github.com/rudimentall1/FANOVA/actions/runs/40899723650) passed 20 Foundry tests (13 baseline tests and 7 edge-case tests), with zero failures. Solidity 0.8.27 compiled successfully. After extracting version-validation logic into an internal helper, runtime bytecode is 4,329 bytes and initcode is 4,357 bytes.

Slither 0.11.4 completed successfully in [run 40899723269](https://github.com/rudimentall1/FANOVA/actions/runs/40899723269): 1 contract analyzed with 100 detectors and 0 results. The earlier run reported cyclomatic complexity 14 for `registerStoryVersion`; that logic was split into a helper, and the succeeding scan reported zero results. This is static-analysis evidence, not an independent audit.

## Dependency review

The contract source currently imports no third-party Solidity library. Foundry and the compiler are development dependencies, not contract runtime dependencies. This reduces dependency surface but does not replace static analysis, compiler review, or an independent audit.

## Post-deployment findings and remaining gaps (2026-10-30)

1. **Source metadata:** Blockscout reports a partial source match. CI found matching executable runtime bytecode after removing Solidity metadata, but full runtime metadata equivalence is not established. Do not describe the source as fully verified.
2. **Mainnet workflow:** one user-approved Story registration, Contribution registration, and Creator decision sequence completed successfully on Soneium Mainnet on 2026-10-30. Transaction hashes, blocks, and wallet roles are recorded in `docs/DEMO_AND_EVIDENCE.md`. This is one smoke test with placeholder content, not a creator pilot.
3. **Project verifier:** the exported bundle from that sequence was checked by FANOVA's read-only verifier, which returned `VERIFIED` for the included story, contribution, and decision records. The verifier does not yet scan all contract events from deployment to a fixed block, so it cannot detect an omitted contribution that is absent from the bundle. This is a material completeness limitation, not an independent audit.
4. **Wallet exercise:** one creator/fan/creator account sequence is evidenced. Broader testing of account changes, chain mismatch, rejected prompts, pending/reverted transactions, and interrupted sessions remains open. Never retry a submitted transaction blindly.
5. **Demo identity boundary:** the local role switch and display names are simulated. They are not authenticated identities and are not cryptographically bound to a wallet. For onchain attribution, the signer address stored by the contract is authoritative. Production authentication and server-side identity mapping are out of scope for this MVP.
6. **Deployment:** do not redeploy the contract. Any further Mainnet write must be initiated and approved by the user through Rabby; the wallet displays the transaction and fee before signing.

## Gas evidence

The read-only estimate [40900185493](https://github.com/rudimentall1/FANOVA/actions/runs/40900185493) checked chain ID 1868 and estimated contract creation at 998,201 gas. At the observed 13,000,000 wei/gas, the execution component was 12,976,613,000,000 wei (0.000012976613 ETH). The script saved a [downloadable CI artifact](https://github.com/rudimentall1/FANOVA/actions/runs/40900185493/artifacts/12909235868). It did not broadcast a transaction or use a private key. This is time-sensitive and excludes a separately measured L1 data fee.

The same run's local Foundry gas report recorded test-context ranges: `registerStoryVersion` 26,020–160,950 gas, `registerContribution` 26,370–195,724 gas, and `decideContribution` 24,680–71,765 gas. These measurements depend on test state and are not guaranteed production transaction costs.

## Current status

- Contract and 20 tests: **LOCAL**, CI-passing.
- Slither 0.11.4: **PASS**, 100 detectors, zero results in [run 40899723269](https://github.com/rudimentall1/FANOVA/actions/runs/40899723269).
- Mainnet deployment: **MAINNET**, deployed at `0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880`; full metadata equivalence is not established.
- Browser wallet write integration: **LOCAL implementation; MAINNET smoke-test sequence demonstrated once** (see `docs/DEMO_AND_EVIDENCE.md`).
- Mainnet story → contribution → creator-decision proof: **MAINNET**, one user-approved sequence; not a creator pilot.
- Evidence bundle completeness against the full onchain event history: **NOT YET VERIFIED**.
- Historical `STALE` presentation in the browser UI: **NOT IMPLEMENTED**.
- Independent security audit: **NOT PERFORMED**.
