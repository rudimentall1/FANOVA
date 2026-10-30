import { z } from "zod";

export const creatorRequestSchema = z.object({
  portfolioUrl: z.string().trim().max(500).refine(
    (value) => value.length === 0 || /^https?:\/\//i.test(value),
    "Portfolio URL must start with http:// or https://."
  ).default(""),
  statement: z.string().trim().min(50).max(2000)
}).strict();

export const creatorDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"])
}).strict();