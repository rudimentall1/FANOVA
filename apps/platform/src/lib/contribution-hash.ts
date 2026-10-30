import { createHash } from "node:crypto";

export function hashContribution(input: { type: string; title: string; content: string }): string {
  return createHash("sha256").update(JSON.stringify({
    type: input.type,
    title: input.title,
    content: input.content
  }), "utf8").digest("hex");
}