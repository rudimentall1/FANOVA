function key(value) {
  return String(value ?? "").toLowerCase();
}

function requireMatch(condition, message) {
  if (!condition) throw new Error(message);
}

export function compareEventCoverage({
  storyId,
  storyRecord,
  story,
  storyVersionEvents,
  contributionEvents,
  decisionEvents,
  bundle
}) {
  const state = bundle?.localStoryAndContributions;
  const metadata = bundle?.onchainMetadata;
  requireMatch(state?.story && metadata?.contributions, "Evidence bundle is missing local story or contribution metadata.");

  const incompleteEvidence = [];
  const checks = [];
  const matchingStoryEvents = storyVersionEvents.filter(event => key(event.args.storyId) === key(storyId));
  requireMatch(matchingStoryEvents.length === storyVersionEvents.length, "Story-version scan returned an event for a different story.");
  const snapshotEvent = matchingStoryEvents.find(event => Number(event.args.sourceVersion) === Number(story.version));
  requireMatch(snapshotEvent, "The exported source version was not found in the scanned Soneium event history.");
  requireMatch(key(snapshotEvent.transactionHash) === key(storyRecord.txHash), "Story registration transaction does not match the scanned event history.");
  requireMatch(new Set(matchingStoryEvents.map(event => String(event.args.sourceVersion))).size === matchingStoryEvents.length, "Duplicate StoryVersionRegistered events were found for this story.");
  const orderedVersions = matchingStoryEvents.map(event => Number(event.args.sourceVersion)).sort((left, right) => left - right);
  requireMatch(orderedVersions.every((version, index) => version === index + 1), "Scanned story event history contains a missing or non-sequential source version.");

  if (matchingStoryEvents.length > 1) {
    incompleteEvidence.push(
      `The chain contains ${matchingStoryEvents.length} story versions, but this bundle contains only version ${story.version}; historical story-version content is not fully represented.`
    );
  }

  const metadataRecords = Object.values(metadata.contributions)
    .filter(record => key(record.storyId) === key(storyId) && record.contributionId && record.txHash);
  const metadataById = new Map(metadataRecords.map(record => [key(record.contributionId), record]));
  const localById = new Map(state.contributions.map(contribution => [String(contribution.id), contribution]));
  const chainContributionIds = new Set();

  for (const event of contributionEvents) {
    requireMatch(key(event.args.storyId) === key(storyId), "Contribution scan returned an event for a different story.");
    const id = key(event.args.contributionId);
    requireMatch(!chainContributionIds.has(id), `Duplicate ContributionRegistered events were found for contribution ${id}.`);
    chainContributionIds.add(id);
    const record = metadataById.get(id);
    if (!record) {
      incompleteEvidence.push(`Onchain contribution ${id} is missing from this exported bundle.`);
      continue;
    }
    requireMatch(key(record.txHash) === key(event.transactionHash), `Contribution registration transaction mismatch for ${id}.`);
    if (!localById.has(record.localContributionId)) {
      incompleteEvidence.push(`Onchain contribution ${id} has no matching offchain contribution content in this bundle.`);
    }
  }

  for (const record of metadataRecords) {
    requireMatch(chainContributionIds.has(key(record.contributionId)), `Bundle references contribution ${record.contributionId}, but its registration event was not found in the scanned history.`);
  }

  const chainDecisionIds = new Set();
  for (const event of decisionEvents) {
    requireMatch(key(event.args.storyId) === key(storyId), "Decision scan returned an event for a different story.");
    const id = key(event.args.contributionId);
    requireMatch(!chainDecisionIds.has(id), `Multiple ContributionDecided events were found for contribution ${id}.`);
    chainDecisionIds.add(id);
    const record = metadataById.get(id);
    if (!record?.decisionTxHash) {
      incompleteEvidence.push(`Onchain decision for contribution ${id} is missing from this exported bundle.`);
      continue;
    }
    requireMatch(key(record.decisionTxHash) === key(event.transactionHash), `Decision transaction mismatch for contribution ${id}.`);
  }

  for (const record of metadataRecords) {
    if (record.decisionTxHash) {
      requireMatch(chainDecisionIds.has(key(record.contributionId)), `Bundle references a decision for contribution ${record.contributionId}, but no matching decision event was found in the scanned history.`);
    }
  }

  checks.push(
    `Event coverage reconciled: ${matchingStoryEvents.length} story versions, ${chainContributionIds.size} contributions, and ${chainDecisionIds.size} decisions.`
  );
  return { checks, incompleteEvidence };
}
