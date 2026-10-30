import { describe, expect, it } from "vitest";
import { canManageOwnWork, canReadPrivateSubmission, canReviewSubmission, type AuthenticatedActor } from "./authz";

const creatorA: AuthenticatedActor = { userId: "creator-a", roles: ["reader", "creator"] };
const creatorB: AuthenticatedActor = { userId: "creator-b", roles: ["creator"] };
const contributor: AuthenticatedActor = { userId: "fan-a", roles: ["reader"] };

describe("server authorization policy", () => {
  it("allows a creator to manage only their own work", () => {
    expect(canManageOwnWork(creatorA, "creator-a")).toBe(true);
    expect(canManageOwnWork(creatorA, "creator-b")).toBe(false);
  });
  it("blocks contributor review attempts", () => {
    expect(canReviewSubmission(contributor, "creator-a")).toBe(false);
  });
  it("blocks another creator from reviewing a submission", () => {
    expect(canReviewSubmission(creatorB, "creator-a")).toBe(false);
  });
  it("allows only the contributor or owning creator to read a private submission", () => {
    expect(canReadPrivateSubmission(contributor, "fan-a", "creator-a")).toBe(true);
    expect(canReadPrivateSubmission(creatorA, "fan-a", "creator-a")).toBe(true);
    expect(canReadPrivateSubmission(creatorB, "fan-a", "creator-a")).toBe(false);
  });
  it("does not grant creator ownership to moderation roles", () => {
    const moderator: AuthenticatedActor = { userId: "mod-1", roles: ["moderator", "admin"] };
    expect(canManageOwnWork(moderator, "creator-a")).toBe(false);
    expect(canReviewSubmission(moderator, "creator-a")).toBe(false);
  });
});