import { describe, expect, it } from "vitest";
import { createWorkSchema } from "./work-validation";
import { hashWorkPermissions, hashWorkSource } from "./work-hash";

const valid = {
  title: "The Glass Orchard",
  synopsis: "A cartographer finds a city that appears only on maps drawn by hand.",
  body: "The first time Mara saw the orchard, it was printed in the margin of a map. " + "A quiet story about memory, place, and the people who redraw the world. ".repeat(2),
  permissions: {
    fanArt: true,
    translations: true,
    adaptations: false,
    commercialUse: false,
    attributionRequired: true,
    additionalTerms: "Credit the original author."
  },
  publish: true
};

describe("work publication input", () => {
  it("accepts valid work content and explicit permission choices", () => {
    expect(createWorkSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects short synopsis and body", () => {
    expect(createWorkSchema.safeParse({ ...valid, synopsis: "Too short", body: "Short" }).success).toBe(false);
  });

  it("rejects unknown permission fields", () => {
    expect(createWorkSchema.safeParse({
      ...valid,
      permissions: { ...valid.permissions, unrestricted: true }
    }).success).toBe(false);
  });

  it("produces stable hashes for unchanged source and permission data", () => {
    expect(hashWorkSource(valid)).toBe(hashWorkSource(valid));
    expect(hashWorkPermissions(valid.permissions)).toBe(hashWorkPermissions(valid.permissions));
  });

  it("changes the source hash when story content changes", () => {
    expect(hashWorkSource(valid)).not.toBe(hashWorkSource({ ...valid, body: valid.body + "New paragraph." }));
  });

  it("changes the permission hash when permission rules change", () => {
    expect(hashWorkPermissions(valid.permissions)).not.toBe(hashWorkPermissions({
      ...valid.permissions,
      commercialUse: true
    }));
  });
});