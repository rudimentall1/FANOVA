import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "./profile-validation";

const validProfile = {
  handle: "rinat-creates",
  displayName: "Rinat Creates",
  bio: "Stories about speculative worlds and collaborative creativity.",
  isPublic: true
};

describe("creator profile validation", () => {
  it("normalizes handle and trims display name and bio", () => {
    expect(updateProfileSchema.parse({
      ...validProfile,
      handle: "  Rinat-Creates ",
      displayName: " Rinat Creates ",
      bio: "  A short bio.  "
    })).toEqual({ ...validProfile, bio: "A short bio." });
  });

  it("rejects handles with spaces, underscores, or leading punctuation", () => {
    for (const handle of ["bad handle", "bad_handle", "-bad", "ab"]) {
      expect(updateProfileSchema.safeParse({ ...validProfile, handle }).success).toBe(false);
    }
  });

  it("rejects empty display names and bios longer than 500 characters", () => {
    expect(updateProfileSchema.safeParse({ ...validProfile, displayName: " " }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ ...validProfile, bio: "x".repeat(501) }).success).toBe(false);
  });

  it("requires an explicit visibility boolean and rejects unknown fields", () => {
    const { isPublic: _visibility, ...withoutVisibility } = validProfile;
    expect(updateProfileSchema.safeParse(withoutVisibility).success).toBe(false);
    expect(updateProfileSchema.safeParse({ ...validProfile, role: "admin" }).success).toBe(false);
  });
});
