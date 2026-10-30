export function inspectLocalBundle(bundle) {
  const fail = message => { throw new Error(message); };
  if (bundle?.format !== "fanova-evidence-bundle-v1") fail("Unsupported evidence bundle format.");
  if (Number(bundle?.network?.chainId) !== 1868) fail("Bundle network is not Soneium Mainnet (chain ID 1868).");
  if (String(bundle?.contract || "").toLowerCase() !== "0x3a302cbb8570a76e8e7e1dc15a763552a3c40880") {
    fail("Bundle contract address does not match the configured FANOVA contract.");
  }

  const state = bundle.localStoryAndContributions;
  const meta = bundle.onchainMetadata;
  if (!state?.story || !Array.isArray(state.contributions) || !meta?.stories || !meta?.contributions || !Array.isArray(meta.txs)) {
    fail("Bundle is missing story/contribution or onchain metadata.");
  }

  const story = state.story;
  if (!story.id || typeof story.title !== "string" || typeof story.body !== "string" ||
      typeof story.permissions !== "string" || !Number.isInteger(Number(story.version)) ||
      !Number.isInteger(Number(story.permissionVersion))) {
    fail("Local source story is incomplete or malformed.");
  }

  for (const contribution of state.contributions) {
    if (!contribution?.id || contribution.storyId !== story.id) {
      fail("A contribution is not linked to the exported source story.");
    }
    if (Number(contribution.sourceVersion) !== Number(story.version)) {
      fail(`Contribution ${contribution.id} references a different source version.`);
    }
    if (Number(contribution.permissionVersion) !== Number(story.permissionVersion) ||
        contribution.permissionSnapshot !== story.permissions) {
      fail(`Contribution ${contribution.id} does not match the acknowledged permission version and text.`);
    }
    if (contribution.permissionAcknowledged !== true) {
      fail(`Contribution ${contribution.id} has no permission acknowledgement.`);
    }
    if (!["pending", "approved", "rejected"].includes(contribution.status)) {
      fail(`Contribution ${contribution.id} has an unsupported local status.`);
    }
    if (contribution.decision) {
      const decision = contribution.decision;
      if (!["approved", "rejected"].includes(decision.outcome) ||
          decision.outcome !== contribution.status ||
          decision.reviewerId !== story.creatorId) {
        fail(`Local decision consistency check failed for contribution ${contribution.id}.`);
      }
    } else if (["approved", "rejected"].includes(contribution.status)) {
      fail(`Contribution ${contribution.id} has a final status but no decision record.`);
    }
  }

  const hasStoryMetadata = Object.keys(meta.stories).length > 0;
  const hasContributionMetadata = Object.keys(meta.contributions).length > 0;
  const hasTransactions = meta.txs.length > 0;
  if (!hasStoryMetadata && !hasContributionMetadata && !hasTransactions) {
    return {
      localOnly: true,
      checks: ["Local story/contribution structure, source-version linkage, permission snapshot, acknowledgement, and decision consistency checked."],
      incompleteEvidence: ["No onchain registration or decision evidence is present."]
    };
  }
  if (!hasStoryMetadata) fail("Onchain transaction or contribution evidence exists, but source story metadata is missing.");
  return { localOnly: false, checks: [], incompleteEvidence: [] };
}
