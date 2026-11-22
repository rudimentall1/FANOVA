# FANOVA Repository Audit — 2026-11-22

## Executive summary

Scope: review of open PR #39 (wallet unlink/replace), open PR #40 (public provenance evidence), and the directly related provenance schema, submit verifiers, and public pages. This is a source-level engineering review of the inspected paths, not a full-repository penetration test, independent smart-contract audit, or production-data audit.

**Verdict: Request changes before merging PR #40. PR #39 is close, with two hardening items.** CI is green for the reviewed heads, but it does not cover the most important positive Mainnet-rendering path or the anchor-multiplicity cases below.

### Current evidence

- PR #39: OPEN · DRAFT, head `3c4f920a59f6720394fa6b4f17af3cf90f58fe95`.
- CI #391 for PR #39: SUCCESS — [run 391](https://github.com/rudimentall1/FANOVA/actions/runs/43413451554).
- PR #40: OPEN · DRAFT, head `526c14aa0529d7c4ea5bd1fa4ec43ed20fd242f0`.
- CI #397: SUCCESS — [run 397](https://github.com/rudimentall1/FANOVA/actions/runs/43417062265).
- CI #399 for the current PR #40 head: SUCCESS — [run 399](https://github.com/rudimentall1/FANOVA/actions/runs/43417622125).
- Neither PR is merged. No Mainnet write was performed during this audit.

## Findings

### F-01 — Creator-decision verification chooses arbitrary source anchors [P2 · Required]

**Files**
- `apps/platform/src/app/api/contributions/[id]/decision/provenance/submit/route.ts`
- `apps/platform/src/db/schema/provenance.ts`

The creator-decision verifier fetches the source Story anchor and registered Contribution anchor with `limit(1)`, without ordering or cardinality checks. The schema permits multiple rows for the same `(operationType, workVersionId)` or `(operationType, contributionId)`. In contrast, the contribution verifier explicitly requires exactly one source Story anchor.

This makes the three-step verifier inconsistent. If retries or duplicate intents exist, the decision verifier can select an arbitrary historical/failed row and reject a valid journey, or select a different row on different executions. It also makes the result depend on database row order.

**Required fix**
- Define the canonical-anchor policy (one immutable intent per entity/operation, or explicit attempt history plus a canonical verified pointer).
- Apply the same deterministic selection and validation in contribution and decision verifiers.
- Add tests for zero, one, and multiple source/contribution anchors, including a failed newer attempt alongside a valid earlier one.

### F-02 — Public pages select the newest anchor, not the canonical verified evidence [P2 · Required]

**Files**
- `apps/platform/src/app/works/[slug]/page.tsx`
- `apps/platform/src/app/works/[slug]/contributions/[id]/page.tsx`

Both public views order anchors by `createdAt DESC` and take the newest row. The Story page also loads every anchor for up to 20 public contributions, with no per-entity limit. A later failed/pending retry can therefore hide an earlier verified anchor in the public UI. On the Story page, repeated attempts can also make the query return an unbounded number of rows.

**Required fix**
- Reuse the canonical-anchor policy from F-01.
- Preserve attempt history, but render the canonical/current state explicitly rather than whichever row happens to be newest.
- Bound the read query (or use a database-side ranked query returning at most one selected row per entity/operation).

### F-03 — Public VERIFIED predicate does not enforce the full operation-specific evidence shape [P2 · Required]

**File**
- `apps/platform/src/components/provenance/public-anchor-evidence.tsx`

The component requires at least one expected hash key and checks that every key present in `expectedHashes` equals the corresponding `observedHashes` value. It does not require the expected key set for each operation type (Story version: source + permission; Contribution: source + permission + contribution; Creator decision: source + permission + contribution + reason code). It also does not bind those expected hashes to the corresponding authoritative hash columns/page data. Thus the display gate is weaker than the evidence contract described by the verifier.

The submit routes currently construct fuller snapshots after matching the decoded event, so this is a defense-in-depth and regression-resistance gap rather than proof that an existing production row is falsely green.

**Required fix**
- Make the operation type explicit in the component input and validate an exact required hash-key set.
- Compare expected hashes to the anchor's persisted hash columns and, where available, the entity's current persisted hashes.
- Include the expected signer and entity identity in the public predicate, not only the observed values' equality to stored expected values.
- Add one positive fully verified fixture and negative fixtures for each omitted/mismatched field.

### F-04 — Unlink challenge creation permits unbounded persistent challenge rows [P2 · Hardening]

**Files**
- `apps/platform/src/app/api/wallet/unlink/challenge/route.ts`
- `apps/platform/src/db/schema/wallet.ts`

Every authenticated POST inserts a new challenge row. The five-minute expiry is checked when a challenge is consumed, but the inspected route/schema contain no cleanup of expired or consumed challenges and no per-user/session rate limit or active-challenge cap. Rows remain until the linked wallet or session is deleted. An authenticated account can therefore grow this table indefinitely by repeatedly requesting challenges.

**Recommended fix**
- Enforce a small per-session active-challenge limit or invalidate previous active challenges transactionally.
- Delete expired/consumed rows opportunistically and add a scheduled retention cleanup.
- Add a regression test for repeated challenge creation and cleanup/retention behavior.

### F-05 — Unlink request body limit is checked after buffering [P3 · Hardening]

**File**
- `apps/platform/src/app/api/wallet/unlink/route.ts`

The handler calls `await request.text()` before checking the 12 KB limit. This rejects oversized requests after the entire body has already been buffered, so the limit does not protect memory allocation at the read boundary.

**Recommended fix**
- Reject an excessive `Content-Length` when present and use a bounded stream reader for the actual byte limit (the header alone is not authoritative).
- Keep the JSON parsing and schema validation after the bounded read.

## Positive observations

- PR #39 binds the unlink challenge to authenticated user, session, wallet row, chain, and exact stored message; requires a fresh signature from the currently linked address; and consumes the challenge plus deletes the wallet in one database transaction.
- The unlink path does not send an onchain transaction or handle private keys.
- Wallet unlink tests cover exact-message acceptance, wrong address, changed purpose, expiry, consumed state, and wrong chain; multi-account browser E2E exercises wallet A/B, cross-account reuse rejection, replay rejection, and replacement.
- PR #40's submit verifiers check Soneium chain ID, transaction sender/destination, calldata, and matching contract event before persisting a successful snapshot.
- The public contribution page only renders approved, public contributions; it does not expose pending/rejected contribution content through this route.
- Persisted anchor rows have a fixed chain-ID check and unique transaction/log identity; the schema also enforces the work-version-vs-contribution entity shape.

## Coverage gaps / not established

- The current PR #40 E2E exercises LOCAL / NOT ANCHORED public rendering. It does not prove the positive `MAINNET · VERIFIED` branch or all fail-closed conditions.
- No read-only production database check was available in this audit. Real persisted Mainnet anchor rows and their rendered public pages remain unverified.
- No full application-wide security scan, dependency vulnerability audit, external penetration test, or independent contract audit was performed.
- CI success demonstrates the listed automated checks, not production correctness or independent security certification.

## Recommended order of work

1. Resolve F-01 and F-02 together by defining a single canonical-anchor model and regression tests.
2. Strengthen F-03 and add positive/negative public-evidence tests.
3. Harden F-04 and F-05 in the wallet unlink slice.
4. Re-run CI on the exact resulting heads; then perform a read-only production anchor inspection.
5. Keep PR #39 and #40 Draft until review and the full authenticated creator → contributor → creator-decision acceptance path are complete.

## Merge recommendation

- **PR #39:** no critical flaw identified in the inspected signature/transaction flow. Keep Draft until challenge retention/rate limiting and bounded body reading are addressed or explicitly accepted as follow-up risks.
- **PR #40:** **do not merge yet**. F-01–F-03 affect determinism and the trustworthiness of public provenance status.
- **P1.6:** remains OPEN. CI green is not sufficient to close it.
