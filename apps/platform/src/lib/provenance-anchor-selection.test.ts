import { describe, expect, it } from "vitest";
import { selectPublicAnchor, selectUniqueVerifiedAnchor } from "./provenance-anchor-selection";

type Attempt = { id: string; status: string; createdAt: Date };

const attempt = (id: string, status: string, day: number): Attempt => ({
  id,
  status,
  createdAt: new Date(`2026-11-${String(day).padStart(2, "0")}T12:00:00.000Z`)
});

describe("provenance anchor selection", () => {
  it("returns no public attempt when no anchors exist", () => {
    expect(selectPublicAnchor<Attempt>([])).toEqual({ anchor: null, ambiguous: false });
    expect(selectUniqueVerifiedAnchor<Attempt>([])).toBeNull();
  });

  it("selects the only verified anchor even when a newer failed retry exists", () => {
    const verified = attempt("verified", "mainnet", 10);
    const failedRetry = attempt("failed-retry", "failed", 11);

    expect(selectPublicAnchor([failedRetry, verified])).toEqual({
      anchor: verified,
      ambiguous: false
    });
    expect(selectUniqueVerifiedAnchor([failedRetry, verified])).toBe(verified);
  });

  it("fails closed when more than one verified anchor exists", () => {
    const first = attempt("verified-1", "mainnet", 10);
    const second = attempt("verified-2", "mainnet", 11);

    expect(selectPublicAnchor([first, second])).toEqual({
      anchor: null,
      ambiguous: true
    });
    expect(selectUniqueVerifiedAnchor([first, second])).toBeNull();
  });

  it("shows the newest non-verified attempt when no verified anchor exists", () => {
    const older = attempt("pending", "pending", 10);
    const newer = attempt("failed", "failed", 11);

    expect(selectPublicAnchor([older, newer])).toEqual({
      anchor: newer,
      ambiguous: false
    });
    expect(selectUniqueVerifiedAnchor([older, newer])).toBeNull();
  });
});
