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
  attempts: readonly T[]
): PublicAnchorSelection<T> {
  const verified = attempts.filter((attempt) => attempt.status === "mainnet");

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
