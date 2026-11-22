export type ProvenanceAnchorAttempt = {
  status: string;
  createdAt: Date;
};

export type PublicAnchorSelection<T> = {
  anchor: T | null;
  ambiguous: boolean;
};

/**
 * Selects the one verified record if exactly one exists. A later failed or
 * pending retry must not hide an earlier verified anchor. Multiple verified
 * records are ambiguous and therefore fail closed.
 */
export function selectPublicAnchor<T extends ProvenanceAnchorAttempt>(
  attempts: readonly T[],
  verifiedCount?: number
): PublicAnchorSelection<T> {
  const verified = attempts.filter((attempt) => attempt.status === "mainnet");
  if (verifiedCount !== undefined && verifiedCount > 1) {
    return { anchor: null, ambiguous: true };
  }

  if (verified.length === 1) {
    return { anchor: verified[0], ambiguous: false };
  }
  if (verified.length > 1) {
    return { anchor: null, ambiguous: true };
  }

  const newest = attempts.reduce<T | null>((selected, attempt) => {
    if (!selected || attempt.createdAt.getTime() > selected.createdAt.getTime()) {
      return attempt;
    }
    return selected;
  }, null);

  return { anchor: newest, ambiguous: false };
}

/**
 * A verifier may rely on a source record only when there is exactly one
 * persisted Mainnet-verified candidate. Non-verified retries do not create
 * ambiguity, but duplicate verified anchors do.
 */
export function selectUniqueVerifiedAnchor<T extends { status: string }>(
  attempts: readonly T[]
): T | null {
  const verified = attempts.filter((attempt) => attempt.status === "mainnet");
  return verified.length === 1 ? verified[0] : null;
}

const REQUIRED_PUBLIC_HASH_KEYS: Record<string, readonly string[]> = {
  StoryVersionRegistered: ["sourceHash", "permissionHash"],
  ContributionRegistered: ["sourceHash", "permissionHash", "contributionHash"],
  ContributionDecided: ["sourceHash", "permissionHash", "contributionHash", "reasonCode"]
};

export function matchesPublicProofHashes(
  eventName: string,
  snapshot: {
    expectedHashes?: Record<string, string>;
    observedHashes?: Record<string, string>;
  } | null | undefined,
  authoritativeHashes: Record<string, string | null | undefined>
): boolean {
  const required = REQUIRED_PUBLIC_HASH_KEYS[eventName];
  if (!required || !snapshot?.expectedHashes || !snapshot.observedHashes) return false;

  const expectedKeys = Object.keys(snapshot.expectedHashes).sort();
  const observedKeys = Object.keys(snapshot.observedHashes).sort();
  const requiredKeys = [...required].sort();
  if (JSON.stringify(expectedKeys) !== JSON.stringify(requiredKeys) ||
      JSON.stringify(observedKeys) !== JSON.stringify(requiredKeys)) return false;

  return required.every((key) => {
    const authoritative = authoritativeHashes[key];
    const expected = snapshot.expectedHashes?.[key];
    const observed = snapshot.observedHashes?.[key];
    return typeof authoritative === "string" && authoritative.length > 0 &&
      typeof expected === "string" && expected.toLowerCase() === authoritative.toLowerCase() &&
      typeof observed === "string" && observed.toLowerCase() === authoritative.toLowerCase();
  });
}
