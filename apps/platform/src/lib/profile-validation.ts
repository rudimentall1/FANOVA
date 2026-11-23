import { z } from "zod";

export const updateProfileSchema = z.object({
  handle: z.string().trim().toLowerCase()
    .min(3).max(24)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/, "Use 3–24 lowercase letters, numbers, or internal hyphens."),
  displayName: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(500),
  isPublic: z.boolean()
}).strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
