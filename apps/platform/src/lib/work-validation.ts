import { z } from "zod";

export const workPermissionsSchema = z.object({
  fanArt: z.boolean(),
  translations: z.boolean(),
  adaptations: z.boolean(),
  commercialUse: z.boolean(),
  attributionRequired: z.boolean(),
  additionalTerms: z.string().trim().max(3000)
}).strict();

export const createWorkSchema = z.object({
  title: z.string().trim().min(3).max(120),
  synopsis: z.string().trim().min(20).max(500),
  body: z.string().trim().min(100).max(50_000),
  permissions: workPermissionsSchema,
  publish: z.boolean().default(false)
}).strict();

export type CreateWorkInput = z.infer<typeof createWorkSchema>;