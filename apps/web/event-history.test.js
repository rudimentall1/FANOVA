import test from "node:test";
import assert from "node:assert/strict";
import { scanStoryEventHistory } from "./event-history.js";

const topics = {
  StoryVersionRegistered: "0xstory",
  ContributionRegistered: "0xcontribution",
  ContributionDecided: "0xdecision"
};
const storyId = "0x" + "ab".repeat(32);

function fakeIface() {
  return {
    getEvent(name) { return { topicHash: topics[name] }; },
    parseLog(log) { return { args: log.args }; }
  };
}

test("scans all three event types in bounded block chunks", async () => {
  const calls = [];
  const provider = {
    async getLogs(filter) {
      calls.push(filter);
      return [{
        args: { eventTopic: filter.topics[0] },
        transactionHash: "0x" + "11".repeat(32),
        blockNumber: filter.fromBlock
      }];
    }
  };
  const result = await scanStoryEventHistory({
    provider, iface: fakeIface(), contractAddress: "0xcontract", storyId,
    fromBlock: 100, toBlock: 250, chunkSize: 100
  });
  assert.equal(calls.length, 6);
  assert.deepEqual(calls.map(call => [call.fromBlock, call.toBlock]), [
    [100, 199], [100, 199], [100, 199],
    [200, 250], [200, 250], [200, 250]
  ]);
  assert.equal(result.storyVersionEvents.length, 2);
  assert.equal(result.contributionEvents.length, 2);
  assert.equal(result.decisionEvents.length, 2);
  assert.ok(calls.every(call => call.address === "0xcontract"));
  assert.ok(calls.every(call => call.topics[call.topics.length - 1] === storyId));
});

test("rejects invalid block ranges and chunk sizes", async () => {
  const base = { provider: { getLogs: async () => [] }, iface: fakeIface(), contractAddress: "0xcontract", storyId };
  await assert.rejects(scanStoryEventHistory({ ...base, fromBlock: 20, toBlock: 10 }), /Invalid event history block range/);
  await assert.rejects(scanStoryEventHistory({ ...base, fromBlock: 1, toBlock: 10, chunkSize: 0 }), /positive integer/);
});
