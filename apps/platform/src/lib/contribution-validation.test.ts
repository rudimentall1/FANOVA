import { describe, expect, it } from "vitest";
import { createContributionSchema, contributionDecisionSchema } from "./contribution-validation";
import { hashContribution } from "./contribution-hash";

const valid = {
  type: "translation",
  title: "Chapter One Translation",
  content: "This is a substantial translation submission. " + "The contributor has translated the original passage while preserving its meaning and tone. ".repeat(2),
  acknowledgePermissions: true
};

describe("contribution submission validation", () => {
  it("accepts a complete submission with permission acknowledgement", () => {
    expect(createContributionSchema.safeParse(valid).success).toBe(true);
  });

  it("requires explicit permission acknowledgement", () => {
    expect(createContributionSchema.safeParse({ ...valid, acknowledgePermissions: false }).success).toBe(false);
  });

  it("rejects unknown contribution fields", () => {
    expect(createContributionSchema.safeParse({ ...valid, creatorRole: true }).success).toBe(false);
  });

  it("produces stable content hashes and changes them when content changes", () => {
    expect(hashContribution(valid)).toBe(hashContribution(valid));
    expect(hashContribution(valid)).not.toBe(hashContribution({ ...valid, content: valid.content + "Added." }));
  });

  it("accepts only approve/reject decisions", () => {
    expect(contributionDecisionSchema.safeParse({ decision: "approve" }).success).toBe(true);
    expect(contributionDecisionSchema.safeParse({ decision: "reject" }).success).toBe(true);
    expect(contributionDecisionSchema.safeParse({ decision: "pending" }).success).toBe(false);
  });
});