import assert from "node:assert/strict";
import { test } from "node:test";
import { confirmWalletTransaction } from "./transaction-lifecycle.js";

const HASH = "0x" + "a".repeat(64);

test("persists a submitted transaction hash before waiting for its receipt", async () => {
  const events = [];
  const result = await confirmWalletTransaction({
    hash: HASH,
    async wait() {
      events.push("wait");
      return { status: 1, blockNumber: 123 };
    }
  }, {
    onSubmitted(hash) { events.push(`saved:${hash}`); },
    onPending(hash) { events.push(`pending:${hash}`); }
  });

  assert.deepEqual(events, [`saved:${HASH}`, `pending:${HASH}`, "wait"]);
  assert.deepEqual(result, { hash: HASH, blockNumber: 123 });
});

test("a reverted transaction retains its hash in the error", async () => {
  let savedHash;
  await assert.rejects(
    confirmWalletTransaction({
      hash: HASH,
      async wait() { return { status: 0, blockNumber: 124 }; }
    }, {
      onSubmitted(hash) { savedHash = hash; }
    }),
    new RegExp(HASH)
  );
  assert.equal(savedHash, HASH);
});

test("reports the hash if local recovery metadata cannot be saved", async () => {
  let waited = false;
  await assert.rejects(
    confirmWalletTransaction({
      hash: HASH,
      async wait() { waited = true; return { status: 1, blockNumber: 125 }; }
    }, {
      onSubmitted() { throw new Error("quota exceeded"); }
    }),
    new RegExp(`Transaction ${HASH} was submitted.*quota exceeded`)
  );
  assert.equal(waited, false);
});
