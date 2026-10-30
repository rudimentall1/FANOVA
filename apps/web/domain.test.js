import test from "node:test";
import assert from "node:assert/strict";
import { publishStory, submitContribution, reviewContribution, contributionLifecycleStatus } from "./domain.js";

function setup() {
  const story = publishStory({
    creatorId: "creator-1",
    creatorName: "Demo Creator",
    title: "The Glass City",
    body: "An original pilot story.",
    permissions: "Fans may submit short text continuations. No commercial reuse without written permission."
  });
  const contribution = submitContribution({
    story,
    contributorId: "fan-1",
    contributorName: "Demo Fan",
    title: "A Door at Dawn",
    body: "The city woke to a new door.",
    permissionAcknowledged: true
  });
  return { story, contribution };
}

test("publishes a story with explicit permissions", () => {
  const { story } = setup();
  assert.equal(story.status, "published");
  assert.equal(story.version, 1);
  assert.equal(story.permissionVersion, 1);
  assert.match(story.permissions, /written permission/);
});

test("rejects a contribution without permission acknowledgement", () => {
  const { story } = setup();
  assert.throws(() => submitContribution({
    story,
    contributorId: "fan-1",
    contributorName: "Demo Fan",
    title: "Missing acknowledgement",
    body: "Contribution text",
    permissionAcknowledged: false
  }), /acknowledge/);
});

test("rejects review by someone other than the creator", () => {
  const { story, contribution } = setup();
  assert.throws(() => reviewContribution({
    story, contribution, actorId: "fan-1", outcome: "approved"
  }), /only the story's authorized creator/);
  assert.equal(contribution.status, "pending");
});

test("authorized creator can approve a linked contribution", () => {
  const { story, contribution } = setup();
  const reviewed = reviewContribution({
    story, contribution, actorId: "creator-1", outcome: "approved", reason: "Fits the source world."
  });
  assert.equal(reviewed.status, "approved");
  assert.equal(reviewed.decision.reviewerId, story.creatorId);
  assert.equal(reviewed.storyId, story.id);
  assert.equal(reviewed.sourceVersion, story.version);
  assert.equal(reviewed.permissionVersion, story.permissionVersion);
});

test("rejects a contribution tied to a stale permission version", () => {
  const { story, contribution } = setup();
  story.permissionVersion += 1;
  assert.throws(() => reviewContribution({
    story, contribution, actorId: "creator-1", outcome: "approved"
  }), /acknowledged permission version/);
});

test("rejects duplicate review", () => {
  const { story, contribution } = setup();
  const reviewed = reviewContribution({
    story, contribution, actorId: "creator-1", outcome: "rejected"
  });
  assert.throws(() => reviewContribution({
    story, contribution: reviewed, actorId: "creator-1", outcome: "approved"
  }), /already been reviewed/);
});

test("rejects truthy non-boolean permission acknowledgement", () => {
  const { story } = setup();
  assert.throws(() => submitContribution({
    story,
    contributorId: "fan-1",
    contributorName: "Demo Fan",
    title: "Invalid acknowledgement",
    body: "Contribution text",
    permissionAcknowledged: "yes"
  }), /acknowledge/);
});

test("rejects a contribution linked to a stale source version", () => {
  const { story, contribution } = setup();
  story.version += 1;
  assert.throws(() => reviewContribution({
    story, contribution, actorId: "creator-1", outcome: "approved"
  }), /current source version/);
});

test("rejects review when the stored acknowledgement is missing", () => {
  const { story, contribution } = setup();
  contribution.permissionAcknowledged = false;
  assert.throws(() => reviewContribution({
    story, contribution, actorId: "creator-1", outcome: "approved"
  }), /acknowledgement is missing/);
});

test("rejects unsupported review outcomes", () => {
  const { story, contribution } = setup();
  assert.throws(() => reviewContribution({
    story, contribution, actorId: "creator-1", outcome: "published"
  }), /Decision must be approved or rejected/);
});

test("rejects changed permission text when the version number was not bumped", () => {
  const { story, contribution } = setup();
  story.permissions = "Different terms that were never acknowledged.";
  assert.throws(() => reviewContribution({
    story, contribution, actorId: "creator-1", outcome: "approved"
  }), /acknowledged permission version and text/);
});


test("marks a pending contribution stale when the source version advances", () => {
  const { story, contribution } = setup();
  story.version += 1;
  assert.equal(contributionLifecycleStatus(story, contribution), "stale");
  assert.throws(() => reviewContribution({ story, contribution, actorId: "creator-1", outcome: "approved" }), /current source version/);
});

test("marks a pending contribution stale when permissions change", () => {
  const { story, contribution } = setup();
  story.permissionVersion += 1;
  story.permissions = "Updated permitted-use rules.";
  assert.equal(contributionLifecycleStatus(story, contribution), "stale");
});

test("keeps completed decisions as historical outcomes after a version change", () => {
  const { story, contribution } = setup();
  const reviewed = reviewContribution({ story, contribution, actorId: "creator-1", outcome: "approved" });
  story.version += 1;
  assert.equal(contributionLifecycleStatus(story, reviewed), "approved");
});
