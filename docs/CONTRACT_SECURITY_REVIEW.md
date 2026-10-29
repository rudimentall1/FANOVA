# FANOVA Contract Security Review

**Date:** 2026-10-29  
**Scope:** `contracts/src/FanovaProvenance.sol` and Foundry tests.  
**Status:** Local engineering review only. This is not an independent audit and does not authorize deployment.

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
| Cost | CI reports runtime bytecode 4,306 bytes and initcode 4,334 bytes | Transaction gas and real deployment cost have not yet been estimated for Soneium Mainnet |

## Automated tests

GitHub Actions run [40899723650](https://github.com/rudimentall1/FANOVA/actions/runs/40899723650) passed 20 Foundry tests (13 baseline tests and 7 edge-case tests), with zero failures. Solidity 0.8.27 compiled successfully. After extracting version-validation logic into an internal helper, runtime bytecode is 4,329 bytes and initcode is 4,357 bytes.

Slither 0.11.4 completed successfully in [run 40899723269](https://github.com/rudimentall1/FANOVA/actions/runs/40899723269): 1 contract analyzed with 100 detectors and 0 results. The earlier run reported cyclomatic complexity 14 for `registerStoryVersion`; that logic was split into a helper, and the succeeding scan reported zero results. This is static-analysis evidence, not an independent audit.

## Dependency review

The contract source currently imports no third-party Solidity library. Foundry and the compiler are development dependencies, not contract runtime dependencies. This reduces dependency surface but does not replace static analysis, compiler review, or an independent audit.

## Deployment blockers

1. Obtain and review the completed Slither output; triage every finding rather than hiding it with blanket suppressions.
2. Estimate deployment and representative transaction gas against Soneium Mainnet using a reproducible local fork or other verifiable method, then record assumptions and timestamp.
3. Add a deployment manifest containing chain ID, compiler version, optimizer settings, constructor arguments, artifact hashes, expected runtime bytecode, and independent verification commands.
4. Complete the browser adapter and its chain mismatch, disconnected wallet, rejected prompt, RPC failure, and failed transaction handling before a public end-to-end claim.
5. Obtain explicit user approval before any Mainnet deployment or real-value transaction.

## Current status

- Contract and 20 tests: **LOCAL**, CI-passing.
- Slither: **PENDING** until the linked workflow reports a completed result.
- Mainnet deployment: **PLANNED**, not authorized.
- Independent security audit: **NOT PERFORMED**.
