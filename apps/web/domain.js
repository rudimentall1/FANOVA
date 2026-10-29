export function publishStory({ creatorId, creatorName, title, body, permissions }) {
  if (!creatorId || !creatorName?.trim()) throw new Error("Creator identity is required.");
  if (!title?.trim() || !body?.trim()) throw new Error("Story title and text are required.");
  if (!permissions?.trim()) throw new Error("Explicit permitted-use rules are required.");

  return {
    id: globalThis.crypto.randomUUID(),
    creatorId,
    creatorName: creatorName.trim(),
    title: title.trim(),
    body: body.trim(),
    permissions: permissions.trim(),
    version: 1,
    status: "published",
    createdAt: new Date().toISOString()
  };
}

export function submitContribution({ story, contributorId, contributorName, title, body, permissionAcknowledged }) {
  if (!story || story.status !== "published") throw new Error("A published source story is required.");
  if (!permissionAcknowledged) throw new Error("You must acknowledge the creator's permitted-use rules.");
  if (!contributorId || !contributorName?.trim()) throw new Error("Contributor identity is required.");
  if (!title?.trim() || !body?.trim()) throw new Error("Contribution title and text are required.");

  return {
    id: globalThis.crypto.randomUUID(),
    storyId: story.id,
    sourceVersion: story.version,
    contributorId,
    contributorName: contributorName.trim(),
    title: title.trim(),
    body: body.trim(),
    permissionAcknowledged: true,
    status: "pending",
    decision: null,
    createdAt: new Date().toISOString()
  };
}

export function reviewContribution({ story, contribution, actorId, outcome, reason = "" }) {
  if (!story || !contribution) throw new Error("Story and contribution are required.");
  if (contribution.storyId !== story.id || contribution.sourceVersion !== story.version) {
    throw new Error("Contribution does not reference the current source version.");
  }
  if (actorId !== story.creatorId) throw new Error("Rejected: only the story's authorized creator may review contributions.");
  if (!contribution.permissionAcknowledged) throw new Error("Rejected: permission acknowledgement is missing.");
  if (contribution.status !== "pending") throw new Error("This contribution has already been reviewed.");
  if (!["approved", "rejected"].includes(outcome)) throw new Error("Decision must be approved or rejected.");

  return {
    ...contribution,
    status: outcome,
    decision: {
      outcome,
      reviewerId: actorId,
      reason: reason.trim(),
      decidedAt: new Date().toISOString()
    }
  };
}
