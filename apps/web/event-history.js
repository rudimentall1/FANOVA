export async function scanStoryEventHistory({
  provider,
  iface,
  contractAddress,
  storyId,
  fromBlock,
  toBlock,
  chunkSize = 1000
}) {
  if (!provider || !iface || !contractAddress || !storyId) throw new Error("Event history scan requires provider, interface, contract, and story ID.");
  if (!Number.isInteger(fromBlock) || !Number.isInteger(toBlock) || fromBlock < 0 || toBlock < fromBlock) {
    throw new Error("Invalid event history block range.");
  }
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new Error("Event history chunk size must be a positive integer.");
  if (chunkSize > 1000) throw new Error("Event history chunk size must not exceed the Soneium RPC limit of 1000 blocks.");

  const storyTopic = iface.getEvent("StoryVersionRegistered").topicHash;
  const contributionTopic = iface.getEvent("ContributionRegistered").topicHash;
  const decisionTopic = iface.getEvent("ContributionDecided").topicHash;
  const storyVersionEvents = [];
  const contributionEvents = [];
  const decisionEvents = [];

  for (let from = fromBlock; from <= toBlock; from += chunkSize) {
    const to = Math.min(from + chunkSize - 1, toBlock);
    const [storyLogs, contributionLogs, decisionLogs] = await Promise.all([
      provider.getLogs({ address: contractAddress, fromBlock: from, toBlock: to, topics: [storyTopic, storyId] }),
      provider.getLogs({ address: contractAddress, fromBlock: from, toBlock: to, topics: [contributionTopic, null, storyId] }),
      provider.getLogs({ address: contractAddress, fromBlock: from, toBlock: to, topics: [decisionTopic, null, storyId] })
    ]);
    for (const log of storyLogs) storyVersionEvents.push({ args: iface.parseLog(log).args, transactionHash: log.transactionHash, blockNumber: log.blockNumber });
    for (const log of contributionLogs) contributionEvents.push({ args: iface.parseLog(log).args, transactionHash: log.transactionHash, blockNumber: log.blockNumber });
    for (const log of decisionLogs) decisionEvents.push({ args: iface.parseLog(log).args, transactionHash: log.transactionHash, blockNumber: log.blockNumber });
  }
  return { storyVersionEvents, contributionEvents, decisionEvents };
}
