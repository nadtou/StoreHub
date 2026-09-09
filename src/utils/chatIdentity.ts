import { Boutique, UserRole } from "../types";

export interface ChatUserIdentity {
  role: UserRole;
  email: string;
  uid?: string;
  boutiqueId?: string;
}

/**
 * Returns a stable identifier even for legacy/demo profiles created before a
 * Firebase uid was stored locally. A timestamp must never be used here because
 * it would create a different inbox on every visit.
 */
export function getStableChatUserId(user: ChatUserIdentity): string {
  if (user.uid?.trim()) return user.uid.trim();

  const normalizedEmail = user.email.trim().toLowerCase();
  return normalizedEmail ? `email:${normalizedEmail}` : "";
}

/** Resolve only the shop that is explicitly owned by the connected seller. */
export function getUserBoutique(
  user: ChatUserIdentity,
  boutiques: Boutique[],
): Boutique | undefined {
  const userId = getStableChatUserId(user);
  return boutiques.find((boutique) => boutique.id === user.boutiqueId && boutique.ownerId === userId)
    || boutiques.find((boutique) => boutique.ownerId === userId)
    || boutiques.find((boutique) => Boolean(user.uid) && boutique.ownerId === user.uid);
}
