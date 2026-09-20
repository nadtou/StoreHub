import { Boutique, UserProfile, UserRole } from '../types';

export interface ChatActorInput {
  senderRole: string;
  senderId: string;
  clientId: string;
  boutiqueId: string;
  boutiqueOwnerId: string;
  chatId: string;
}

/** Defense in depth in addition to Firestore rules. */
export function getChatAccessError(
  accountUid: string,
  profile: Pick<UserProfile, 'role'>,
  boutique: Pick<Boutique, 'id' | 'ownerId'>,
  input: ChatActorInput,
): string | null {
  if (input.boutiqueId !== boutique.id || input.boutiqueOwnerId !== boutique.ownerId) {
    return "La boutique de cette conversation est invalide.";
  }
  if (input.chatId !== `${input.clientId}_${input.boutiqueId}`) {
    return "L’identifiant de conversation est invalide.";
  }
  if (profile.role === UserRole.CLIENT) {
    if (input.senderRole !== 'client' || input.senderId !== accountUid || input.clientId !== accountUid) {
      return "Un client ne peut envoyer un message qu’en son propre nom.";
    }
    return null;
  }
  if (profile.role === UserRole.BOUTIQUE) {
    if (
      boutique.ownerId !== accountUid
      || input.senderRole !== 'boutique'
      || input.senderId !== accountUid
      || input.boutiqueOwnerId !== accountUid
    ) {
      return "Un gérant ne peut écrire que pour sa propre boutique.";
    }
    return null;
  }
  return "Ce rôle ne peut pas envoyer de message dans cette conversation.";
}
