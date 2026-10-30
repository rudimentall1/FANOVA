const encoder = new TextEncoder();

async function sha256(value) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable. Use a modern browser to create content integrity checksums.");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(value));
  return "0x" + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function canonicalContent(item) {
  return JSON.stringify({ title: item.title, body: item.body });
}

export async function captureStoryIntegrity(story) {
  return {
    algorithm: "SHA-256",
    sourceHash: await sha256(canonicalContent(story)),
    permissionHash: await sha256(story.permissions),
    capturedAt: new Date().toISOString()
  };
}

export async function captureContributionIntegrity(contribution) {
  return {
    algorithm: "SHA-256",
    contentHash: await sha256(canonicalContent(contribution)),
    capturedAt: new Date().toISOString()
  };
}

export async function verifyLocalContentCommitments(state) {
  const checks = [];
  const incompleteEvidence = [];
  const story = state?.story;
  const storyCommitment = story?.integrityCommitment;

  if (!storyCommitment) {
    incompleteEvidence.push("No creation-time source-story checksum is present.");
  } else {
    if (storyCommitment.algorithm !== "SHA-256") throw new Error("Unsupported source-story integrity checksum algorithm.");
    const sourceHash = await sha256(canonicalContent(story));
    const permissionHash = await sha256(story.permissions);
    if (sourceHash !== storyCommitment.sourceHash) throw new Error("Source story content does not match its creation-time local checksum.");
    if (permissionHash !== storyCommitment.permissionHash) throw new Error("Permission text does not match its creation-time local checksum.");
    checks.push("Source story and permission text match their creation-time local SHA-256 checksums.");
  }

  for (const contribution of state?.contributions || []) {
    const commitment = contribution.integrityCommitment;
    if (!commitment) {
      incompleteEvidence.push(`Contribution "${contribution.title || contribution.id}" has no creation-time content checksum.`);
      continue;
    }
    if (commitment.algorithm !== "SHA-256") throw new Error(`Unsupported integrity checksum algorithm for contribution ${contribution.id}.`);
    const contentHash = await sha256(canonicalContent(contribution));
    if (contentHash !== commitment.contentHash) {
      throw new Error(`Contribution content does not match its creation-time local checksum: ${contribution.title || contribution.id}.`);
    }
    checks.push(`Contribution "${contribution.title || contribution.id}" matches its creation-time local SHA-256 checksum.`);
  }

  if (checks.length > 0) {
    incompleteEvidence.push("Local checksums are stored in the same browser-local data and are not signed or externally anchored. They detect content edits when the original checksum is retained, but do not prove who created the content or prevent an attacker from replacing both content and checksum.");
  }
  return { checks, incompleteEvidence };
}
