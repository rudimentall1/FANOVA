import { createHash } from "node:crypto";
import type { WorkPermissions } from "@/db/schema/content";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashWorkSource(input: { title: string; synopsis: string; body: string }): string {
  return sha256(JSON.stringify({
    title: input.title,
    synopsis: input.synopsis,
    body: input.body
  }));
}

export function hashWorkPermissions(permissions: WorkPermissions): string {
  return sha256(JSON.stringify({
    fanArt: permissions.fanArt,
    translations: permissions.translations,
    adaptations: permissions.adaptations,
    commercialUse: permissions.commercialUse,
    attributionRequired: permissions.attributionRequired,
    additionalTerms: permissions.additionalTerms
  }));
}