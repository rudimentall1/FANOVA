# FANOVA Contract Security Review

**Date:** 2026-10-29  
**Scope:** `contracts/src/FanovaProvenance.sol` and Foundry tests.  
**Status:** Engineering review only. The contract is deployed on Soneium Mainnet, but this document is not an independent audit. Deployment does not imply a security audit or full source-metadata equivalence.

## Contract boundary

The contract records story versions, source and permission hashes, contribution hashes, contributor addresses, and one creator-authorized final decision. It does not store content, transfer value, make external calls, or include an owner, proxy, upgrade function, token, or dependency import.

## Manual review

| Area | Current evidence | Remaining limitation |
|---|---|---|
| Creator binding | Story ID derives from creator address and creator-selected salt; subsequent versions require same creator and salt | Does not establish legal ownership or prevent false claims about the content |
| Version integrity | Source versions are sequential; submissions must match the latest source and exact permission hash/version | A new source version intentionally makes pending submissions against old versions undecidable; UI must explain this |
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

## Deployment blockers

1. Obtain and review the completed Slither output; triage every finding rather than hiding it with blanket suppressions.
2. The first read-only estimate is recorded in [run 40900185493](https://github.com/rudimentall1/FANOVA/actions/runs/40900185493): `eth_estimateGas` returned 998,201 gas at 13,000,000 wei per gas, implying 0.000012976613 ETH in execution fee at 2026-10-29 15:18 UTC. This is not a total-fee guarantee; the estimate explicitly excludes a separately measured OP Stack L1 data fee. Re-run before deployment and complete the L1 fee estimate.
3. Add a deployment manifest containing chain ID, compiler version, optimizer settings, constructor arguments, artifact hashes, expected runtime bytecode, and independent verification commands.
4. Complete the wallet/browser adapter and handle chain mismatch, disconnected wallet, rejected prompt, RPC failure, failed transaction, and transaction/event verification before a public end-to-end claim.
5. Mainnet deployment has already occurred. Do not redeploy or initiate a transaction from the assistant; any real-value transaction must be initiated by the user through their wallet with clear intent and cost visibility.

## Gas evidence

The read-only estimate [40900185493](https://github.com/rudimentall1/FANOVA/actions/runs/40900185493) checked chain ID 1868 and estimated contract creation at 998,201 gas. At the observed 13,000,000 wei/gas, the execution component was 12,976,613,000,000 wei (0.000012976613 ETH). The script saved a [downloadable CI artifact](https://github.com/rudimentall1/FANOVA/actions/runs/40900185493/artifacts/12909235868). It did not broadcast a transaction or use a private key. This is time-sensitive and excludes a separately measured L1 data fee.

The same run's local Foundry gas report recorded test-context ranges: `registerStoryVersion` 26,020–160,950 gas, `registerContribution` 26,370–195,724 gas, and `decideContribution` 24,680–71,765 gas. These measurements depend on test state and are not guaranteed production transaction costs.

## Current status

- Contract and 20 tests: **LOCAL**, CI-passing.
- Slither 0.11.4: **PASS**, 100 detectors, zero results in [run 40899723269](https://github.com/rudimentall1/FANOVA/actions/runs/40899723269).
- Mainnet deployment: **MAINNET**, deployed at `0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880`; full metadata equivalence is not established.
- Browser wallet integration and end-to-end Mainnet transaction proof: **PLANNED**.
- Independent security audit: **NOT PERFORMED**.
