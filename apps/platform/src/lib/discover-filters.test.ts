import { describe, expect, it } from "vitest";
import { parseDiscoverFilters } from "./discover-filters";

describe("Discover filters", () => {
  it("trims and bounds the text query", () => {
    const params = new URLSearchParams({ q: `  ${"a".repeat(120)}  ` });
    expect(parseDiscoverFilters(params).q).toBe("a".repeat(100));
  });

  it("enables only explicitly requested permission filters", () => {
    const params = new URLSearchParams({
      fanArt: "allowed",
      translations: "allowed",
      adaptations: "denied",
      commercialUse: "true"
    });
    expect(parseDiscoverFilters(params)).toEqual({
      q: "",
      fanArt: true,
      translations: true,
      adaptations: false,
      commercialUse: false
    });
  });

  it("defaults all permission filters to off", () => {
    expect(parseDiscoverFilters(new URLSearchParams())).toEqual({
      q: "",
      fanArt: false,
      translations: false,
      adaptations: false,
      commercialUse: false
    });
  });
});
