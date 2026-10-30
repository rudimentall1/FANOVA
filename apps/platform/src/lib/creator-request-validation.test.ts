import { describe, expect, it } from "vitest";
import { creatorDecisionSchema, creatorRequestSchema } from "./creator-request-validation";

describe("creator access request validation", () => {
  it("accepts a statement and optional HTTPS portfolio", () => {
    expect(creatorRequestSchema.safeParse({
      portfolioUrl: "https://portfolio.example",
      statement: "I create original short fiction and want to publish a story world for community contributions."
    }).success).toBe(true);
  });

  it("accepts an omitted portfolio URL", () => {
    expect(creatorRequestSchema.safeParse({
      statement: "I create original short fiction and want to publish a story world for community contributions."
    }).success).toBe(true);
  });

  it("rejects non-HTTP portfolio URLs", () => {
    expect(creatorRequestSchema.safeParse({
      portfolioUrl: "javascript:alert(1)",
      statement: "I create original short fiction and want to publish a story world for community contributions."
    }).success).toBe(false);
  });

  it("requires a meaningful creator statement", () => {
    expect(creatorRequestSchema.safeParse({
      portfolioUrl: "",
      statement: "I make things."
    }).success).toBe(false);
  });

  it("accepts only approve or reject decisions", () => {
    expect(creatorDecisionSchema.safeParse({ decision: "approve" }).success).toBe(true);
    expect(creatorDecisionSchema.safeParse({ decision: "reject" }).success).toBe(true);
    expect(creatorDecisionSchema.safeParse({ decision: "creator" }).success).toBe(false);
  });
});