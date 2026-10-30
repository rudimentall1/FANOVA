export type AppRole = "reader" | "creator" | "moderator" | "admin";

export interface AuthenticatedActor {
  userId: string;
  roles: readonly AppRole[];
}

export function canManageOwnWork(actor: AuthenticatedActor, ownerId: string): boolean {
  return actor.userId === ownerId && actor.roles.includes("creator");
}

export function canReadPrivateSubmission(actor: AuthenticatedActor, contributorId: string, workOwnerId: string): boolean {
  return actor.userId === contributorId || (actor.userId === workOwnerId && actor.roles.includes("creator"));
}

export function canReviewSubmission(actor: AuthenticatedActor, workOwnerId: string): boolean {
  return actor.userId === workOwnerId && actor.roles.includes("creator");
}