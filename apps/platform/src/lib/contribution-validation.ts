import { z } from "zod";

export const createContributionSchema = z.object({
  type: z.enum(["fan_art", "translation", "adaptation"]),
  commercialIntent: z.boolean().default(false),
  title: z.string().trim().min(3).max(120),
  content: z.string().trim().min(100).max(30_000),
  acknowledgePermissions: z.literal(true)
}).strict();

export const contributionDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  feedback: z.string().trim().max(2000).default(""),
  makePublic: z.boolean().default(false)
}).strict();